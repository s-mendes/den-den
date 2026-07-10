import { describe, it, expect, vi } from 'vitest'
import { Interpreter, UserContext } from './interpreter'
import { AIProvider, AIResponse } from './provider'

function makeProvider(textResponses: string[]): AIProvider {
  let idx = 0
  return {
    chat: vi.fn(async (): Promise<AIResponse> => {
      const text = textResponses[idx++] ?? textResponses[textResponses.length - 1]
      return { text, model: 'test', provider: 'test' }
    }),
  }
}

const baseContext: UserContext = { discordUserId: 'u1' }

describe('Interpreter.interpret', () => {
  it('retorna intent tipado quando LLM devolve JSON válido', async () => {
    const raw = JSON.stringify({
      type: 'create_event',
      data: {
        title: 'Reunião',
        datetime: '2026-04-17T10:00:00Z',
      },
      response: 'Anotado!',
    })
    const interpreter = new Interpreter(makeProvider([raw]))
    const intent = await interpreter.interpret('amanhã 10h reunião', baseContext)

    expect(intent.type).toBe('create_event')
    expect(intent.response).toBe('Anotado!')
    if (intent.type === 'create_event') {
      expect(intent.data.title).toBe('Reunião')
    }
  })

  it('cai em chitchat seguro quando LLM devolve texto não-JSON', async () => {
    const interpreter = new Interpreter(makeProvider(['olá sou um modelo sem jsonMode']))
    const intent = await interpreter.interpret('oi', baseContext)

    expect(intent.type).toBe('chitchat')
    expect(intent.response).toMatch(/não consegui entender/i)
  })

  it('cai em chitchat seguro mas recupera a resposta amigável do JSON quando LLM devolve JSON fora do schema', async () => {
    const raw = JSON.stringify({ type: 'create_event', data: { title: 'sem data' }, response: 'Desculpe, faltou a data!' })
    const interpreter = new Interpreter(makeProvider([raw]))
    const intent = await interpreter.interpret('algo', baseContext)

    expect(intent.type).toBe('chitchat')
    expect(intent.response).toBe('Desculpe, faltou a data!')
  })

  it('cai em chitchat seguro com mensagem de erro padrão se o JSON fora do schema não tiver o campo response', async () => {
    const raw = JSON.stringify({ type: 'create_event', data: { title: 'sem data' } })
    const interpreter = new Interpreter(makeProvider([raw]))
    const intent = await interpreter.interpret('algo', baseContext)

    expect(intent.type).toBe('chitchat')
    expect(intent.response).toMatch(/não consegui entender/i)
  })

  it('chama o provider com jsonMode ativado', async () => {
    const provider = makeProvider([
      JSON.stringify({ type: 'chitchat', data: {}, response: 'oi' }),
    ])
    const interpreter = new Interpreter(provider)
    await interpreter.interpret('oi', baseContext)

    expect(provider.chat).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ jsonMode: true })
    )
  })

  it('injeta agenda do Google Calendar, blocos livres e análise de carga no contexto enviado à IA', async () => {
    const provider = makeProvider([
      JSON.stringify({ type: 'chitchat', data: {}, response: 'oi' }),
    ])
    const interpreter = new Interpreter(provider)
    const context: UserContext = {
      discordUserId: 'u1',
      calendarEvents: [
        {
          id: '1',
          // 10:00Z → 07:00 em America/Sao_Paulo (fuso padrão)
          title: 'Acordar, café, banho',
          start: new Date('2026-07-09T10:00:00Z'),
          end: new Date('2026-07-09T11:00:00Z'),
          isAllDay: false,
        },
        {
          id: '2',
          title: 'Feriado',
          start: new Date('2026-07-09T03:00:00Z'),
          end: new Date('2026-07-10T03:00:00Z'),
          isAllDay: true,
        },
      ],
      freeBlocks: [
        {
          start: new Date('2026-07-09T11:00:00Z'),
          end: new Date('2026-07-09T15:00:00Z'),
          durationMinutes: 240,
        },
      ],
      dayAnalysis: {
        isHeavyWorkDay: true,
        hasWorkout: false,
        hasPersonalTime: true,
        totalDurationMinutes: 60,
      },
    }

    await interpreter.interpret('o que tem na agenda hoje?', context)

    const messages = vi.mocked(provider.chat).mock.calls[0][0]
    const contextBlock = messages[1].content

    expect(contextBlock).toContain('-- AGENDA DE HOJE (Google Calendar) --')
    expect(contextBlock).toContain('[07:00 - 08:00] - Acordar, café, banho')
    expect(contextBlock).toContain('[Dia Inteiro] - Feriado')
    expect(contextBlock).toContain('-- BLOCOS LIVRES OPERACIONAIS DE HOJE --')
    expect(contextBlock).toContain('08:00 às 12:00 (240 minutos livres)')
    expect(contextBlock).toContain('-- ANÁLISE DE CARGA DE HOJE --')
    expect(contextBlock).toContain('Expediente de trabalho pesado (>8h)? SIM')
    expect(contextBlock).toContain('Praticou atividade física/treino hoje? NÃO')
  })

  it('não injeta blocos de agenda quando o contexto não tem dados de calendário', async () => {
    const provider = makeProvider([
      JSON.stringify({ type: 'chitchat', data: {}, response: 'oi' }),
    ])
    const interpreter = new Interpreter(provider)

    await interpreter.interpret('oi', baseContext)

    const messages = vi.mocked(provider.chat).mock.calls[0][0]
    const contextBlock = messages[1].content

    expect(contextBlock).not.toContain('AGENDA DE HOJE')
    expect(contextBlock).not.toContain('BLOCOS LIVRES')
  })

  it('avisa que o calendar está indisponível no contexto quando calendarStatus é "error"', async () => {
    const provider = makeProvider([
      JSON.stringify({ type: 'chitchat', data: {}, response: 'oi' }),
    ])
    const interpreter = new Interpreter(provider)
    const context: UserContext = {
      discordUserId: 'u1',
      calendarStatus: 'error',
      calendarEvents: [],
    }

    await interpreter.interpret('o que tem na agenda hoje?', context)

    const messages = vi.mocked(provider.chat).mock.calls[0][0]
    const contextBlock = messages[1].content

    expect(contextBlock).toContain('Google Calendar indisponível')
    expect(contextBlock).toContain('DESCONHECIDA')
  })

  it('interpreta relatos de check-in noturno como nightly_checkin intent', async () => {
    const raw = JSON.stringify({
      type: 'nightly_checkin',
      data: {
        activities: [
          { areaSlug: 'business', description: 'Programar o Zestify', durationMinutes: 90 },
          { areaSlug: 'health', description: 'Treinar perna', durationMinutes: 60 },
        ],
        overallMood: 'productive',
      },
      response: 'Massa! Meta registrada.',
    })

    const interpreter = new Interpreter(makeProvider([raw]))
    const intent = await interpreter.interpret('Hoje fiz 1h30 no Zestify e treinei 1h', baseContext)

    expect(intent.type).toBe('nightly_checkin')
    expect(intent.response).toBe('Massa! Meta registrada.')
    if (intent.type === 'nightly_checkin') {
      expect(intent.data.activities).toHaveLength(2)
      expect(intent.data.activities[0].areaSlug).toBe('business')
      expect(intent.data.activities[1].description).toBe('Treinar perna')
      expect(intent.data.overallMood).toBe('productive')
    }
  })
})
