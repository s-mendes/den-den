import { afterEach, describe, it, expect } from 'vitest'
import { formatDateTimeForPrompt, formatDateForPrompt, formatTimeForPrompt } from './time'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

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

  it('usa America/Sao_Paulo como fuso padrão quando nenhum é passado', () => {
    const date = new Date('2026-04-17T11:49:06Z')
    delete process.env.APP_TIME_ZONE
    delete process.env.TZ

    const formatted = formatDateTimeForPrompt(date)
    expect(formatted).toBe('2026-04-17 08:49:06 (America/Sao_Paulo, UTC-03:00)')
  })

  it('usa APP_TIME_ZONE quando definido', () => {
    const date = new Date('2026-04-17T11:49:06Z')
    process.env.APP_TIME_ZONE = 'UTC'

    const formatted = formatDateTimeForPrompt(date)
    expect(formatted).toBe('2026-04-17 11:49:06 (UTC, UTC+00:00)')
  })
})

describe('formatTimeForPrompt', () => {
  it('retorna apenas HH:mm no fuso informado', () => {
    // 2026-07-09T10:00:00Z → 07:00 em São Paulo (UTC-03:00)
    const date = new Date('2026-07-09T10:00:00Z')
    expect(formatTimeForPrompt(date, 'America/Sao_Paulo')).toBe('07:00')
  })

  it('retorna a hora em UTC corretamente', () => {
    const date = new Date('2026-07-09T10:00:00Z')
    expect(formatTimeForPrompt(date, 'UTC')).toBe('10:00')
  })

  it('usa America/Sao_Paulo como fuso padrão quando nenhum é passado', () => {
    delete process.env.APP_TIME_ZONE
    delete process.env.TZ

    const date = new Date('2026-07-09T02:30:00Z')
    expect(formatTimeForPrompt(date)).toBe('23:30')
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
