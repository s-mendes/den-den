import Anthropic from '@anthropic-ai/sdk'
import { AIProvider, AIMessage, AIOptions, AIResponse } from '../provider'

export class AnthropicProvider implements AIProvider {
  private client: Anthropic
  private modelName: string

  constructor(apiKey: string, modelName = 'claude-sonnet-4-6') {
    this.client = new Anthropic({ apiKey })
    this.modelName = modelName
  }

  async chat(messages: AIMessage[], options: AIOptions = {}): Promise<AIResponse> {
    const systemMessages = messages.filter((m) => m.role === 'system')
    const conversationMessages = messages.filter((m) => m.role !== 'system')

    const system = systemMessages.map((m) => m.content).join('\n\n') || undefined

    const apiMessages: Anthropic.MessageParam[] = conversationMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    if (options.jsonMode) {
      apiMessages.push({ role: 'assistant', content: '{' })
    }

    const response = await this.client.messages.create({
      model: this.modelName,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.7,
      system,
      messages: apiMessages,
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    let text = textBlock && textBlock.type === 'text' ? textBlock.text : ''

    if (options.jsonMode) {
      text = '{' + text
    }

    return {
      text,
      model: this.modelName,
      provider: 'anthropic',
    }
  }
}
