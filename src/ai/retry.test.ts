import { describe, it, expect, vi } from 'vitest'
import { withRetry } from './retry'
import { AIProvider, AIResponse } from './provider'

function makeProvider(behaviors: Array<AIResponse | Error>): {
  provider: AIProvider
  chat: ReturnType<typeof vi.fn>
} {
  let idx = 0
  const chat = vi.fn(async (): Promise<AIResponse> => {
    const next = behaviors[idx++]
    if (next instanceof Error) throw next
    if (!next) throw new Error('test: comportamento esgotado')
    return next
  })
  return { provider: { chat }, chat }
}

function httpError(status: number): Error {
  return Object.assign(new Error(`HTTP ${status}`), { status })
}

const ok: AIResponse = { text: 'ok', model: 'm', provider: 'p' }
const fastConfig = { baseDelayMs: 0, jitterFactor: 0 }

describe('withRetry', () => {
  it('retorna resposta direto quando a primeira chamada dá certo', async () => {
    const { provider, chat } = makeProvider([ok])
    const wrapped = withRetry(provider, fastConfig)
    const result = await wrapped.chat([{ role: 'user', content: 'oi' }])
    expect(result).toEqual(ok)
    expect(chat).toHaveBeenCalledTimes(1)
  })

  it('tenta de novo em 503 e retorna sucesso na segunda tentativa', async () => {
    const { provider, chat } = makeProvider([httpError(503), ok])
    const wrapped = withRetry(provider, fastConfig)
    const result = await wrapped.chat([{ role: 'user', content: 'oi' }])
    expect(result).toEqual(ok)
    expect(chat).toHaveBeenCalledTimes(2)
  })

  it('tenta de novo em 429 (rate limit)', async () => {
    const { provider, chat } = makeProvider([httpError(429), ok])
    const wrapped = withRetry(provider, fastConfig)
    await wrapped.chat([{ role: 'user', content: 'oi' }])
    expect(chat).toHaveBeenCalledTimes(2)
  })

  it('tenta de novo em erro de rede sem status HTTP', async () => {
    const { provider, chat } = makeProvider([new Error('fetch failed'), ok])
    const wrapped = withRetry(provider, fastConfig)
    await wrapped.chat([{ role: 'user', content: 'oi' }])
    expect(chat).toHaveBeenCalledTimes(2)
  })

  it('não tenta de novo em 400 (erro do cliente)', async () => {
    const err = httpError(400)
    const { provider, chat } = makeProvider([err])
    const wrapped = withRetry(provider, fastConfig)
    await expect(wrapped.chat([{ role: 'user', content: 'oi' }])).rejects.toBe(err)
    expect(chat).toHaveBeenCalledTimes(1)
  })

  it('não tenta de novo em 401 (autenticação)', async () => {
    const { provider, chat } = makeProvider([httpError(401)])
    const wrapped = withRetry(provider, fastConfig)
    await expect(wrapped.chat([{ role: 'user', content: 'oi' }])).rejects.toThrow(/401/)
    expect(chat).toHaveBeenCalledTimes(1)
  })

  it('desiste após maxAttempts tentativas e propaga o último erro', async () => {
    const last = httpError(503)
    const { provider, chat } = makeProvider([httpError(503), httpError(503), last])
    const wrapped = withRetry(provider, { ...fastConfig, maxAttempts: 3 })
    await expect(wrapped.chat([{ role: 'user', content: 'oi' }])).rejects.toBe(last)
    expect(chat).toHaveBeenCalledTimes(3)
  })

  it('aplica backoff exponencial entre tentativas', async () => {
    const { provider } = makeProvider([httpError(503), httpError(503), ok])
    const delays: number[] = []
    const sleep = vi.fn(async (ms: number) => {
      delays.push(ms)
    })
    const wrapped = withRetry(provider, {
      maxAttempts: 3,
      baseDelayMs: 100,
      jitterFactor: 0,
      sleep,
    })
    await wrapped.chat([{ role: 'user', content: 'oi' }])
    expect(delays).toEqual([100, 200])
  })
})
