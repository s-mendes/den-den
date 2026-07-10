import { Intent, UserContext } from '../ai/interpreter'
import { eventsService } from '../services/events.service'
import { goalsService } from '../services/goals.service'
import { projectsService } from '../services/projects.service'
import { profileService } from '../services/profile.service'
import { contextService } from '../services/context.service'
import { weeklyTargetsService, getCurrentWeekStart } from '../services/weekly-targets.service'
import { delayTasks } from './delay-actions'
import { tasksService } from '../services/tasks.service'
import { areaLabel } from '../services/areas.data'
import {
  goalNotFound,
  goalCompleted,
  taskCreated,
  taskCompleted,
  taskNotFound,
  projectNotFound,
  projectWithoutGithub,
  nightlyNothingLogged,
  formatGoalsQuery,
  formatTodayQuery,
  formatTasksQuery,
  formatWeekQuery,
  formatProjectsQuery,
  formatProfileQuery,
  formatFreeQuery,
} from './replies'
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
  context: UserContext
): Promise<IntentResult> {
  switch (intent.type) {
    case 'create_event':
      await eventsService.create(intent.data)
      return OK

    case 'create_goal':
      await goalsService.create(intent.data)
      return OK

    case 'log_progress': {
      const goal = await goalsService.findBestByTitle(intent.data.goalTitle)
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

    case 'complete_goal': {
      const { title, kind } = intent.data

      // Sem hint, tarefas pontuais de hoje têm prioridade sobre metas de longo prazo
      if (kind !== 'goal') {
        const task = await tasksService.findOpenByTitle(title)
        if (task) {
          await tasksService.complete(task.id)
          return { status: 'ok', reply: taskCompleted(task.title) }
        }
        if (kind === 'task') {
          const open = await tasksService.listOpenForDate()
          return {
            status: 'error',
            reply: taskNotFound(
              title,
              open.map((t) => t.title)
            ),
          }
        }
      }

      const goal = await goalsService.findBestByTitle(title)
      if (!goal) {
        const active = await goalsService.listActive()
        return {
          status: 'error',
          reply: goalNotFound(
            title,
            active.map((g) => g.title)
          ),
        }
      }
      await goalsService.complete(goal.id)
      return {
        status: 'ok',
        reply: goalCompleted(goal.title, {
          currentValue: goal.currentValue,
          targetValue: goal.targetValue,
          unit: goal.unit,
        }),
      }
    }

    case 'create_task': {
      const task = await tasksService.create(intent.data)
      return { status: 'ok', reply: taskCreated(task.title, task.areaSlug) }
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

    // A resposta de query é 100% determinística: montada com dados reais do
    // banco/contexto, nunca com o texto especulativo do LLM.
    case 'query':
      return { status: 'ok', reply: await answerQuery(intent.data, discordUserId, context) }

    case 'chitchat':
      return OK
  }
}

type QueryData = Extract<Intent, { type: 'query' }>['data']

async function answerQuery(
  query: QueryData,
  discordUserId: string,
  context: UserContext
): Promise<string> {
  switch (query.topic) {
    case 'goals': {
      const [goals, weekly] = await Promise.all([
        goalsService.listActive(),
        weeklyTargetsService.getWeekProgress(getCurrentWeekStart()),
      ])
      return formatGoalsQuery(goals, weekly)
    }

    case 'today': {
      const [dbEvents, tasks] = await Promise.all([
        eventsService.listToday(),
        tasksService.listOpenForDate(),
      ])
      return formatTodayQuery({
        calendarStatus: context.calendarStatus,
        calendarEvents: context.calendarEvents ?? [],
        dbEvents,
        tasks,
      })
    }

    case 'week': {
      const weekly = await weeklyTargetsService.getWeekProgress(getCurrentWeekStart())
      return formatWeekQuery(weekly, context.weeklyScore, context.weeklyStreak)
    }

    case 'projects':
      return formatProjectsQuery(await projectsService.listActive())

    case 'profile': {
      const [profile, longTermGoals] = await Promise.all([
        profileService.getOrCreate(discordUserId),
        profileService.getLongTermGoals(discordUserId),
      ])
      return formatProfileQuery(profile, longTermGoals)
    }

    case 'free':
      return formatFreeQuery(context.freeBlocks ?? [], context.calendarStatus)

    case 'tasks': {
      let tasks = await tasksService.listOpenForDate()
      const labels: string[] = []

      if (query.areaSlug) {
        tasks = tasks.filter((t) => t.areaSlug === query.areaSlug)
        labels.push(areaLabel(query.areaSlug))
      }
      if (query.projectName) {
        const project = await projectsService.findByName(query.projectName)
        if (project) {
          tasks = tasks.filter((t) => t.projectId === project.id)
          labels.push(project.name)
        }
        // Projeto não encontrado: mantém o resultado sem esse filtro em vez de responder vazio enganoso
      }

      return formatTasksQuery(tasks, labels.length > 0 ? labels.join(' / ') : undefined)
    }
  }
}
