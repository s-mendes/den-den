import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Planner } from './planner'
import { PLANNER_SYSTEM_PROMPT, QUERY_ANALYST_PROMPT, ACTION_REFLECTION_PROMPT } from './prompts'
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
    // 09:00Z → 06:00 em America/Sao_Paulo (fuso padrão do prompt)
    expect(contextContent).toContain('[06:00 - 06:30] - Daily Macle')
    expect(contextContent).toContain('BLOCOS LIVRES OPERACIONAIS:')
    expect(contextContent).toContain('120 minutos livres')
    expect(contextContent).toContain('ANÁLISE DE CARGA DO DIA:')
    expect(contextContent).toContain('Teve atividade física/treino hoje? SIM')
    
    expect(result).toBe('Briefing sugerido')
  })

  it('avisa que o calendar está indisponível quando calendarStatus é "error" — sem fingir dia livre', async () => {
    const planner = new Planner(mockAIProvider as any)
    const context: UserContext = {
      discordUserId: '123',
      calendarStatus: 'error',
      calendarEvents: [],
    }

    await planner.today(context)

    const contextContent = mockAIProvider.chat.mock.calls[0][0][1].content
    expect(contextContent).toContain('Google Calendar indisponível')
    expect(contextContent).toContain('DESCONHECIDA')
    expect(contextContent).not.toContain('Sem eventos agendados hoje')
  })

  it('avisa que o calendar não está configurado quando calendarStatus é "not_configured"', async () => {
    const planner = new Planner(mockAIProvider as any)
    const context: UserContext = {
      discordUserId: '123',
      calendarStatus: 'not_configured',
      calendarEvents: [],
    }

    await planner.today(context)

    const contextContent = mockAIProvider.chat.mock.calls[0][0][1].content
    expect(contextContent).toContain('não configurado')
    expect(contextContent).not.toContain('Sem eventos agendados hoje')
  })

  it('mantém "Sem eventos agendados hoje" quando o calendar respondeu ok com agenda vazia', async () => {
    const planner = new Planner(mockAIProvider as any)
    const context: UserContext = {
      discordUserId: '123',
      calendarStatus: 'ok',
      calendarEvents: [],
    }

    await planner.today(context)

    const contextContent = mockAIProvider.chat.mock.calls[0][0][1].content
    expect(contextContent).toContain('Sem eventos agendados hoje')
  })

  it('inclui as tarefas pendentes de hoje no contexto do briefing', async () => {
    const planner = new Planner(mockAIProvider as any)
    const context: UserContext = {
      discordUserId: '123',
      todayTasks: [
        { title: 'Ajustar cupom do checkout', status: 'pending', areaSlug: 'work' },
        { title: 'Ligar pro dentista', status: 'done' },
      ],
    }

    await planner.today(context)

    const contextContent = mockAIProvider.chat.mock.calls[0][0][1].content
    expect(contextContent).toContain('TAREFAS DE HOJE')
    expect(contextContent).toContain('[ ] Ajustar cupom do checkout')
    expect(contextContent).toContain('[x] Ligar pro dentista')
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
    expect(chatArgs[2].content).toContain('balanço semanal')
    expect(result).toBe('Briefing sugerido')
  })

  it('inclui a descrição dos eventos do calendar no bloco de contexto', async () => {
    const planner = new Planner(mockAIProvider as any)
    const context: UserContext = {
      discordUserId: '123',
      calendarEvents: [
        {
          id: '1',
          title: 'Zestify pesado',
          start: new Date('2026-07-13T22:30:00Z'),
          end: new Date('2026-07-14T00:30:00Z'),
          isAllDay: false,
          description: 'Das 19:30 às 21:30, foco em código ou feature importante. Exemplo: relatórios, checkout.',
        },
      ],
    }

    await planner.today(context)

    const contextContent = mockAIProvider.chat.mock.calls[0][0][1].content
    expect(contextContent).toContain('Zestify pesado')
    expect(contextContent).toContain('foco em código ou feature importante')
  })

  describe('analyzeQuery', () => {
    it('envia o QUERY_ANALYST_PROMPT com contexto, histórico, pergunta e dados', async () => {
      const planner = new Planner(mockAIProvider as any)
      const context: UserContext = { discordUserId: '123' }
      const history = [
        { role: 'user' as const, content: 'quais minhas tarefas?' },
        { role: 'assistant' as const, content: 'aqui estão...' },
      ]

      const result = await planner.analyzeQuery('e as da macle?', '• Corrigir bug (💼 Trabalho)', context, history)

      const messages = mockAIProvider.chat.mock.calls[0][0]
      expect(messages[0]).toEqual({ role: 'system', content: QUERY_ANALYST_PROMPT })
      expect(messages[2]).toEqual({ role: 'user', content: 'quais minhas tarefas?' })
      expect(messages[3]).toEqual({ role: 'assistant', content: 'aqui estão...' })
      const lastMessage = messages[messages.length - 1]
      expect(lastMessage.role).toBe('user')
      expect(lastMessage.content).toContain('e as da macle?')
      expect(lastMessage.content).toContain('• Corrigir bug (💼 Trabalho)')
      expect(result).toBe('Briefing sugerido')
    })
  })

  describe('reflectOnAction', () => {
    it('envia o ACTION_REFLECTION_PROMPT com fato e estado pós-ação', async () => {
      const planner = new Planner(mockAIProvider as any)
      const context: UserContext = { discordUserId: '123' }

      const result = await planner.reflectOnAction(
        'já gravei o gameplay',
        '⚓ Tarefa concluída',
        '✅ Restantes: • Corrigir bug',
        context,
        []
      )

      const messages = mockAIProvider.chat.mock.calls[0][0]
      expect(messages[0]).toEqual({ role: 'system', content: ACTION_REFLECTION_PROMPT })
      const lastMessage = messages[messages.length - 1]
      expect(lastMessage.content).toContain('já gravei o gameplay')
      expect(lastMessage.content).toContain('⚓ Tarefa concluída')
      expect(lastMessage.content).toContain('• Corrigir bug')
      expect(result).toBe('Briefing sugerido')
    })
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
