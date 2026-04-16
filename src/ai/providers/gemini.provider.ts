import { GoogleGenerativeAI } from '@google/generative-ai'
import { AIProvider, AIMessage, AIOptions, AIResponse } from '../provider'

export class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI
  private modelName: string

  constructor(apiKey: string, modelName = 'gemini-2.0-flash') {
    this.client = new GoogleGenerativeAI(apiKey)
    this.modelName = modelName
  }

  async chat(messages: AIMessage[], options: AIOptions = {}): Promise<AIResponse> {
    const systemMessages = messages.filter((m) => m.role === 'system')
    const conversationMessages = messages.filter((m) => m.role !== 'system')

    const systemInstruction = systemMessages.map((m) => m.content).join('\n\n') || undefined

    const model = this.client.getGenerativeModel({
      model: this.modelName,
      systemInstruction,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 2048,
        responseMimeType: options.jsonMode ? 'application/json' : 'text/plain',
      },
    })

    const history = conversationMessages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const lastMessage = conversationMessages[conversationMessages.length - 1]
    if (!lastMessage) throw new Error('Gemini: pelo menos uma mensagem user/assistant é necessária')

    const chat = model.startChat({ history })
    const result = await chat.sendMessage(lastMessage.content)
    const text = result.response.text()

    return {
      text,
      model: this.modelName,
      provider: 'gemini',
    }
  }
}
