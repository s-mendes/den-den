export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  isAllDay: boolean
  location?: string | null
  description?: string | null
}

export interface TimeBlock {
  start: Date
  end: Date
  durationMinutes: number
}

// Resultado discriminado: quem consome distingue "agenda vazia" de "calendar
// indisponível" — erro nunca deve ser mascarado como dia livre.
export type CalendarFetchResult =
  | { status: 'ok'; events: CalendarEvent[] }
  | { status: 'not_configured' }
  | { status: 'error'; message: string }

export type CalendarStatus = CalendarFetchResult['status']

export interface CalendarClient {
  getEventsForRange(start: Date, end: Date): Promise<CalendarFetchResult>
  getFreeBlocks(
    date: Date,
    minMinutes?: number,
    prefetchedEvents?: CalendarEvent[]
  ): Promise<TimeBlock[]>
}
