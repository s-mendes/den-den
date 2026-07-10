import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocking googleapis
const mockList = vi.fn()
const mockOAuth2SetCredentials = vi.fn()

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        setCredentials: mockOAuth2SetCredentials,
      })),
    },
    calendar: vi.fn().mockImplementation(() => ({
      events: {
        list: mockList,
      },
    })),
  },
}))

import { GoogleCalendarClient } from './google-calendar'

describe('GoogleCalendarClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Set up mock env vars
    process.env.GOOGLE_CLIENT_ID = 'mock-client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'mock-client-secret'
    process.env.GOOGLE_REFRESH_TOKEN = 'mock-refresh-token'
  })

  describe('getEventsForRange', () => {
    it('deve buscar e mapear eventos do Google Calendar no intervalo especificado', async () => {
      const start = new Date('2026-07-09T08:00:00Z')
      const end = new Date('2026-07-09T22:30:00Z')

      const googleMockResponse = {
        data: {
          items: [
            {
              id: 'event-1',
              summary: 'Daily Macle',
              start: { dateTime: '2026-07-09T09:00:00Z' },
              end: { dateTime: '2026-07-09T09:30:00Z' },
              location: 'Google Meet',
              description: 'Standup diária',
            },
            {
              id: 'event-2',
              summary: 'Almoço',
              start: { date: '2026-07-09' }, // Evento de dia inteiro
              end: { date: '2026-07-10' },
            },
          ],
        },
      }
      mockList.mockResolvedValue(googleMockResponse)

      const client = new GoogleCalendarClient()
      const result = await client.getEventsForRange(start, end)

      expect(mockList).toHaveBeenCalledWith({
        calendarId: 'primary',
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      })

      expect(result.status).toBe('ok')
      if (result.status !== 'ok') return

      expect(result.events).toHaveLength(2)
      expect(result.events[0].id).toBe('event-1')
      expect(result.events[0].title).toBe('Daily Macle')
      expect(result.events[0].isAllDay).toBe(false)
      expect(result.events[0].location).toBe('Google Meet')

      expect(result.events[1].id).toBe('event-2')
      expect(result.events[1].isAllDay).toBe(true)
    })

    it('retorna status "error" quando a API do Google falha — sem mascarar como agenda vazia', async () => {
      mockList.mockRejectedValue(new Error('invalid_grant: token expirado'))

      const client = new GoogleCalendarClient()
      const result = await client.getEventsForRange(new Date(), new Date())

      expect(result.status).toBe('error')
      if (result.status !== 'error') return
      expect(result.message).toContain('invalid_grant')
    })

    it('retorna status "not_configured" quando faltam credenciais no env', async () => {
      delete process.env.GOOGLE_CLIENT_ID
      delete process.env.GOOGLE_CLIENT_SECRET
      delete process.env.GOOGLE_REFRESH_TOKEN

      const client = new GoogleCalendarClient()
      const result = await client.getEventsForRange(new Date(), new Date())

      expect(result).toEqual({ status: 'not_configured' })
      expect(mockList).not.toHaveBeenCalled()
    })
  })

  describe('getFreeBlocks', () => {
    it('deve calcular corretamente as lacunas livres no período operacional', async () => {
      // Período operacional padrão: 08:00 às 22:30
      const date = new Date('2026-07-09T12:00:00Z') // Qualquer hora no dia

      const googleMockResponse = {
        data: {
          items: [
            {
              id: 'event-1',
              summary: 'Macle Trabalho',
              start: { dateTime: '2026-07-09T08:00:00' }, // 08:00 às 17:00
              end: { dateTime: '2026-07-09T17:00:00' },
            },
            {
              id: 'event-2',
              summary: 'Treino Academia',
              start: { dateTime: '2026-07-09T18:00:00' }, // 18:00 às 19:30
              end: { dateTime: '2026-07-09T19:30:00' },
            },
          ],
        },
      }
      mockList.mockResolvedValue(googleMockResponse)

      const client = new GoogleCalendarClient()
      const freeBlocks = await client.getFreeBlocks(date, 30)

      // Lacunas esperadas:
      // 1. Das 17:00 às 18:00 (60 minutos)
      // 2. Das 19:30 às 22:30 (180 minutos)
      expect(freeBlocks).toHaveLength(2)

      expect(freeBlocks[0].durationMinutes).toBe(60)
      expect(freeBlocks[0].start.getHours()).toBe(17)
      expect(freeBlocks[0].end.getHours()).toBe(18)

      expect(freeBlocks[1].durationMinutes).toBe(180)
      expect(freeBlocks[1].start.getHours()).toBe(19)
      expect(freeBlocks[1].start.getMinutes()).toBe(30)
      expect(freeBlocks[1].end.getHours()).toBe(22)
      expect(freeBlocks[1].end.getMinutes()).toBe(30)
    })

    it('retorna lista vazia quando a busca de eventos falha', async () => {
      mockList.mockRejectedValue(new Error('quota exceeded'))

      const client = new GoogleCalendarClient()
      const freeBlocks = await client.getFreeBlocks(new Date('2026-07-09T12:00:00Z'), 30)

      expect(freeBlocks).toEqual([])
    })
  })
})
