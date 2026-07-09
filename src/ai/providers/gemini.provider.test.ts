import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GeminiProvider } from './gemini.provider'
import { AIMessage } from '../provider'

const mockSendMessage = vi.fn().mockResolvedValue({
  response: {
    text: () => 'Mock response from Gemini',
  },
})

const mockStartChat = vi.fn().mockReturnValue({
  sendMessage: mockSendMessage,
})

const mockGetGenerativeModel = vi.fn().mockReturnValue({
  startChat: mockStartChat,
})

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => {
      return {
        getGenerativeModel: mockGetGenerativeModel,
      }
    }),
  }
})

describe('GeminiProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve higienizar o histórico de chat para atender as regras rígidas do Gemini', async () => {
    const provider = new GeminiProvider('fake-key')
    
    // Histórico de conversação complexo:
    // [system] (deve ser filtrado)
    // [assistant] (início com model - deve ser descartado)
    // [user] "Oi"
    // [user] "Tudo bem?" (consecutivo - deve ser agrupado com o de cima)
    // [assistant] "Olá" (model - alternância)
    // [user] "Preciso de ajuda" (user no fim - deve ser removido do histórico, pois o sendMessage já enviará o último input)
    // [user] "com o bot" (último input - será enviado no sendMessage)
    const messages: AIMessage[] = [
      { role: 'system', content: 'Prompt de sistema' },
      { role: 'assistant', content: 'Ignorar essa primeira do bot' },
      { role: 'user', content: 'Oi' },
      { role: 'user', content: 'Tudo bem?' },
      { role: 'assistant', content: 'Olá' },
      { role: 'user', content: 'Preciso de ajuda' },
      { role: 'user', content: 'com o bot' }, // último input
    ]

    const result = await provider.chat(messages)

    expect(result.text).toBe('Mock response from Gemini')
    expect(mockGetGenerativeModel).toHaveBeenCalledTimes(1)
    
    // Valida que o startChat recebeu o histórico higienizado:
    // 1. Descartou o primeiro assistant ("Ignorar essa primeira do bot")
    // 2. Agrupou "Oi" e "Tudo bem?" -> "Oi\nTudo bem?"
    // 3. Manteve "Olá" (model)
    // 4. Descartou "Preciso de ajuda" do histórico (pois terminava em user e o sendMessage é user)
    expect(mockStartChat).toHaveBeenCalledWith({
      history: [
        {
          role: 'user',
          parts: [{ text: 'Oi\nTudo bem?' }],
        },
        {
          role: 'model',
          parts: [{ text: 'Olá' }],
        },
      ],
    })

    // Valida que o último input foi enviado pelo sendMessage
    expect(mockSendMessage).toHaveBeenCalledWith('com o bot')
  })
})
