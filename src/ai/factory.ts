import { AIProvider } from './provider'
import { GeminiProvider } from './providers/gemini.provider'
import { AnthropicProvider } from './providers/anthropic.provider'
import { OpenAIProvider } from './providers/openai.provider'

export function createAIProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase()

  switch (provider) {
    case 'gemini': {
      const key = process.env.GEMINI_API_KEY
      if (!key) throw new Error('GEMINI_API_KEY não definida no .env')
      const model = process.env.GEMINI_MODEL
      return new GeminiProvider(key, model)
    }
    case 'anthropic': {
      const key = process.env.ANTHROPIC_API_KEY
      if (!key) throw new Error('ANTHROPIC_API_KEY não definida no .env')
      const model = process.env.ANTHROPIC_MODEL
      return new AnthropicProvider(key, model)
    }
    case 'openai': {
      const key = process.env.OPENAI_API_KEY
      if (!key) throw new Error('OPENAI_API_KEY não definida no .env')
      const model = process.env.OPENAI_MODEL
      return new OpenAIProvider(key, model)
    }
    default:
      throw new Error(`Provedor desconhecido: "${provider}". Use: gemini | anthropic | openai`)
  }
}
