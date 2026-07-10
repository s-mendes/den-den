// LLMs ignoram o sufixo `Z` do ISO 8601 e tratam o número como se fosse local
// (ex: `2026-04-17T11:49Z` vira "11:49" pra eles). Formatamos no fuso do usuário
// com o offset explícito pra remover qualquer ambiguidade.
const DEFAULT_TIME_ZONE = 'America/Sao_Paulo'

export function resolveTimeZone(timeZone?: string): string {
  return timeZone ?? process.env.APP_TIME_ZONE ?? process.env.TZ ?? DEFAULT_TIME_ZONE
}

function partsMap(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, ...options }).formatToParts(date)
  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value
  return map
}

function normalizeOffset(raw: string | undefined): string {
  const value = (raw ?? '').replace(/^GMT/, 'UTC')
  return value === 'UTC' ? 'UTC+00:00' : value
}

export function formatDateTimeForPrompt(date: Date, timeZone?: string): string {
  const tz = resolveTimeZone(timeZone)
  const map = partsMap(date, tz, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'longOffset',
  })
  const datePart = `${map.year}-${map.month}-${map.day}`
  const timePart = `${map.hour}:${map.minute}:${map.second}`
  const offset = normalizeOffset(map.timeZoneName)
  return `${datePart} ${timePart} (${tz}, ${offset})`
}

export function formatTimeForPrompt(date: Date, timeZone?: string): string {
  const tz = resolveTimeZone(timeZone)
  const map = partsMap(date, tz, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  return `${map.hour}:${map.minute}`
}

export function formatDateForPrompt(date: Date, timeZone?: string): string {
  const tz = resolveTimeZone(timeZone)
  const map = partsMap(date, tz, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return `${map.year}-${map.month}-${map.day}`
}

// Chave canônica de "dia" no banco: meia-noite UTC do dia LOCAL do usuário
// (mesma convenção de WeeklyEntry.weekStart). 23h em SP ainda é o mesmo dia.
export function getLocalDayStart(date: Date = new Date(), timeZone?: string): Date {
  const [year, month, day] = formatDateForPrompt(date, timeZone).split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}
