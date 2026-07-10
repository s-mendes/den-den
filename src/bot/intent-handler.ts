import { Intent, UserContext } from '../ai/interpreter'
import { eventsService } from '../services/events.service'
import { goalsService } from '../services/goals.service'
import { projectsService } from '../services/projects.service'
import { profileService } from '../services/profile.service'
import { contextService } from '../services/context.service'
import { weeklyTargetsService } from '../services/weekly-targets.service'
import { delayTasks } from './delay-actions'
import { goalNotFound, projectNotFound, projectWithoutGithub, nightlyNothingLogged } from './replies'
import { AreaSlug } from '@prisma/client'

// Resultado estruturado da ação: quem envia a resposta ao Discord decide entre
// a reply determinística (reflete o que de fato aconteceu) e a response do LLM.
export type IntentResult =
  | { status: 'ok'; reply?: string }
  | { status: 'error'; reply: string }

const OK: IntentResult = { status: 'ok' }

export async function applyIntent(
  intent: Intent,
  discordUserId: string,
  _context: UserContext
): Promise<IntentResult> {
  switch (intent.type) {
    case 'create_event':
      await eventsService.create(intent.data)
      return OK

    case 'create_goal':
      await goalsService.create(intent.data)
      return OK

    case 'log_progress': {
      const goal = await goalsService.findByTitle(intent.data.goalTitle)
      if (!goal) {
        const active = await goalsService.listActive()
        return {
          status: 'error',
          reply: goalNotFound(
            intent.data.goalTitle,
            active.map((g) => g.title)
          ),
        }
      }
      await goalsService.logProgress(goal.id, intent.data.value, intent.data.note)
      return OK
    }

    case 'create_project':
      await projectsService.create(intent.data)
      return OK

    case 'update_profile':
      await profileService.update(discordUserId, intent.data)
      return OK

    case 'set_context':
      await contextService.create(intent.data)
      return OK

    case 'delay_tasks': {
      const outcome = await delayTasks(intent.data.days, intent.data.scope, intent.data.projectName)
      if (outcome.kind === 'project_not_found') {
        return { status: 'error', reply: projectNotFound(outcome.projectName) }
      }
      if (outcome.kind === 'project_without_github') {
        return { status: 'error', reply: projectWithoutGithub(outcome.projectName) }
      }
      return OK
    }

    case 'nightly_checkin': {
      let logged = 0
      for (const act of intent.data.activities) {
        const entry = await weeklyTargetsService.logActivity(act.areaSlug as AreaSlug, act.description)
        if (entry) logged++
      }
      if (intent.data.activities.length > 0 && logged === 0) {
        return { status: 'error', reply: nightlyNothingLogged() }
      }
      return OK
    }

    case 'query':
    case 'chitchat':
      return OK
  }
}
