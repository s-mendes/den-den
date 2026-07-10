import { UserContext } from '../ai/interpreter'
import { profileService } from '../services/profile.service'
import { goalsService } from '../services/goals.service'
import { projectsService } from '../services/projects.service'
import { contextService } from '../services/context.service'
import { eventsService } from '../services/events.service'
import { weeklyTargetsService, getCurrentWeekStart } from '../services/weekly-targets.service'
import { googleCalendarClient } from '../calendar/google-calendar'
import { analyzeDayEvents } from '../calendar/parser'
import { weeklyScoreService } from '../services/weekly-score.service'

export async function buildUserContext(discordUserId: string, daysAhead: number = 1): Promise<UserContext> {
  const profile = await profileService.getOrCreate(discordUserId)
  const longTermGoals = await profileService.getLongTermGoals(discordUserId)
  const weekStart = getCurrentWeekStart()
  
  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfRange = new Date(now)
  endOfRange.setDate(endOfRange.getDate() + daysAhead - 1)
  endOfRange.setHours(23, 59, 59, 999)

  const [
    goals,
    projects,
    activeContext,
    upcoming,
    weeklyProgress,
    calendarResult,
    weeklyScore,
    weeklyStreak,
  ] = await Promise.all([
    goalsService.listActive(),
    projectsService.listActive(),
    contextService.listActive(),
    eventsService.listUpcoming(24 * daysAhead),
    weeklyTargetsService.getWeekProgress(weekStart),
    googleCalendarClient.getEventsForRange(startOfDay, endOfRange),
    weeklyScoreService.calculateWeekScore(weekStart),
    weeklyScoreService.getStreak(now),
  ])

  const calendarEvents = calendarResult.status === 'ok' ? calendarResult.events : []

  // Deriva os blocos livres dos eventos já buscados — sem segunda chamada à API.
  // Sem agenda confiável, não há blocos livres: dia inteiro "livre" seria mentira.
  const freeBlocks =
    calendarResult.status === 'ok' ? await googleCalendarClient.getFreeBlocks(now, 30, calendarEvents) : []

  const dayAnalysis = analyzeDayEvents(now, calendarEvents)

  return {
    discordUserId,
    profile: {
      name: profile.name,
      currentEmployer: profile.currentEmployer,
      currentRole: profile.currentRole,
      longTermGoals,
    },
    activeGoals: goals.map((g) => ({
      title: g.title,
      currentValue: g.currentValue,
      targetValue: g.targetValue,
      unit: g.unit,
    })),
    activeProjects: projects.map((p) => ({ name: p.name, githubRepo: p.githubRepo })),
    activeContext: activeContext.map((c) => ({ description: c.description, endDate: c.endDate })),
    upcomingEvents: upcoming.map((e) => ({ title: e.title, datetime: e.datetime })),
    weeklyProgress: weeklyProgress.map((wp) => ({
      areaSlug: wp.areaSlug,
      activity: wp.activity,
      targetCount: wp.targetCount,
      completedCount: wp.completedCount,
      notes: wp.notes,
    })),
    calendarStatus: calendarResult.status,
    calendarEvents: calendarEvents.map((ce) => ({
      id: ce.id,
      title: ce.title,
      start: ce.start,
      end: ce.end,
      isAllDay: ce.isAllDay,
      location: ce.location,
      description: ce.description,
    })),
    freeBlocks: freeBlocks.map((fb) => ({
      start: fb.start,
      end: fb.end,
      durationMinutes: fb.durationMinutes,
    })),
    dayAnalysis: {
      isHeavyWorkDay: dayAnalysis.isHeavyWorkDay,
      hasWorkout: dayAnalysis.hasWorkout,
      hasPersonalTime: dayAnalysis.hasPersonalTime,
      totalDurationMinutes: dayAnalysis.totalDurationMinutes,
    },
    weeklyScore: {
      score: weeklyScore.score,
      completed: weeklyScore.completed,
      total: weeklyScore.total,
    },
    weeklyStreak,
  }
}
