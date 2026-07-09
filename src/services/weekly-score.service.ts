import { weeklyTargetsService, getCurrentWeekStart } from './weekly-targets.service'

export const weeklyScoreService = {
  async calculateWeekScore(weekStart: Date) {
    const progress = await weeklyTargetsService.getWeekProgress(weekStart)
    if (progress.length === 0) {
      return {
        score: 0,
        completed: 0,
        total: 0,
        items: [],
      }
    }

    const items = progress.map((p) => {
      const pct = p.targetCount > 0 ? Math.min(100, Math.round((p.completedCount / p.targetCount) * 100)) : 100
      return {
        areaSlug: p.areaSlug,
        activity: p.activity,
        targetCount: p.targetCount,
        completedCount: p.completedCount,
        percentage: pct,
        status: p.completedCount >= p.targetCount ? ('completed' as const) : p.completedCount > 0 ? ('in_progress' as const) : ('pending' as const),
      }
    })

    const completed = items.filter((i) => i.status === 'completed').length
    const total = items.length
    const score = total > 0 ? Math.round((completed / total) * 100) : 0

    return {
      score,
      completed,
      total,
      items,
    }
  },

  async getStreak(currentDate: Date = new Date(), threshold: number = 70): Promise<number> {
    const currentWeekStart = getCurrentWeekStart(currentDate)
    let streak = 0
    
    // Analisa as últimas 12 semanas
    for (let i = 1; i <= 12; i++) {
      const targetWeekStart = new Date(currentWeekStart)
      targetWeekStart.setUTCDate(targetWeekStart.getUTCDate() - 7 * i)
      
      const summary = await this.calculateWeekScore(targetWeekStart)
      
      if (summary.total === 0) {
        // Se a semana não teve nenhuma meta, ela é ignorada para não quebrar a streak de semanas ativas
        continue
      }

      if (summary.score >= threshold) {
        streak++
      } else {
        break
      }
    }

    return streak
  },
}
