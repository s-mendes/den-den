import { z } from 'zod'

const isoDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/))

const baseResponse = { response: z.string().min(1) }

export const createEventIntent = z.object({
  type: z.literal('create_event'),
  data: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    datetime: isoDate,
    location: z.string().optional(),
    contactPerson: z.string().optional(),
    isAllDay: z.boolean().optional(),
  }),
  ...baseResponse,
})

export const createGoalIntent = z.object({
  type: z.literal('create_goal'),
  data: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    targetValue: z.number().optional(),
    unit: z.string().optional(),
    deadline: isoDate.optional(),
    areaSlug: z.enum(['work', 'business', 'content', 'health', 'personal', 'study']).optional(),
  }),
  ...baseResponse,
})

export const logProgressIntent = z.object({
  type: z.literal('log_progress'),
  data: z.object({
    goalTitle: z.string().min(1),
    value: z.number(),
    note: z.string().optional(),
  }),
  ...baseResponse,
})

export const updateProfileIntent = z.object({
  type: z.literal('update_profile'),
  data: z.object({
    name: z.string().optional(),
    currentEmployer: z.string().optional(),
    currentRole: z.string().optional(),
    longTermGoals: z.array(z.string()).optional(),
  }),
  ...baseResponse,
})

export const setContextIntent = z.object({
  type: z.literal('set_context'),
  data: z.object({
    description: z.string().min(1),
    startDate: isoDate,
    endDate: isoDate.optional(),
    impact: z.enum(['pause_reminders', 'delay_deadlines', 'reduce_goals']).optional(),
  }),
  ...baseResponse,
})

export const createProjectIntent = z.object({
  type: z.literal('create_project'),
  data: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    areaSlug: z.enum(['work', 'business', 'content', 'health', 'personal', 'study']).optional(),
    githubRepo: z
      .string()
      .regex(/^[^/\s]+\/[^/\s]+$/, 'githubRepo deve estar no formato "owner/repo"')
      .optional(),
    priority: z.number().int().min(1).max(5).optional(),
  }),
  ...baseResponse,
})

export const createTaskIntent = z.object({
  type: z.literal('create_task'),
  data: z.object({
    title: z.string().min(1),
    areaSlug: z.enum(['work', 'business', 'content', 'health', 'personal', 'study']).optional(),
    projectName: z.string().optional(),
    date: isoDate.optional(),
  }),
  ...baseResponse,
})

export const completeGoalIntent = z.object({
  type: z.literal('complete_goal'),
  data: z.object({
    title: z.string().min(1),
    kind: z.enum(['goal', 'task']).optional(),
  }),
  ...baseResponse,
})

export const queryIntent = z.object({
  type: z.literal('query'),
  data: z.object({
    topic: z.enum(['today', 'week', 'goals', 'projects', 'profile', 'free']),
  }),
  ...baseResponse,
})

export const delayTasksIntent = z.object({
  type: z.literal('delay_tasks'),
  data: z.object({
    days: z.number().int().min(1).max(365),
    scope: z.enum(['all', 'project', 'events']).optional(),
    projectName: z.string().optional(),
  }),
  ...baseResponse,
})

export const chitchatIntent = z.object({
  type: z.literal('chitchat'),
  data: z.record(z.any()).default({}),
  ...baseResponse,
})

export const nightlyCheckinIntent = z.object({
  type: z.literal('nightly_checkin'),
  data: z.object({
    activities: z.array(
      z.object({
        areaSlug: z.enum(['work', 'business', 'content', 'health', 'personal', 'study']),
        description: z.string().min(1),
        durationMinutes: z.number().optional(),
      })
    ),
    overallMood: z.enum(['productive', 'rest', 'mixed', 'tough']).optional(),
  }),
  ...baseResponse,
})

export const intentSchema = z.discriminatedUnion('type', [
  createEventIntent,
  createGoalIntent,
  logProgressIntent,
  completeGoalIntent,
  createTaskIntent,
  updateProfileIntent,
  setContextIntent,
  createProjectIntent,
  queryIntent,
  delayTasksIntent,
  chitchatIntent,
  nightlyCheckinIntent,
])

export type Intent = z.infer<typeof intentSchema>
export type IntentType = Intent['type']

export function parseIntent(raw: string):
  | { ok: true; intent: Intent }
  | { ok: false; reason: 'invalid_json' | 'invalid_shape'; detail: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    return { ok: false, reason: 'invalid_json', detail: String(err) }
  }

  const result = intentSchema.safeParse(parsed)
  if (!result.success) {
    return { ok: false, reason: 'invalid_shape', detail: result.error.message }
  }

  return { ok: true, intent: result.data }
}
