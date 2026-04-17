import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const geminiCtor = vi.fn()
const anthropicCtor = vi.fn()
const openaiCtor = vi.fn()

vi.mock('./providers/gemini.provider', () => ({
  GeminiProvider: vi.fn((...args) => geminiCtor(...args)),
}))
vi.mock('./providers/anthropic.provider', () => ({
  AnthropicProvider: vi.fn((...args) => anthropicCtor(...args)),
}))
vi.mock('./providers/openai.provider', () => ({
  OpenAIProvider: vi.fn((...args) => openaiCtor(...args)),
}))

import { createAIProvider } from './factory'

const originalEnv = { ...process.env }

describe('createAIProvider', () => {
  beforeEach(() => {
    geminiCtor.mockClear()
    anthropicCtor.mockClear()
    openaiCtor.mockClear()
    process.env = { ...originalEnv }
    delete process.env.AI_PROVIDER
    delete process.env.GEMINI_API_KEY
    delete process.env.GEMINI_MODEL
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_MODEL
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENAI_MODEL
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('passa undefined ao GeminiProvider quando GEMINI_MODEL é string vazia', () => {
    process.env.AI_PROVIDER = 'gemini'
    process.env.GEMINI_API_KEY = 'k'
    process.env.GEMINI_MODEL = ''

    createAIProvider()

    expect(geminiCtor).toHaveBeenCalledWith('k', undefined)
  })

  it('passa o valor ao GeminiProvider quando GEMINI_MODEL tem valor', () => {
    process.env.AI_PROVIDER = 'gemini'
    process.env.GEMINI_API_KEY = 'k'
    process.env.GEMINI_MODEL = 'gemini-2.5-flash'

    createAIProvider()

    expect(geminiCtor).toHaveBeenCalledWith('k', 'gemini-2.5-flash')
  })

  it('passa undefined ao AnthropicProvider quando ANTHROPIC_MODEL é string vazia', () => {
    process.env.AI_PROVIDER = 'anthropic'
    process.env.ANTHROPIC_API_KEY = 'k'
    process.env.ANTHROPIC_MODEL = ''

    createAIProvider()

    expect(anthropicCtor).toHaveBeenCalledWith('k', undefined)
  })

  it('passa undefined ao OpenAIProvider quando OPENAI_MODEL é string vazia', () => {
    process.env.AI_PROVIDER = 'openai'
    process.env.OPENAI_API_KEY = 'k'
    process.env.OPENAI_MODEL = ''

    createAIProvider()

    expect(openaiCtor).toHaveBeenCalledWith('k', undefined)
  })

  it('lança erro quando a chave do provider escolhido não está definida', () => {
    process.env.AI_PROVIDER = 'gemini'
    expect(() => createAIProvider()).toThrow(/GEMINI_API_KEY/)
  })
})
