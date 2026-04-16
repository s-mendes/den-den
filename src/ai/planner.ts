import { AIProvider } from './provider'
import { PLANNER_SYSTEM_PROMPT } from './prompts'
import { UserContext } from './interpreter'

export class Planner {
  constructor(private ai: AIProvider) {}

  async today(context: UserContext, extras?: { staleProjects?: string[] }): Promise<string> {
    const ctxBlock = this.buildContextBlock(context, extras)
    const response = await this.ai.chat(
      [
        { role: 'system', content: PLANNER_SYSTEM_PROMPT },
        { role: 'system', content: ctxBlock },
        {
          role: 'user',
          content: 'Me dê o briefing do meu dia de hoje, na língua do meu perfil/contexto.',
        },
      ],
      { temperature: 0.7 }
    )
    return response.text
  }

  async weekly(context: UserContext): Promise<string> {
    const ctxBlock = this.buildContextBlock(context)
    const response = await this.ai.chat(
      [
        { role: 'system', content: PLANNER_SYSTEM_PROMPT },
        { role: 'system', content: ctxBlock },
        {
          role: 'user',
          content:
            'Faça o resumo da semana passada e o plano da próxima semana, destacando o que travou e o que avançou.',
        },
      ],
      { temperature: 0.7 }
    )
    return response.text
  }

  async nightlyCheck(context: UserContext, commitsToday: number): Promise<string> {
    const ctxBlock = this.buildContextBlock(context)
    const prompt =
      commitsToday > 0
        ? `Hoje fiz ${commitsToday} commits nos side projects. Me parabenize e reforce o progresso rumo aos sonhos.`
        : `Hoje não fiz nenhum commit nos side projects. Me lembre dos sonhos e me motive pra amanhã ser diferente — sem ser chato.`
    const response = await this.ai.chat(
      [
        { role: 'system', content: PLANNER_SYSTEM_PROMPT },
        { role: 'system', content: ctxBlock },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.8 }
    )
    return response.text
  }

  private buildContextBlock(ctx: UserContext, extras?: { staleProjects?: string[] }): string {
    const now = new Date()
    const lines: string[] = [`ESTADO ATUAL (agora: ${now.toISOString()})`]

    if (ctx.profile) {
      const p = ctx.profile
      if (p.name) lines.push(`Nome: ${p.name}`)
      if (p.currentEmployer) lines.push(`Empresa: ${p.currentEmployer}`)
      if (p.currentRole) lines.push(`Cargo: ${p.currentRole}`)
      if (p.longTermGoals?.length)
        lines.push(`Sonhos: ${p.longTermGoals.join('; ')}`)
    }

    if (ctx.upcomingEvents?.length) {
      lines.push('\nAGENDA:')
      for (const e of ctx.upcomingEvents) {
        lines.push(`- ${e.datetime.toISOString()}: ${e.title}`)
      }
    } else {
      lines.push('\nAGENDA: sem eventos nas próximas horas.')
    }

    if (ctx.activeGoals?.length) {
      lines.push('\nMETAS:')
      for (const g of ctx.activeGoals) {
        const pct =
          g.targetValue && g.targetValue > 0
            ? Math.round((g.currentValue / g.targetValue) * 100)
            : null
        const pctStr = pct !== null ? ` (${pct}%)` : ''
        lines.push(
          `- ${g.title}: ${g.currentValue}${g.targetValue ? `/${g.targetValue}` : ''}${g.unit ? ` ${g.unit}` : ''}${pctStr}`
        )
      }
    }

    if (ctx.activeProjects?.length) {
      lines.push('\nPROJETOS:')
      for (const p of ctx.activeProjects) {
        lines.push(`- ${p.name}${p.githubRepo ? ` (${p.githubRepo})` : ''}`)
      }
    }

    if (extras?.staleProjects?.length) {
      lines.push(`\nPROJETOS SEM COMMITS RECENTES (>3 dias): ${extras.staleProjects.join(', ')}`)
    }

    if (ctx.activeContext?.length) {
      lines.push('\nCONTEXTO TEMPORÁRIO:')
      for (const c of ctx.activeContext) {
        lines.push(`- ${c.description}`)
      }
    }

    return lines.join('\n')
  }
}
