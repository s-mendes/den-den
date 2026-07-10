import 'dotenv/config'
import { googleCalendarClient } from './google-calendar'

async function testConnection() {
  console.log('🧪 Iniciando teste de conexão com o Google Calendar...')
  
  // Imprime as variáveis carregadas para conferência de preenchimento (escondendo valores sensíveis)
  console.log('\nConfigurações de Ambiente encontradas:')
  console.log(`- GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ Configurado' : '❌ Vazio'}`)
  console.log(`- GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '✅ Configurado' : '❌ Vazio'}`)
  console.log(`- GOOGLE_REFRESH_TOKEN: ${process.env.GOOGLE_REFRESH_TOKEN ? '✅ Configurado' : '❌ Vazio'}`)
  console.log(`- GOOGLE_CALENDAR_ID: ${process.env.GOOGLE_CALENDAR_ID || 'primary (default)'}`)

  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)

  console.log(`\n📅 Buscando eventos de hoje: ${startOfDay.toLocaleDateString('pt-BR')}`)

  try {
    const result = await googleCalendarClient.getEventsForRange(startOfDay, endOfDay)

    if (result.status === 'not_configured') {
      console.log('\n❌ Erro: O cliente não pôde ser configurado. Verifique se todas as chaves estão no arquivo .env.')
      return
    }

    if (result.status === 'error') {
      console.log(`\n❌ Erro ao buscar eventos do Google Calendar: ${result.message}`)
      return
    }

    const events = result.events
    console.log(`\n✅ Sucesso! Autenticado com o Google Calendar.`)
    console.log(`Encontrados ${events.length} evento(s) na agenda de hoje:\n`)

    if (events.length === 0) {
      console.log('ℹ️ Nenhum evento agendado para hoje.')
    } else {
      events.forEach((event, index) => {
        const startStr = event.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        const endStr = event.end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        const allDayStr = event.isAllDay ? '[Dia Inteiro]' : `[${startStr} - ${endStr}]`
        console.log(`${index + 1}. ${allDayStr} - ${event.title} (Local: ${event.location || 'N/A'})`)
      })
    }

    console.log('\n⚡ Calculando blocos livres operacionais de hoje (mínimo 30min):')
    const freeBlocks = await googleCalendarClient.getFreeBlocks(now, 30)

    if (freeBlocks.length === 0) {
      console.log('ℹ️ Nenhum bloco livre de no mínimo 30 minutos encontrado no horário operacional (08:00 - 22:30).')
    } else {
      freeBlocks.forEach((block, index) => {
        const startStr = block.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        const endStr = block.end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        console.log(`- Bloco ${index + 1}: ${startStr} às ${endStr} (${block.durationMinutes} minutos livres)`)
      })
    }

  } catch (error) {
    console.error('❌ Ocorreu um erro ao testar a conexão com a API do Google Calendar:')
    console.error(error)
  }
}

testConnection()
