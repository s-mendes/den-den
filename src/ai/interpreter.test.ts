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

  it('cai em chitchat seguro quando LLM devolve JSON fora do schema', async () => {
    const raw = JSON.stringify({ type: 'create_event', data: { title: 'sem data' }, response: 'x' })
    const interpreter = new Interpreter(makeProvider([raw]))
    const intent = await interpreter.interpret('algo', baseContext)

    expect(intent.type).toBe('chitchat')
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
})
