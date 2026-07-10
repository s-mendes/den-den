import { google, calendar_v3 } from 'googleapis'
import { CalendarClient, CalendarEvent, CalendarFetchResult, TimeBlock } from './client'
import { computeFreeBlocks } from './parser'

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

  async getEventsForRange(start: Date, end: Date): Promise<CalendarFetchResult> {
    if (!this.isConfigured || !this.oauth2Client) {
      return { status: 'not_configured' }
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
      const events = items.map((item: calendar_v3.Schema$Event) => {
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
      return { status: 'ok', events }
    } catch (err) {
      console.error('❌ Erro ao buscar eventos do Google Calendar:', err)
      return { status: 'error', message: err instanceof Error ? err.message : String(err) }
    }
  }

  async getFreeBlocks(
    date: Date,
    minMinutes: number = 30,
    prefetchedEvents?: CalendarEvent[]
  ): Promise<TimeBlock[]> {
    if (!this.isConfigured) {
      return []
    }

    // Dia operacional padrão: das 08h00 às 22h30 na data especificada
    const startOfDay = new Date(date)
    startOfDay.setHours(8, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(22, 30, 0, 0)

    // Reaproveita eventos já buscados (evita segunda chamada à API por mensagem).
    // Se a busca falhar, não finge dia inteiro livre: sem eventos confiáveis, sem blocos.
    let events = prefetchedEvents
    if (!events) {
      const result = await this.getEventsForRange(startOfDay, endOfDay)
      if (result.status !== 'ok') return []
      events = result.events
    }

    return computeFreeBlocks(events, startOfDay, endOfDay, minMinutes)
  }
}

// Instancia um singleton padrão
export const googleCalendarClient = new GoogleCalendarClient()
