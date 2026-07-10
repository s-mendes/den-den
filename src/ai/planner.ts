import { AIProvider } from './provider'
import { PLANNER_SYSTEM_PROMPT } from './prompts'
import { UserContext } from './interpreter'
import { formatDateTimeForPrompt, formatTimeForPrompt } from './time'

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
          content: `Crie o balanço semanal e o plano da próxima semana baseando-se nas regras abaixo:

1. Monte uma tabela Markdown clara mostrando as metas semanais do usuário por área de vida:
   - Colunas: Área | Meta | Feito | Status
   - Use emojis nas áreas e indicadores visuais no Status (ex: ✅ para cumprida, ⚠️ para faltou N, ❌ para zerada).
2. Exiba o Score Semanal Geral em destaque (ex: "Score: 7/9 (78%) — Semana sólida! 🎉") usando os dados do contexto.
3. Se houver dados de Streak de semanas seguidas acima de 70% no contexto, celebre essa conquista em destaque (ex: "🔥 Streak: 3 semanas seguidas acima de 70%").
4. Tom de consistência: celebre o esforço, lembre-se que 70% é excelente, nunca cobre 100% ou perfeição. Reaja de forma acolhedora a semanas difíceis.
5. Analise a agenda dos próximos dias/semana no Google Calendar para fazer o Preview da próxima semana, recomendando em quais dias alocar os blocos livres de side projects ou metas.
6. Caso haja reuniões ou dias com agenda pesada no calendário da próxima semana, recomende explicitamente não planejar nada complexo para a noite desses dias.`,
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
    const lines: string[] = [`ESTADO ATUAL (agora: ${formatDateTimeForPrompt(now)})`]

    if (ctx.profile) {
      const p = ctx.profile
      if (p.name) lines.push(`Nome: ${p.name}`)
      if (p.currentEmployer) lines.push(`Empresa: ${p.currentEmployer}`)
      if (p.currentRole) lines.push(`Cargo: ${p.currentRole}`)
      if (p.longTermGoals?.length)
        lines.push(`Sonhos: ${p.longTermGoals.join('; ')}`)
    }

    if (ctx.calendarEvents?.length) {
      lines.push('\nAGENDA DO DIA (Google Calendar):')
      for (const ce of ctx.calendarEvents) {
        const allDayStr = ce.isAllDay
          ? '[Dia Inteiro]'
          : `[${formatTimeForPrompt(ce.start)} - ${formatTimeForPrompt(ce.end)}]`
        lines.push(`- ${allDayStr} - ${ce.title}${ce.location ? ` (${ce.location})` : ''}`)
      }
    } else {
      lines.push('\nAGENDA DO DIA: Sem eventos agendados hoje.')
    }

    if (ctx.freeBlocks?.length) {
      lines.push('\nBLOCOS LIVRES OPERACIONAIS:')
      for (const fb of ctx.freeBlocks) {
        lines.push(
          `- ${formatTimeForPrompt(fb.start)} às ${formatTimeForPrompt(fb.end)} (${fb.durationMinutes} minutos livres)`
        )
      }
    }

    if (ctx.dayAnalysis) {
      lines.push('\nANÁLISE DE CARGA DO DIA:')
      lines.push(`- Dia pesado de trabalho fixo (>8h)? ${ctx.dayAnalysis.isHeavyWorkDay ? 'SIM' : 'NÃO'}`)
      lines.push(`- Teve atividade física/treino hoje? ${ctx.dayAnalysis.hasWorkout ? 'SIM' : 'NÃO'}`)
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

    if (ctx.weeklyProgress?.length) {
      lines.push('\nMETAS SEMANAIS POR ÁREA:')
      for (const wp of ctx.weeklyProgress) {
        const pct = wp.targetCount > 0 ? Math.round((wp.completedCount / wp.targetCount) * 100) : 100
        const notesStr = wp.notes ? ` (Notas: ${wp.notes})` : ''
        lines.push(
          `- [${wp.areaSlug.toUpperCase()}] ${wp.activity}: ${wp.completedCount}/${wp.targetCount} (${pct}%)${notesStr}`
        )
      }
    }

    return lines.join('\n')
  }
}
