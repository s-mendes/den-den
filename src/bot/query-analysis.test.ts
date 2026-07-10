import { describe, it, expect, vi, beforeEach } from 'vitest'
import { enrichQueryReply, enrichActionReply } from './query-analysis'
import { Planner } from '../ai/planner'
import { UserContext } from '../ai/interpreter'

describe('enrichQueryReply', () => {
  const planner = { analyzeQuery: vi.fn(), reflectOnAction: vi.fn() } as unknown as Planner
  const ctx = { discordUserId: 'u1' } as UserContext

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('compõe análise do LLM + bloco de dados determinístico', async () => {
    vi.mocked(planner.analyzeQuery).mockResolvedValue('Agora você está no bloco da Macle — foque no bug.')

    const reply = await enrichQueryReply(planner, 'quais tarefas?', '• Corrigir bug (💼 Trabalho)', ctx, [])

    expect(reply).toBe('Agora você está no bloco da Macle — foque no bug.\n\n• Corrigir bug (💼 Trabalho)')
  })

  it('repassa pergunta, contexto e histórico ao planner', async () => {
    vi.mocked(planner.analyzeQuery).mockResolvedValue('ok')
    const history = [{ role: 'user' as const, content: 'oi' }]

    await enrichQueryReply(planner, 'e as da macle?', 'DADOS', ctx, history)

    expect(planner.analyzeQuery).toHaveBeenCalledWith('e as da macle?', 'DADOS', ctx, history)
  })

  it('fallback: devolve só os dados quando a IA falha — nunca quebra a resposta', async () => {
    vi.mocked(planner.analyzeQuery).mockRejectedValue(new Error('provider fora'))

    const reply = await enrichQueryReply(planner, 'quais tarefas?', '• Corrigir bug', ctx, [])

    expect(reply).toBe('• Corrigir bug')
  })

  it('fallback também quando a análise vem vazia', async () => {
    vi.mocked(planner.analyzeQuery).mockResolvedValue('   ')

    const reply = await enrichQueryReply(planner, 'quais tarefas?', '• Corrigir bug', ctx, [])

    expect(reply).toBe('• Corrigir bug')
  })
})

describe('enrichActionReply', () => {
  const planner = { analyzeQuery: vi.fn(), reflectOnAction: vi.fn() } as unknown as Planner
  const ctx = { discordUserId: 'u1' } as UserContext

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('compõe linha de fato determinística + reflexão do LLM', async () => {
    vi.mocked(planner.reflectOnAction).mockResolvedValue('Resta 1 tarefa hoje — encaixa no bloco das 19h30.')

    const reply = await enrichActionReply(
      planner,
      'já gravei o gameplay',
      '⚓ Tarefa *Gravar gameplay* concluída, capitão!',
      '✅ Tarefas pendentes\n• Corrigir bug (💼 Trabalho)',
      ctx,
      []
    )

    expect(reply).toBe(
      '⚓ Tarefa *Gravar gameplay* concluída, capitão!\n\nResta 1 tarefa hoje — encaixa no bloco das 19h30.'
    )
  })

  it('repassa mensagem, fato, estado pós-ação e histórico ao planner', async () => {
    vi.mocked(planner.reflectOnAction).mockResolvedValue('ok')
    const history = [{ role: 'user' as const, content: 'oi' }]

    await enrichActionReply(planner, 'já gravei', 'FATO', 'ESTADO', ctx, history)

    expect(planner.reflectOnAction).toHaveBeenCalledWith('já gravei', 'FATO', 'ESTADO', ctx, history)
  })

  it('fallback: fica só a linha de fato quando a IA falha', async () => {
    vi.mocked(planner.reflectOnAction).mockRejectedValue(new Error('provider fora'))

    const reply = await enrichActionReply(planner, 'já gravei', 'FATO', 'ESTADO', ctx, [])

    expect(reply).toBe('FATO')
  })
})
