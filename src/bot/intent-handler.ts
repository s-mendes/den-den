import { Intent } from '../ai/interpreter'
import { eventsService } from '../services/events.service'
import { goalsService } from '../services/goals.service'
import { projectsService } from '../services/projects.service'
import { profileService } from '../services/profile.service'
import { contextService } from '../services/context.service'

export async function applyIntent(intent: Intent, discordUserId: string): Promise<void> {
  switch (intent.type) {
    case 'create_event':
      if (intent.data.title && intent.data.datetime) {
        await eventsService.create({
          title: intent.data.title,
          description: intent.data.description,
          datetime: intent.data.datetime,
          location: intent.data.location,
          contactPerson: intent.data.contactPerson,
          isAllDay: intent.data.isAllDay,
        })
      }
      break

    case 'create_goal':
      if (intent.data.title) {
        await goalsService.create({
          title: intent.data.title,
          description: intent.data.description,
          targetValue: intent.data.targetValue,
          unit: intent.data.unit,
          deadline: intent.data.deadline,
          category: intent.data.category,
        })
      }
      break

    case 'log_progress':
      if (intent.data.goalTitle && typeof intent.data.value === 'number') {
        const goal = await goalsService.findByTitle(intent.data.goalTitle)
        if (goal) {
          await goalsService.logProgress(goal.id, intent.data.value, intent.data.note)
        }
      }
      break

    case 'create_project':
      if (intent.data.name) {
        await projectsService.create({
          name: intent.data.name,
          description: intent.data.description,
          category: intent.data.category,
          githubRepo: intent.data.githubRepo,
          priority: intent.data.priority,
        })
      }
      break

    case 'update_profile':
      await profileService.update(discordUserId, {
        name: intent.data.name,
        currentEmployer: intent.data.currentEmployer,
        currentRole: intent.data.currentRole,
        longTermGoals: intent.data.longTermGoals,
      })
      break

    case 'set_context':
      if (intent.data.description && intent.data.startDate) {
        await contextService.create({
          description: intent.data.description,
          startDate: intent.data.startDate,
          endDate: intent.data.endDate,
          impact: intent.data.impact,
        })
      }
      break

    case 'delay_tasks':
      if (typeof intent.data.days === 'number') {
        await eventsService.delayAll(intent.data.days)
      }
      break

    case 'query':
    case 'chitchat':
      break
  }
}
