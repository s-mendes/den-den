import { Intent } from '../ai/interpreter'
import { eventsService } from '../services/events.service'
import { goalsService } from '../services/goals.service'
import { projectsService } from '../services/projects.service'
import { profileService } from '../services/profile.service'
import { contextService } from '../services/context.service'

export async function applyIntent(intent: Intent, discordUserId: string): Promise<void> {
  switch (intent.type) {
    case 'create_event':
      await eventsService.create(intent.data)
      return

    case 'create_goal':
      await goalsService.create(intent.data)
      return

    case 'log_progress': {
      const goal = await goalsService.findByTitle(intent.data.goalTitle)
      if (goal) await goalsService.logProgress(goal.id, intent.data.value, intent.data.note)
      return
    }

    case 'create_project':
      await projectsService.create(intent.data)
      return

    case 'update_profile':
      await profileService.update(discordUserId, intent.data)
      return

    case 'set_context':
      await contextService.create(intent.data)
      return

    case 'delay_tasks':
      await eventsService.delayAll(intent.data.days)
      return

    case 'query':
    case 'chitchat':
      return
  }
}
