import { Intent } from '../ai/interpreter'
import { eventsService } from '../services/events.service'
import { goalsService } from '../services/goals.service'
import { projectsService } from '../services/projects.service'
import { profileService } from '../services/profile.service'
import { contextService } from '../services/context.service'
import { weeklyTargetsService } from '../services/weekly-targets.service'
import { delayTasks } from './delay-actions'
import { AreaSlug } from '@prisma/client'

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

    case 'delay_tasks': {
      const outcome = await delayTasks(intent.data.days, intent.data.scope, intent.data.projectName)
      if (outcome.kind === 'project_not_found' || outcome.kind === 'project_without_github') {
        console.warn(`[intent-handler] delay_tasks sem efeito: ${outcome.kind}`, outcome)
      }
      return
    }

    case 'nightly_checkin':
      for (const act of intent.data.activities) {
        await weeklyTargetsService.logActivity(act.areaSlug as AreaSlug, act.description)
      }
      return

    case 'query':
    case 'chitchat':
      return
  }
}
