import { UserContext } from '../ai/interpreter'
import { profileService } from '../services/profile.service'
import { goalsService } from '../services/goals.service'
import { projectsService } from '../services/projects.service'
import { contextService } from '../services/context.service'
import { eventsService } from '../services/events.service'

export async function buildUserContext(discordUserId: string): Promise<UserContext> {
  const profile = await profileService.getOrCreate(discordUserId)
  const longTermGoals = await profileService.getLongTermGoals(discordUserId)
  const [goals, projects, activeContext, upcoming] = await Promise.all([
    goalsService.listActive(),
    projectsService.listActive(),
    contextService.listActive(),
    eventsService.listUpcoming(24),
  ])

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
  }
}
