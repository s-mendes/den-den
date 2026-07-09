import { describe, it, expect, vi, beforeEach } from 'vitest'
import { weeklyScoreService } from './weekly-score.service'
import { weeklyTargetsService, getCurrentWeekStart } from './weekly-targets.service'
import { AreaSlug } from '@prisma/client'

vi.mock('./weekly-targets.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./weekly-targets.service')>()
  return {
    ...actual,
    weeklyTargetsService: {
      getWeekProgress: vi.fn(),
    },
  }
})

describe('weeklyScoreService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateWeekScore', () => {
    it('deve retornar score 0 se não houver metas na semana', async () => {
      vi.mocked(weeklyTargetsService.getWeekProgress).mockResolvedValue([])

      const result = await weeklyScoreService.calculateWeekScore(new Date())

      expect(result.score).toBe(0)
      expect(result.completed).toBe(0)
      expect(result.total).toBe(0)
      expect(result.items).toHaveLength(0)
    })

    it('deve calcular corretamente a pontuação com base nas metas completas', async () => {
      const mockProgress = [
        { areaSlug: AreaSlug.health, activity: 'Treino', targetCount: 3, completedCount: 3, notes: null }, // completed (100%)
        { areaSlug: AreaSlug.business, activity: 'Zestify', targetCount: 2, completedCount: 1, notes: null }, // in_progress (50%)
        { areaSlug: AreaSlug.content, activity: 'Vídeos', targetCount: 1, completedCount: 0, notes: null }, // pending (0%)
      ]
      vi.mocked(weeklyTargetsService.getWeekProgress).mockResolvedValue(mockProgress as any)

      const result = await weeklyScoreService.calculateWeekScore(new Date())

      expect(result.total).toBe(3)
      expect(result.completed).toBe(1) // apenas o treino foi completo (3/3)
      expect(result.score).toBe(33) // 1 de 3 = 33%
      expect(result.items[0].status).toBe('completed')
      expect(result.items[1].status).toBe('in_progress')
      expect(result.items[2].status).toBe('pending')
    })
  })

  describe('getStreak', () => {
    it('deve retornar a quantidade de semanas consecutivas acima do threshold', async () => {
      // Mock progress para retornar:
      // Semana -1 (passada): 100% score (3 metas batidas de 3)
      // Semana -2: 80% score
      // Semana -3: 50% score (abaixo de 70% - deve quebrar a streak)
      // Semana -4: 100% score
      vi.mocked(weeklyTargetsService.getWeekProgress).mockImplementation(async (weekStart: Date) => {
        const base = getCurrentWeekStart(new Date())
        const diffTime = base.getTime() - weekStart.getTime()
        const diffWeeks = Math.round(diffTime / (7 * 24 * 60 * 60 * 1000))

        if (diffWeeks === 1) {
          // Semana passada (score 100%)
          return [{ areaSlug: AreaSlug.health, activity: 'A', targetCount: 1, completedCount: 1 }]
        }
        if (diffWeeks === 2) {
          // Semana retrasada (score 100%)
          return [{ areaSlug: AreaSlug.health, activity: 'A', targetCount: 1, completedCount: 1 }]
        }
        if (diffWeeks === 3) {
          // 3 semanas atrás (score 0% - quebra)
          return [{ areaSlug: AreaSlug.health, activity: 'A', targetCount: 1, completedCount: 0 }]
        }
        return [{ areaSlug: AreaSlug.health, activity: 'A', targetCount: 1, completedCount: 1 }]
      })

      const streak = await weeklyScoreService.getStreak(new Date())
      expect(streak).toBe(2) // Apenas 2 semanas consecutivas (Semana -1 e Semana -2)
    })

    it('deve ignorar semanas sem nenhuma meta cadastrada sem quebrar a contagem', async () => {
      // Mock progress para retornar:
      // Semana -1: 100%
      // Semana -2: sem metas (total = 0)
      // Semana -3: 100%
      // Semana -4: 0% (quebra)
      vi.mocked(weeklyTargetsService.getWeekProgress).mockImplementation(async (weekStart: Date) => {
        const base = getCurrentWeekStart(new Date())
        const diffTime = base.getTime() - weekStart.getTime()
        const diffWeeks = Math.round(diffTime / (7 * 24 * 60 * 60 * 1000))

        if (diffWeeks === 1) {
          return [{ areaSlug: AreaSlug.health, activity: 'A', targetCount: 1, completedCount: 1 }]
        }
        if (diffWeeks === 2) {
          return [] // sem metas
        }
        if (diffWeeks === 3) {
          return [{ areaSlug: AreaSlug.health, activity: 'A', targetCount: 1, completedCount: 1 }]
        }
        return [{ areaSlug: AreaSlug.health, activity: 'A', targetCount: 1, completedCount: 0 }]
      })

      const streak = await weeklyScoreService.getStreak(new Date())
      expect(streak).toBe(2) // Semana -1 e Semana -3 contam (a Semana -2 foi ignorada)
    })
  })
})
