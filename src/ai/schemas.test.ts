import { describe, it, expect } from 'vitest'
import { intentSchema, parseIntent } from './schemas'

describe('intentSchema — discriminated union', () => {
  it('aceita create_event válido', () => {
    const input = {
      type: 'create_event',
      data: {
        title: 'Encontro com Sr. Walter',
        datetime: '2026-04-17T10:00:00Z',
        location: 'casa antiga',
        contactPerson: 'Sr. Walter',
      },
      response: 'Anotado!',
    }
    const result = intentSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('rejeita create_event sem title', () => {
    const input = {
      type: 'create_event',
      data: { datetime: '2026-04-17T10:00:00Z' },
      response: 'ok',
    }
    const result = intentSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('aceita create_goal com deadline e unit', () => {
    const input = {
      type: 'create_goal',
      data: {
        title: 'Horas extras mensais',
        targetValue: 30,
        unit: 'horas',
        deadline: '2026-04-30T23:59:59Z',
        category: 'work',
      },
      response: 'Meta criada!',
    }
    expect(intentSchema.safeParse(input).success).toBe(true)
  })

  it('rejeita category inválida em create_goal', () => {
    const input = {
      type: 'create_goal',
      data: { title: 'x', category: 'hobby' },
      response: 'ok',
    }
    expect(intentSchema.safeParse(input).success).toBe(false)
  })

  it('aceita log_progress com value numérico', () => {
    const input = {
      type: 'log_progress',
      data: { goalTitle: 'Horas extras', value: 5, note: 'sprint fim de semana' },
      response: '+5h registradas',
    }
    expect(intentSchema.safeParse(input).success).toBe(true)
  })

  it('rejeita log_progress com value string', () => {
    const input = {
      type: 'log_progress',
      data: { goalTitle: 'x', value: '5' },
      response: 'ok',
    }
    expect(intentSchema.safeParse(input).success).toBe(false)
  })

  it('rejeita githubRepo em formato inválido em create_project', () => {
    const input = {
      type: 'create_project',
      data: { name: 'Zestify', githubRepo: 'só-repo-sem-owner' },
      response: 'ok',
    }
    expect(intentSchema.safeParse(input).success).toBe(false)
  })

  it('aceita githubRepo no formato owner/repo', () => {
    const input = {
      type: 'create_project',
      data: { name: 'Zestify', githubRepo: 'samuelpanzer/zestify' },
      response: 'ok',
    }
    expect(intentSchema.safeParse(input).success).toBe(true)
  })

  it('rejeita priority fora de 1-5', () => {
    const input = {
      type: 'create_project',
      data: { name: 'X', priority: 7 },
      response: 'ok',
    }
    expect(intentSchema.safeParse(input).success).toBe(false)
  })

  it('aceita chitchat sem dados', () => {
    const input = { type: 'chitchat', data: {}, response: 'E aí!' }
    expect(intentSchema.safeParse(input).success).toBe(true)
  })

  it('rejeita type desconhecido', () => {
    const input = { type: 'summon_luffy', data: {}, response: 'ok' }
    expect(intentSchema.safeParse(input).success).toBe(false)
  })

  it('rejeita response vazia', () => {
    const input = { type: 'chitchat', data: {}, response: '' }
    expect(intentSchema.safeParse(input).success).toBe(false)
  })
})

describe('parseIntent', () => {
  it('retorna ok:true para JSON válido e bem formado', () => {
    const raw = JSON.stringify({
      type: 'chitchat',
      data: {},
      response: 'oi',
    })
    const result = parseIntent(raw)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.intent.type).toBe('chitchat')
  })

  it('retorna ok:false com reason invalid_json para texto não-JSON', () => {
    const result = parseIntent('isto não é JSON')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid_json')
  })

  it('retorna ok:false com reason invalid_shape para JSON fora do schema', () => {
    const raw = JSON.stringify({ type: 'create_event', data: {}, response: 'x' })
    const result = parseIntent(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid_shape')
  })
})
