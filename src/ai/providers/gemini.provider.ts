import { GoogleGenerativeAI } from '@google/generative-ai'
import { AIProvider, AIMessage, AIOptions, AIResponse } from '../provider'

export class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI
  private modelName: string

  constructor(apiKey: string, modelName = 'gemini-2.5-flash') {
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

    const lastMessage = conversationMessages[conversationMessages.length - 1]
    if (!lastMessage) throw new Error('Gemini: pelo menos uma mensagem user/assistant é necessária')

    const rawHistory = conversationMessages.slice(0, -1).map((m) => ({
      role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
      content: m.content,
    }))

    // 1. Agrupar mensagens consecutivas do mesmo autor para garantir alternância
    const collapsedHistory: Array<{ role: 'user' | 'model'; content: string }> = []
    for (const msg of rawHistory) {
      const lastCollapsed = collapsedHistory[collapsedHistory.length - 1]
      if (lastCollapsed && lastCollapsed.role === msg.role) {
        lastCollapsed.content += `\n${msg.content}`
      } else {
        collapsedHistory.push({ role: msg.role, content: msg.content })
      }
    }

    // 2. Garantir que o histórico comece obrigatoriamente com 'user'
    const firstUserIndex = collapsedHistory.findIndex((msg) => msg.role === 'user')
    const finalHistory = firstUserIndex !== -1 ? collapsedHistory.slice(firstUserIndex) : []

    // 3. Garantir que o histórico termine com 'model' para alternar com o último input que é 'user'
    if (finalHistory.length > 0 && finalHistory[finalHistory.length - 1].role === 'user') {
      finalHistory.pop()
    }

    const history = finalHistory.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    }))

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
