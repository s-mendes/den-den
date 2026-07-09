import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Planner } from './planner'
import { PLANNER_SYSTEM_PROMPT } from './prompts'
import { UserContext } from './interpreter'

describe('Planner', () => {
  const mockAIProvider = {
    chat: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockAIProvider.chat.mockResolvedValue({ text: 'Briefing sugerido' })
  })

  it('deve gerar o briefing do dia (/today) enviando os dados do Google Calendar no contexto', async () => {
    const planner = new Planner(mockAIProvider as any)
    const context: UserContext = {
      discordUserId: '123',
      profile: { name: 'Samuel' },
      calendarEvents: [
        {
          id: '1',
          title: 'Daily Macle',
          start: new Date('2026-07-09T09:00:00Z'),
          end: new Date('2026-07-09T09:30:00Z'),
          isAllDay: false,
        },
      ],
      freeBlocks: [
        {
          start: new Date('2026-07-09T19:00:00Z'),
          end: new Date('2026-07-09T21:00:00Z'),
          durationMinutes: 120,
        },
      ],
      dayAnalysis: {
        isHeavyWorkDay: false,
        hasWorkout: true,
        hasPersonalTime: false,
        totalDurationMinutes: 30,
      },
    }

    const result = await planner.today(context)

    expect(mockAIProvider.chat).toHaveBeenCalledTimes(1)
    const chatArgs = mockAIProvider.chat.mock.calls[0][0]
    
    // Valida que o system prompt é o PLANNER_SYSTEM_PROMPT
    expect(chatArgs[0]).toEqual({ role: 'system', content: PLANNER_SYSTEM_PROMPT })

    // Valida que as variáveis de calendário e análise foram formatadas no bloco de contexto
    const contextContent = chatArgs[1].content
    expect(contextContent).toContain('AGENDA DO DIA (Google Calendar):')
    expect(contextContent).toContain('Daily Macle')
    expect(contextContent).toContain('BLOCOS LIVRES OPERACIONAIS:')
    expect(contextContent).toContain('120 minutos livres')
    expect(contextContent).toContain('ANÁLISE DE CARGA DO DIA:')
    expect(contextContent).toContain('Teve atividade física/treino hoje? SIM')
    
    expect(result).toBe('Briefing sugerido')
  })

  it('deve gerar o resumo semanal (/plan) chamando a IA', async () => {
    const planner = new Planner(mockAIProvider as any)
    const context: UserContext = {
      discordUserId: '123',
      profile: { name: 'Samuel' },
    }

    const result = await planner.weekly(context)

    expect(mockAIProvider.chat).toHaveBeenCalledTimes(1)
    const chatArgs = mockAIProvider.chat.mock.calls[0][0]
    expect(chatArgs[0]).toEqual({ role: 'system', content: PLANNER_SYSTEM_PROMPT })
    expect(chatArgs[2].content).toContain('resumo da semana passada')
    expect(result).toBe('Briefing sugerido')
  })

  it('deve gerar o check-in noturno parabenizando em caso de commits', async () => {
    const planner = new Planner(mockAIProvider as any)
    const context: UserContext = {
      discordUserId: '123',
    }

    await planner.nightlyCheck(context, 3)

    const chatArgs = mockAIProvider.chat.mock.calls[0][0]
    expect(chatArgs[2].content).toContain('Hoje fiz 3 commits nos side projects')
  })

  it('deve motivar de forma construtiva em caso de 0 commits no check-in noturno', async () => {
    const planner = new Planner(mockAIProvider as any)
    const context: UserContext = {
      discordUserId: '123',
    }

    await planner.nightlyCheck(context, 0)

    const chatArgs = mockAIProvider.chat.mock.calls[0][0]
    expect(chatArgs[2].content).toContain('Hoje não fiz nenhum commit')
  })
})
