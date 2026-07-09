import { google, calendar_v3 } from 'googleapis'
import { CalendarClient, CalendarEvent, TimeBlock } from './client'

export class GoogleCalendarClient implements CalendarClient {
  private oauth2Client: InstanceType<typeof google.auth.OAuth2> | null = null
  private calendarId: string
  private isConfigured: boolean = false

  constructor() {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
    this.calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'

    if (clientId && clientSecret && refreshToken) {
      try {
        this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
        this.oauth2Client.setCredentials({ refresh_token: refreshToken })
        this.isConfigured = true
      } catch (err) {
        console.error('⚠️ Falha ao inicializar cliente OAuth2 do Google Calendar:', err)
      }
    } else {
      console.warn('⚠️ Google Calendar não configurado no .env. Executando em modo degradado.')
    }
  }

  async getEventsForRange(start: Date, end: Date): Promise<CalendarEvent[]> {
    if (!this.isConfigured || !this.oauth2Client) {
      return []
    }

    try {
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })
      const response = await calendar.events.list({
        calendarId: this.calendarId,
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      })

      const items = response.data.items || []
      return items.map((item: calendar_v3.Schema$Event) => {
        const startDateTime = item.start?.dateTime || item.start?.date
        const endDateTime = item.end?.dateTime || item.end?.date
        
        if (!startDateTime || !endDateTime) {
          throw new Error('Evento de calendário inválido sem data de início/fim.')
        }

        return {
          id: item.id || '',
          title: item.summary || 'Sem título',
          start: new Date(startDateTime),
          end: new Date(endDateTime),
          isAllDay: !item.start?.dateTime,
          location: item.location || null,
          description: item.description || null,
        }
      })
    } catch (err) {
      console.error('❌ Erro ao buscar eventos do Google Calendar:', err)
      return []
    }
  }

  async getFreeBlocks(date: Date, minMinutes: number = 30): Promise<TimeBlock[]> {
    if (!this.isConfigured) {
      return []
    }

    // Definindo dia operacional padrão: das 08h00 às 22h30 na data especificada (usando timezone local/UTC da data informada)
    const startOfDay = new Date(date)
    startOfDay.setHours(8, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(22, 30, 0, 0)

    // Se a data de fim for menor que a de início (caso a data passada já passou do horário), retorna vazio
    if (endOfDay.getTime() <= startOfDay.getTime()) {
      return []
    }

    // Busca eventos que colidem com esse período operacional
    const events = await this.getEventsForRange(startOfDay, endOfDay)
    
    // Filtra eventos de dia inteiro e eventos cancelados, restando apenas os blocos que de fato ocupam tempo
    const busyEvents = events
      .filter((e) => !e.isAllDay)
      .map((e) => ({
        start: e.start.getTime(),
        end: e.end.getTime(),
      }))
      // Garante que o intervalo operacional limite os tempos de eventos que começam antes ou terminam depois
      .map((e) => ({
        start: Math.max(startOfDay.getTime(), e.start),
        end: Math.min(endOfDay.getTime(), e.end),
      }))
      .filter((e) => e.start < e.end)
      // Ordena por horário de início
      .sort((a, b) => a.start - b.start)

    // Mescla eventos que se sobrepõem
    const mergedBusy: Array<{ start: number; end: number }> = []
    for (const current of busyEvents) {
      if (mergedBusy.length === 0) {
        mergedBusy.push(current)
        continue
      }
      const last = mergedBusy[mergedBusy.length - 1]
      if (current.start <= last.end) {
        last.end = Math.max(last.end, current.end)
      } else {
        mergedBusy.push(current)
      }
    }

    // Encontra os blocos livres
    const freeBlocks: TimeBlock[] = []
    let currentStart = startOfDay.getTime()

    for (const busy of mergedBusy) {
      if (busy.start - currentStart >= minMinutes * 60 * 1000) {
        freeBlocks.push({
          start: new Date(currentStart),
          end: new Date(busy.start),
          durationMinutes: Math.round((busy.start - currentStart) / (60 * 1000)),
        })
      }
      currentStart = Math.max(currentStart, busy.end)
    }

    // Espaço livre no fim do dia útil operacional
    const endMs = endOfDay.getTime()
    if (endMs - currentStart >= minMinutes * 60 * 1000) {
      freeBlocks.push({
        start: new Date(currentStart),
        end: new Date(endMs),
        durationMinutes: Math.round((endMs - currentStart) / (60 * 1000)),
      })
    }

    return freeBlocks
  }
}

// Instancia um singleton padrão
export const googleCalendarClient = new GoogleCalendarClient()
