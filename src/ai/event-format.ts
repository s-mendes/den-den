import { formatTimeForPrompt } from './time'

// Cap por evento para a descrição não estourar o orçamento de tokens do prompt
const DESCRIPTION_MAX_CHARS = 200

export interface PromptCalendarEvent {
  title: string
  start: Date
  end: Date
  isAllDay: boolean
  location?: string | null
  description?: string | null
}

// Linha única de evento para blocos de contexto de LLM. A descrição entra porque
// é onde o usuário define o escopo de cada bloco ("foco em código ou feature
// importante...") — sem ela o modelo só enxerga o título.
export function formatCalendarEventLine(ce: PromptCalendarEvent): string {
  const when = ce.isAllDay
    ? '[Dia Inteiro]'
    : `[${formatTimeForPrompt(ce.start)} - ${formatTimeForPrompt(ce.end)}]`
  const location = ce.location ? ` (${ce.location})` : ''
  const description = ce.description ? ` — ${clampDescription(ce.description)}` : ''
  return `- ${when} - ${ce.title}${location}${description}`
}

function clampDescription(text: string): string {
  const singleLine = text.replace(/\s+/g, ' ').trim()
  if (singleLine.length <= DESCRIPTION_MAX_CHARS) return singleLine
  return `${singleLine.slice(0, DESCRIPTION_MAX_CHARS)}…`
}
