export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIResponse {
  text: string
  model: string
  provider: string
}

export interface AIOptions {
  temperature?: number
  maxTokens?: number
  jsonMode?: boolean
}

export interface AIProvider {
  chat(messages: AIMessage[], options?: AIOptions): Promise<AIResponse>
}
