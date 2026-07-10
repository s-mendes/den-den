import { prisma } from './db'
import { AreaSlug } from '@prisma/client'
import { formatDateForPrompt } from '../ai/time'

export interface CreateWeeklyTargetInput {
  areaSlug: AreaSlug
  activity: string
  targetCount: number
}

// A semana é definida pelo calendário LOCAL do usuário (APP_TIME_ZONE): domingo à
// noite em São Paulo já é segunda em UTC, mas ainda pertence à semana corrente.
// A chave retornada continua sendo a meia-noite UTC da segunda-feira local, para
// manter compatibilidade com os registros existentes de WeeklyEntry.
export function getCurrentWeekStart(date: Date = new Date()): Date {
  const [year, month, day] = formatDateForPrompt(date).split('-').map(Number)
  const localDayUtc = Date.UTC(year, month - 1, day)
  const weekday = new Date(localDayUtc).getUTCDay()
  // 0 = domingo (volta 6 dias), 1 = segunda (volta 0), 2 = terça (volta 1)...
  const diffDays = weekday === 0 ? 6 : weekday - 1
  return new Date(localDayUtc - diffDays * 24 * 60 * 60 * 1000)
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

  async logActivity(areaSlug: AreaSlug, description: string, date: Date = new Date()) {
    const weekStart = getCurrentWeekStart(date)
    const targets = await this.listByArea(areaSlug)
    
    if (targets.length === 0) {
      // Se não há metas ativas nessa área, não há o que registrar
      return null
    }

    let matchedTarget = targets[0]
    const descLower = description.toLowerCase()
    let maxMatches = 0
    
    // Tenta encontrar a meta com mais palavras-chaves coincidentes (palavras > 3 letras)
    for (const target of targets) {
      const actWords = target.activity.toLowerCase().split(/\s+/).filter(w => w.length > 3)
      const matches = actWords.filter(word => descLower.includes(word)).length
      if (matches > maxMatches) {
        maxMatches = matches
        matchedTarget = target
      }
    }

    return this.incrementProgress(matchedTarget.id, weekStart, 1, description)
  },
}
