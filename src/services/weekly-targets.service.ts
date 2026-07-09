import { prisma } from './db'
import { AreaSlug } from '@prisma/client'

export interface CreateWeeklyTargetInput {
  areaSlug: AreaSlug
  activity: string
  targetCount: number
}

export function getCurrentWeekStart(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getUTCDay()
  // d.getUTCDay() retorna 0 para domingo, 1 para segunda, ..., 6 para sábado.
  // Se for domingo (0), queremos voltar 6 dias.
  // Se for segunda (1), queremos voltar 0 dias.
  // Se for terça (2), queremos voltar 1 dia, etc.
  const diff = d.getUTCDate() - (day === 0 ? 6 : day - 1)
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff))
  monday.setUTCHours(0, 0, 0, 0)
  return monday
}

export const weeklyTargetsService = {
  getCurrentWeekStart,

  async create(input: CreateWeeklyTargetInput) {
    return prisma.weeklyTarget.create({
      data: {
        areaSlug: input.areaSlug,
        activity: input.activity,
        targetCount: input.targetCount,
      },
    })
  },

  async listActive() {
    return prisma.weeklyTarget.findMany({
      where: { active: true },
      include: { area: true },
      orderBy: { areaSlug: 'asc' },
    })
  },

  async listByArea(areaSlug: AreaSlug) {
    return prisma.weeklyTarget.findMany({
      where: { areaSlug, active: true },
      include: { area: true },
    })
  },

  async getWeekProgress(weekStart: Date) {
    const targets = await this.listActive()
    const entries = await prisma.weeklyEntry.findMany({
      where: {
        weekStart,
        weeklyTarget: { active: true },
      },
    })

    return targets.map((target) => {
      const entry = entries.find((e) => e.weeklyTargetId === target.id)
      return {
        ...target,
        completedCount: entry ? entry.completedCount : 0,
        notes: entry ? entry.notes : null,
      }
    })
  },

  async incrementProgress(targetId: number, weekStart: Date, count: number = 1, note?: string) {
    return prisma.weeklyEntry.upsert({
      where: {
        weeklyTargetId_weekStart: {
          weeklyTargetId: targetId,
          weekStart,
        },
      },
      update: {
        completedCount: { increment: count },
        notes: note,
      },
      create: {
        weeklyTargetId: targetId,
        weekStart,
        completedCount: count,
        notes: note,
      },
    })
  },

  async getRemainingForWeek(weekStart: Date) {
    const progress = await this.getWeekProgress(weekStart)
    return progress
      .map((p) => {
        const remaining = Math.max(0, p.targetCount - p.completedCount)
        return {
          id: p.id,
          areaSlug: p.areaSlug,
          activity: p.activity,
          targetCount: p.targetCount,
          completedCount: p.completedCount,
          remaining,
        }
      })
      .filter((p) => p.remaining > 0)
  },

  async getWeekSummary(weekStart: Date) {
    const progress = await this.getWeekProgress(weekStart)
    const items = progress.map((p) => {
      const pct = p.targetCount > 0 ? Math.min(100, Math.round((p.completedCount / p.targetCount) * 100)) : 100
      return {
        areaSlug: p.areaSlug,
        activity: p.activity,
        targetCount: p.targetCount,
        completedCount: p.completedCount,
        percentage: pct,
        status: p.completedCount >= p.targetCount ? 'completed' : p.completedCount > 0 ? 'in_progress' : 'pending',
      }
    })

    const completed = items.filter((i) => i.status === 'completed').length
    const total = items.length

    return {
      weekStart,
      items,
      score: total > 0 ? Math.round((completed / total) * 100) : 0,
      completed,
      total,
    }
  },
}
