import { describe, it, expect } from 'vitest'
import { formatDateTimeForPrompt, formatDateForPrompt } from './time'

describe('formatDateTimeForPrompt', () => {
  it('formata data+hora no fuso informado com offset explícito', () => {
    // 2026-04-17T11:49:06Z → 08:49:06 em São Paulo (UTC-03:00)
    const date = new Date('2026-04-17T11:49:06Z')
    const formatted = formatDateTimeForPrompt(date, 'America/Sao_Paulo')
    expect(formatted).toBe('2026-04-17 08:49:06 (America/Sao_Paulo, UTC-03:00)')
  })

  it('formata em UTC com offset +00:00 explícito', () => {
    const date = new Date('2026-04-17T11:49:06Z')
    const formatted = formatDateTimeForPrompt(date, 'UTC')
    expect(formatted).toBe('2026-04-17 11:49:06 (UTC, UTC+00:00)')
  })

  it('usa o fuso do sistema quando nenhum é passado', () => {
    const date = new Date('2026-04-17T11:49:06Z')
    const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const formatted = formatDateTimeForPrompt(date)
    expect(formatted).toContain(systemTz)
  })
})

describe('formatDateForPrompt', () => {
  it('retorna apenas YYYY-MM-DD no fuso informado', () => {
    // 2026-04-17T02:00:00Z ainda é dia 16 em São Paulo
    const date = new Date('2026-04-17T02:00:00Z')
    const formatted = formatDateForPrompt(date, 'America/Sao_Paulo')
    expect(formatted).toBe('2026-04-16')
  })

  it('retorna a data em UTC corretamente', () => {
    const date = new Date('2026-04-17T02:00:00Z')
    const formatted = formatDateForPrompt(date, 'UTC')
    expect(formatted).toBe('2026-04-17')
  })
})
