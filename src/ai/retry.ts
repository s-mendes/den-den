import { AIProvider, AIMessage, AIOptions, AIResponse } from './provider'

export interface RetryConfig {
  maxAttempts?: number
  baseDelayMs?: number
  jitterFactor?: number
  sleep?: (ms: number) => Promise<void>
}

const DEFAULTS = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  jitterFactor: 0.3,
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetriable(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const status = (err as { status?: unknown }).status
  // Sem status HTTP = provável falha de rede (fetch, timeout, reset) — retria.
  if (typeof status !== 'number') return true
  return status === 429 || (status >= 500 && status < 600)
}

function backoffDelay(attempt: number, baseMs: number, jitter: number): number {
  const exp = baseMs * 2 ** (attempt - 1)
  if (jitter <= 0) return exp
  const variance = exp * jitter
  return Math.max(0, exp + (Math.random() * 2 - 1) * variance)
}

export function withRetry(provider: AIProvider, config: RetryConfig = {}): AIProvider {
  const maxAttempts = config.maxAttempts ?? DEFAULTS.maxAttempts
  const baseDelayMs = config.baseDelayMs ?? DEFAULTS.baseDelayMs
  const jitterFactor = config.jitterFactor ?? DEFAULTS.jitterFactor
  const sleep = config.sleep ?? defaultSleep

  return {
    async chat(messages: AIMessage[], options?: AIOptions): Promise<AIResponse> {
      let lastErr: unknown
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await provider.chat(messages, options)
        } catch (err) {
          lastErr = err
          if (!isRetriable(err) || attempt === maxAttempts) throw err
          const delay = backoffDelay(attempt, baseDelayMs, jitterFactor)
          const status = (err as { status?: unknown }).status ?? 'rede'
          console.warn(
            `[ai] tentativa ${attempt}/${maxAttempts} falhou (${status}). Nova tentativa em ${Math.round(delay)}ms.`
          )
          await sleep(delay)
        }
      }
      throw lastErr
    },
  }
}
