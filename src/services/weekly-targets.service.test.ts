import { describe, it, expect, vi, beforeEach } from 'vitest'
import { weeklyTargetsService, getCurrentWeekStart } from './weekly-targets.service'
import { prisma } from './db'
import { AreaSlug } from '@prisma/client'

vi.mock('./db', () => ({
  prisma: {
    weeklyTarget: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    weeklyEntry: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

describe('weeklyTargetsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCurrentWeekStart', () => {
    it('deve retornar a segunda-feira correta às 00:00:00 UTC para uma quarta-feira', () => {
      // 2026-07-08 é uma quarta-feira
      const date = new Date(Date.UTC(2026, 6, 8, 15, 30, 0))
      const start = getCurrentWeekStart(date)

      expect(start.getUTCFullYear()).toBe(2026)
      expect(start.getUTCMonth()).toBe(6) // Julho (0-indexed)
      expect(start.getUTCDate()).toBe(6) // Segunda-feira foi dia 6
      expect(start.getUTCHours()).toBe(0)
      expect(start.getUTCMinutes()).toBe(0)
    })

    it('deve retornar a segunda-feira correta para um domingo', () => {
      // 2026-07-12 é um domingo
      const date = new Date(Date.UTC(2026, 6, 12, 10, 0, 0))
      const start = getCurrentWeekStart(date)

      expect(start.getUTCDate()).toBe(6) // Segunda-feira anterior foi dia 6
    })

    it('deve retornar a própria segunda-feira se a data já for segunda', () => {
      // 2026-07-06 é uma segunda-feira
      const date = new Date(Date.UTC(2026, 6, 6, 9, 0, 0))
      const start = getCurrentWeekStart(date)

      expect(start.getUTCDate()).toBe(6)
    })

    it('domingo à noite em São Paulo ainda conta na semana corrente, mesmo já sendo segunda em UTC', () => {
      // 2026-07-13T02:00Z é segunda 02:00 UTC, mas domingo 12/07 23:00 em America/Sao_Paulo
      const date = new Date(Date.UTC(2026, 6, 13, 2, 0, 0))
      const start = getCurrentWeekStart(date)

      expect(start.toISOString()).toBe('2026-07-06T00:00:00.000Z')
    })

    it('segunda 00:00 em São Paulo (03:00 UTC) já abre a semana nova', () => {
      const date = new Date(Date.UTC(2026, 6, 13, 3, 0, 0))
      const start = getCurrentWeekStart(date)

      expect(start.toISOString()).toBe('2026-07-13T00:00:00.000Z')
    })
  })

  describe('create', () => {
    it('deve salvar uma nova meta semanal no Prisma', async () => {
      const input = {
        areaSlug: AreaSlug.business,
        activity: 'blocos de código Zestify',
        targetCount: 2,
      }
      const mockResult = { id: 1, ...input, active: true }
      vi.mocked(prisma.weeklyTarget.create).mockResolvedValue(mockResult as any)

      const result = await weeklyTargetsService.create(input)

      expect(prisma.weeklyTarget.create).toHaveBeenCalledWith({
        data: input,
      })
      expect(result).toEqual(mockResult)
    })
  })

  describe('getWeekProgress', () => {
    it('deve cruzar metas ativas com lançamentos da semana', async () => {
      const weekStart = new Date(Date.UTC(2026, 6, 6))
      const mockTargets = [
        { id: 1, areaSlug: AreaSlug.business, activity: 'Zestify', targetCount: 2, active: true },
        { id: 2, areaSlug: AreaSlug.health, activity: 'Treino', targetCount: 3, active: true },
      ]
      const mockEntries = [
        { id: 10, weeklyTargetId: 1, weekStart, completedCount: 1, notes: 'bloco 1' },
      ]

      vi.mocked(prisma.weeklyTarget.findMany).mockResolvedValue(mockTargets as any)
      vi.mocked(prisma.weeklyEntry.findMany).mockResolvedValue(mockEntries as any)

      const result = await weeklyTargetsService.getWeekProgress(weekStart)

      expect(result).toHaveLength(2)
      expect(result[0].completedCount).toBe(1)
      expect(result[0].notes).toBe('bloco 1')
      expect(result[1].completedCount).toBe(0)
      expect(result[1].notes).toBeNull()
    })
  })

  describe('incrementProgress', () => {
    it('deve disparar upsert do Prisma para registrar avanço', async () => {
      const weekStart = new Date(Date.UTC(2026, 6, 6))
      const mockEntry = { id: 1, weeklyTargetId: 1, weekStart, completedCount: 1, notes: 'Treino pago' }
      vi.mocked(prisma.weeklyEntry.upsert).mockResolvedValue(mockEntry as any)

      const result = await weeklyTargetsService.incrementProgress(1, weekStart, 1, 'Treino pago')

      expect(prisma.weeklyEntry.upsert).toHaveBeenCalledWith({
        where: {
          weeklyTargetId_weekStart: {
            weeklyTargetId: 1,
            weekStart,
          },
        },
        update: {
          completedCount: { increment: 1 },
          notes: 'Treino pago',
        },
        create: {
          weeklyTargetId: 1,
          weekStart,
          completedCount: 1,
          notes: 'Treino pago',
        },
      })
      expect(result).toEqual(mockEntry)
    })
  })

  describe('getRemainingForWeek', () => {
    it('deve retornar apenas itens que ainda possuem progresso pendente', async () => {
      const weekStart = new Date(Date.UTC(2026, 6, 6))
      const mockTargets = [
        { id: 1, areaSlug: AreaSlug.business, activity: 'Zestify', targetCount: 2, active: true },
        { id: 2, areaSlug: AreaSlug.health, activity: 'Treino', targetCount: 3, active: true },
      ]
      const mockEntries = [
        { id: 10, weeklyTargetId: 1, weekStart, completedCount: 2, notes: 'Completo!' },
        { id: 11, weeklyTargetId: 2, weekStart, completedCount: 1, notes: 'Faltam 2' },
      ]

      vi.mocked(prisma.weeklyTarget.findMany).mockResolvedValue(mockTargets as any)
      vi.mocked(prisma.weeklyEntry.findMany).mockResolvedValue(mockEntries as any)

      const result = await weeklyTargetsService.getRemainingForWeek(weekStart)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(2)
      expect(result[0].remaining).toBe(2)
    })
  })

  describe('getWeekSummary', () => {
    it('deve calcular porcentagens e pontuação global da semana', async () => {
      const weekStart = new Date(Date.UTC(2026, 6, 6))
      const mockTargets = [
        { id: 1, areaSlug: AreaSlug.business, activity: 'Zestify', targetCount: 2, active: true },
        { id: 2, areaSlug: AreaSlug.health, activity: 'Treino', targetCount: 3, active: true },
      ]
      const mockEntries = [
        { id: 10, weeklyTargetId: 1, weekStart, completedCount: 2, notes: 'Concluído' }, // completed
        { id: 11, weeklyTargetId: 2, weekStart, completedCount: 1, notes: 'Iniciado' }, // in_progress
      ]

      vi.mocked(prisma.weeklyTarget.findMany).mockResolvedValue(mockTargets as any)
      vi.mocked(prisma.weeklyEntry.findMany).mockResolvedValue(mockEntries as any)

      const result = await weeklyTargetsService.getWeekSummary(weekStart)

      expect(result.score).toBe(50) // 1 de 2 metas finalizadas
      expect(result.completed).toBe(1)
      expect(result.total).toBe(2)
      expect(result.items[0].percentage).toBe(100)
      expect(result.items[1].percentage).toBe(33)
    })
  })

  describe('logActivity', () => {
    it('deve retornar null se não houver metas ativas para a área', async () => {
      vi.mocked(prisma.weeklyTarget.findMany).mockResolvedValue([])

      const result = await weeklyTargetsService.logActivity(AreaSlug.health, 'Fiz um treino de costas')
      expect(result).toBeNull()
      expect(prisma.weeklyEntry.upsert).not.toHaveBeenCalled()
    })

    it('deve incrementar a primeira meta se houver apenas uma cadastrada na área', async () => {
      const mockTargets = [{ id: 42, areaSlug: AreaSlug.health, activity: 'Ir na academia', targetCount: 3 }]
      vi.mocked(prisma.weeklyTarget.findMany).mockResolvedValue(mockTargets as any)

      await weeklyTargetsService.logActivity(AreaSlug.health, 'Qualquer atividade aleatória')

      expect(prisma.weeklyEntry.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            weeklyTargetId: 42,
            completedCount: 1,
            notes: 'Qualquer atividade aleatória',
          }),
        })
      )
    })

    it('deve escolher a melhor meta aproximada textualmente se houver múltiplas', async () => {
      const mockTargets = [
        { id: 10, areaSlug: AreaSlug.business, activity: 'Estudar Zestify', targetCount: 2 },
        { id: 20, areaSlug: AreaSlug.business, activity: 'Programar Excursa', targetCount: 1 },
      ]
      vi.mocked(prisma.weeklyTarget.findMany).mockResolvedValue(mockTargets as any)

      // "Fiz 1h de deploy no Excursa" deve bater com "Programar Excursa"
      await weeklyTargetsService.logActivity(AreaSlug.business, 'Fiz 1h de deploy no Excursa')

      expect(prisma.weeklyEntry.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            weeklyTargetId: 20,
            notes: 'Fiz 1h de deploy no Excursa',
          }),
        })
      )
    })
  })
})

