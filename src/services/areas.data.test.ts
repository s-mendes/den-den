import { describe, it, expect } from 'vitest'
import { DEFAULT_AREAS, areaLabel } from './areas.data'

describe('areas.data', () => {
  it('define as 6 áreas da vida', () => {
    expect(DEFAULT_AREAS.map((a) => a.slug)).toEqual([
      'work',
      'business',
      'content',
      'health',
      'personal',
      'study',
    ])
  })

  describe('areaLabel', () => {
    it('retorna emoji + nome da área', () => {
      expect(areaLabel('content')).toBe('🎮 Conteúdo')
      expect(areaLabel('work')).toBe('💼 Trabalho')
    })

    it('cai no próprio slug quando desconhecido', () => {
      expect(areaLabel('hobby')).toBe('hobby')
    })
  })
})
