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

export interface CalendarClient {
  getEventsForRange(start: Date, end: Date): Promise<CalendarEvent[]>
  getFreeBlocks(date: Date, minMinutes?: number): Promise<TimeBlock[]>
}
