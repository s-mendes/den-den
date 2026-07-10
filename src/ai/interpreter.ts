import { AIProvider } from './provider'
import { INTERPRETER_SYSTEM_PROMPT } from './prompts'
import { Intent, parseIntent } from './schemas'
import { formatDateForPrompt, formatDateTimeForPrompt, formatTimeForPrompt } from './time'

export type { Intent, IntentType } from './schemas'

export interface UserContext {
  discordUserId: string
  profile?: {
    name?: string | null
    currentEmployer?: string | null
    currentRole?: string | null
    longTermGoals?: string[]
  }
  activeGoals?: Array<{
    title: string
    currentValue: number
    targetValue?: number | null
    unit?: string | null
  }>
  activeProjects?: Array<{ name: string; githubRepo?: string | null }>
  activeContext?: Array<{ description: string; endDate?: Date | null }>
  upcomingEvents?: Array<{ title: string; datetime: Date }>
  weeklyProgress?: Array<{
    areaSlug: string
    activity: string
    targetCount: number
    completedCount: number
    notes?: string | null
  }>
  calendarEvents?: Array<{
    id: string
    title: string
    start: Date
    end: Date
    isAllDay: boolean
    location?: string | null
    description?: string | null
  }>
  freeBlocks?: Array<{
    start: Date
    end: Date
    durationMinutes: number
  }>
  dayAnalysis?: {
    isHeavyWorkDay: boolean
    hasWorkout: boolean
    hasPersonalTime: boolean
    totalDurationMinutes: number
  }
  weeklyScore?: {
    score: number
    completed: number
    total: number
  }
  weeklyStreak?: number
}

export class Interpreter {
  constructor(private ai: AIProvider) {}

  async interpret(
    message: string,
    context: UserContext,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<Intent> {
    const contextBlock = this.buildContextBlock(context)

    const response = await this.ai.chat(
      [
        { role: 'system', content: INTERPRETER_SYSTEM_PROMPT },
        { role: 'system', content: contextBlock },
        ...history,
        { role: 'user', content: message },
      ],
      { jsonMode: true, temperature: 0.4 }
    )

    const result = parseIntent(response.text)
    if (result.ok) return result.intent

    console.warn(
      `[interpreter] resposta do LLM rejeitada (${result.reason}): ${result.detail}\nraw: ${response.text}`
    )

    let recoveryResponse: string | undefined
    try {
      const parsed = JSON.parse(response.text)
      if (parsed && typeof parsed === 'object' && 'response' in parsed && typeof parsed.response === 'string') {
        recoveryResponse = parsed.response
      }
    } catch {
      // ignore
    }

    return {
      type: 'chitchat',
      data: {},
      response:
        recoveryResponse ||
        'Hmm, não consegui entender direito. Pode reformular? Me conta o que você quer fazer.',
    }
  }

  private buildContextBlock(ctx: UserContext): string {
    const now = new Date()
    const lines: string[] = [`CONTEXTO DO USUÁRIO (agora: ${formatDateTimeForPrompt(now)})`]

    if (ctx.profile) {
      const p = ctx.profile
      lines.push('\n-- PERFIL --')
      if (p.name) lines.push(`Nome: ${p.name}`)
      if (p.currentEmployer) lines.push(`Empresa atual: ${p.currentEmployer}`)
      if (p.currentRole) lines.push(`Cargo: ${p.currentRole}`)
      if (p.longTermGoals?.length)
        lines.push(`Sonhos de longo prazo: ${p.longTermGoals.join('; ')}`)
    }

    if (ctx.activeGoals?.length) {
      lines.push('\n-- METAS ATIVAS --')
      for (const g of ctx.activeGoals) {
        const target = g.targetValue ? ` / ${g.targetValue}` : ''
        const unit = g.unit ? ` ${g.unit}` : ''
        lines.push(`- ${g.title}: ${g.currentValue}${target}${unit}`)
      }
    }

    if (ctx.activeProjects?.length) {
      lines.push('\n-- PROJETOS ATIVOS --')
      for (const p of ctx.activeProjects) {
        lines.push(`- ${p.name}${p.githubRepo ? ` (${p.githubRepo})` : ''}`)
      }
    }

    if (ctx.activeContext?.length) {
      lines.push('\n-- CONTEXTO TEMPORÁRIO ATIVO --')
      for (const c of ctx.activeContext) {
        const until = c.endDate ? ` (até ${formatDateForPrompt(c.endDate)})` : ''
        lines.push(`- ${c.description}${until}`)
      }
    }

    if (ctx.upcomingEvents?.length) {
      lines.push('\n-- PRÓXIMOS EVENTOS --')
      for (const e of ctx.upcomingEvents) {
        lines.push(`- ${formatDateTimeForPrompt(e.datetime)}: ${e.title}`)
      }
    }

    if (ctx.calendarEvents?.length) {
      lines.push('\n-- AGENDA DE HOJE (Google Calendar) --')
      for (const ce of ctx.calendarEvents) {
        const allDayStr = ce.isAllDay
          ? '[Dia Inteiro]'
          : `[${formatTimeForPrompt(ce.start)} - ${formatTimeForPrompt(ce.end)}]`
        lines.push(`- ${allDayStr} - ${ce.title}${ce.location ? ` (${ce.location})` : ''}`)
      }
    }

    if (ctx.freeBlocks?.length) {
      lines.push('\n-- BLOCOS LIVRES OPERACIONAIS DE HOJE --')
      for (const fb of ctx.freeBlocks) {
        lines.push(
          `- ${formatTimeForPrompt(fb.start)} às ${formatTimeForPrompt(fb.end)} (${fb.durationMinutes} minutos livres)`
        )
      }
    }

    if (ctx.dayAnalysis) {
      lines.push('\n-- ANÁLISE DE CARGA DE HOJE --')
      lines.push(`- Expediente de trabalho pesado (>8h)? ${ctx.dayAnalysis.isHeavyWorkDay ? 'SIM' : 'NÃO'}`)
      lines.push(`- Praticou atividade física/treino hoje? ${ctx.dayAnalysis.hasWorkout ? 'SIM' : 'NÃO'}`)
    }

    if (ctx.weeklyProgress?.length) {
      lines.push('\n-- METAS SEMANAIS POR ÁREA --')
      for (const wp of ctx.weeklyProgress) {
        const notesStr = wp.notes ? ` (${wp.notes})` : ''
        lines.push(`- [${wp.areaSlug.toUpperCase()}] ${wp.activity}: ${wp.completedCount} / ${wp.targetCount}${notesStr}`)
      }
      if (ctx.weeklyScore) {
        lines.push(`Score Semanal Atual: ${ctx.weeklyScore.completed} / ${ctx.weeklyScore.total} (${ctx.weeklyScore.score}%)`)
      }
      if (typeof ctx.weeklyStreak === 'number') {
        lines.push(`Streak Semanal (semanas seguidas acima de 70%): ${ctx.weeklyStreak}`)
      }
    }

    return lines.join('\n')
  }
}
