import { AIProvider } from './provider'
import { INTERPRETER_SYSTEM_PROMPT } from './prompts'
import { Intent, parseIntent } from './schemas'
import { formatDateForPrompt, formatDateTimeForPrompt } from './time'

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
}

export class Interpreter {
  constructor(private ai: AIProvider) {}

  async interpret(message: string, context: UserContext): Promise<Intent> {
    const contextBlock = this.buildContextBlock(context)

    const response = await this.ai.chat(
      [
        { role: 'system', content: INTERPRETER_SYSTEM_PROMPT },
        { role: 'system', content: contextBlock },
        { role: 'user', content: message },
      ],
      { jsonMode: true, temperature: 0.4 }
    )

    const result = parseIntent(response.text)
    if (result.ok) return result.intent

    console.warn(
      `[interpreter] resposta do LLM rejeitada (${result.reason}): ${result.detail}\nraw: ${response.text}`
    )

    return {
      type: 'chitchat',
      data: {},
      response:
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

    return lines.join('\n')
  }
}
