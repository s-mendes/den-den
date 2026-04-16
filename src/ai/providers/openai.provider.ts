import OpenAI from 'openai'
import { AIProvider, AIMessage, AIOptions, AIResponse } from '../provider'

export class OpenAIProvider implements AIProvider {
  private client: OpenAI
  private modelName: string

  constructor(apiKey: string, modelName = 'gpt-4o-mini') {
    this.client = new OpenAI({ apiKey })
    this.modelName = modelName
  }

  async chat(messages: AIMessage[], options: AIOptions = {}): Promise<AIResponse> {
    const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages: apiMessages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      response_format: options.jsonMode ? { type: 'json_object' } : undefined,
    })

    const text = response.choices[0]?.message?.content ?? ''

    return {
      text,
      model: this.modelName,
      provider: 'openai',
    }
  }
}
