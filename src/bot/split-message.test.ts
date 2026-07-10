import { describe, it, expect } from 'vitest'
import { splitDiscordMessage, DISCORD_MESSAGE_LIMIT } from './split-message'

describe('splitDiscordMessage', () => {
  it('retorna a mensagem inteira quando cabe no limite', () => {
    expect(splitDiscordMessage('olá capitão')).toEqual(['olá capitão'])
  })

  it('quebra em parágrafos quando o texto excede o limite', () => {
    const p1 = 'A'.repeat(1200)
    const p2 = 'B'.repeat(1200)
    const chunks = splitDiscordMessage(`${p1}\n\n${p2}`)

    expect(chunks).toEqual([p1, p2])
  })

  it('agrupa parágrafos pequenos no mesmo chunk', () => {
    const paragraphs = Array.from({ length: 6 }, (_, i) => `parágrafo ${i} ` + 'x'.repeat(500))
    const chunks = splitDiscordMessage(paragraphs.join('\n\n'))

    expect(chunks.length).toBeGreaterThan(1)
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(DISCORD_MESSAGE_LIMIT)
    }
    // conteúdo preservado
    expect(chunks.join('\n\n')).toBe(paragraphs.join('\n\n'))
  })

  it('quebra por linha quando um parágrafo sozinho excede o limite', () => {
    const lines = Array.from({ length: 5 }, (_, i) => `linha ${i} ` + 'y'.repeat(600))
    const chunks = splitDiscordMessage(lines.join('\n'))

    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(DISCORD_MESSAGE_LIMIT)
    }
    expect(chunks.join('\n')).toBe(lines.join('\n'))
  })

  it('corta no limite quando uma única linha excede 2000 chars', () => {
    const giant = 'z'.repeat(4500)
    const chunks = splitDiscordMessage(giant)

    expect(chunks.map((c) => c.length)).toEqual([2000, 2000, 500])
    expect(chunks.join('')).toBe(giant)
  })

  it('não retorna chunks vazios', () => {
    const chunks = splitDiscordMessage(`a\n\n\n\n${'b'.repeat(2500)}`)
    for (const c of chunks) {
      expect(c.trim().length).toBeGreaterThan(0)
    }
  })
})
