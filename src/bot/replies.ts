// Respostas determinísticas do Den Den para resultados de ação e consultas.
// Funções puras: recebem dados prontos, nunca tocam no banco.

import { formatTimeForPrompt } from '../ai/time'
import { areaLabel } from '../services/areas.data'

const CALENDAR_UNAVAILABLE =
  '⚠️ Não consegui acessar seu Google Calendar agora — a agenda abaixo pode estar incompleta.'
const CALENDAR_NOT_CONFIGURED = '⚠️ Google Calendar não configurado — não enxergo sua agenda externa.'

function calendarWarning(status?: 'ok' | 'not_configured' | 'error'): string | null {
  if (status === 'error') return CALENDAR_UNAVAILABLE
  if (status === 'not_configured') return CALENDAR_NOT_CONFIGURED
  return null
}

export function goalNotFound(title: string, activeTitles: string[]): string {
  if (activeTitles.length === 0) {
    return `Gururururu... não encontrei a meta *${title}* — na verdade, você não tem nenhuma meta ativa registrada por aqui, capitão. Quer criar uma?`
  }
  const list = activeTitles.map((t) => `• ${t}`).join('\n')
  return `Gururururu... não encontrei nenhuma meta chamada *${title}*, capitão. As metas ativas no meu registro são:\n${list}\nQual delas você quis dizer?`
}

export function goalCompleted(
  title: string,
  progress?: { currentValue: number; targetValue?: number | null; unit?: string | null }
): string {
  const progressStr =
    progress?.targetValue != null
      ? ` Fechou em ${progress.currentValue}/${progress.targetValue}${progress.unit ? ` ${progress.unit}` : ''}.`
      : ''
  return `🎯 Meta *${title}* concluída, capitão!${progressStr} Mais um tesouro no baú — orgulho de nakama!`
}

export function taskCreated(title: string, areaSlug?: string | null): string {
  const area = areaSlug ? ` em ${areaLabel(areaSlug)}` : ''
  return `✅ Tarefa *${title}* anotada pra hoje${area}, capitão! Tá no meu registro — te cobro se precisar.`
}

export function taskCompleted(title: string): string {
  return `⚓ Tarefa *${title}* concluída, capitão! Rota limpa — bora pro próximo objetivo (ou pro descanso, que também é progresso).`
}

export function taskNotFound(title: string, openTitles: string[]): string {
  if (openTitles.length === 0) {
    return `Gururururu... não encontrei a tarefa *${title}* — você não tem nenhuma tarefa pendente registrada pra hoje, capitão.`
  }
  const list = openTitles.map((t) => `• ${t}`).join('\n')
  return `Gururururu... não encontrei a tarefa *${title}*, capitão. As pendentes de hoje são:\n${list}\nQual delas você quis dizer?`
}

export function projectNotFound(name?: string): string {
  if (!name) {
    return 'Kachak! Preciso saber qual projeto você quer ajustar, capitão. Me diz o nome dele?'
  }
  return `Kachak! Não encontrei nenhum projeto chamado *${name}* no meu registro, capitão. Nada foi alterado. Confere o nome pra mim?`
}

export function projectWithoutGithub(name: string): string {
  return `O projeto *${name}* existe, mas não tem repositório GitHub vinculado — então não consigo mexer nos milestones dele, capitão. Nada foi alterado.`
}

export function checkinLogged(count: number): string {
  return `📝 Registrei ${count} atividade${count === 1 ? '' : 's'} nas suas metas semanais, capitão!`
}

export function nightlyNothingLogged(): string {
  return 'Anotei seu relato, capitão, mas nenhuma das atividades bateu com uma meta semanal ativa — então nada foi registrado no progresso. Se quiser, crie metas semanais pra essas áreas!'
}

// ---- Formatters de query: a resposta é montada 100% com dados do banco ----

export function formatGoalsQuery(
  goals: Array<{ title: string; currentValue: number; targetValue?: number | null; unit?: string | null }>,
  weekly: Array<{ areaSlug: string; activity: string; completedCount: number; targetCount: number }>
): string {
  const lines: string[] = ['🎯 **Metas ativas**']
  if (goals.length === 0) {
    lines.push('Nenhuma meta ativa ainda — quer criar uma?')
  } else {
    for (const g of goals) {
      const target = g.targetValue != null ? `/${g.targetValue}` : ''
      const unit = g.unit ? ` ${g.unit}` : ''
      lines.push(`• ${g.title}: ${g.currentValue}${target}${unit}`)
    }
  }

  lines.push('', '📅 **Metas semanais**')
  if (weekly.length === 0) {
    lines.push('Nenhuma meta semanal configurada.')
  } else {
    for (const w of weekly) {
      lines.push(`• [${w.areaSlug}] ${w.activity}: ${w.completedCount}/${w.targetCount}`)
    }
  }

  return lines.join('\n')
}

export function formatTodayQuery(args: {
  calendarStatus?: 'ok' | 'not_configured' | 'error'
  calendarEvents: Array<{ title: string; start: Date; end: Date; isAllDay: boolean; location?: string | null }>
  dbEvents: Array<{ title: string; datetime: Date; location?: string | null }>
  tasks: Array<{ title: string; areaSlug?: string | null }>
}): string {
  const lines: string[] = []
  const warning = calendarWarning(args.calendarStatus)
  if (warning) lines.push(warning, '')

  lines.push('📅 **Agenda de hoje**')
  if (args.calendarEvents.length === 0) {
    lines.push(warning ? 'Agenda externa desconhecida.' : 'Sem eventos no calendário hoje.')
  } else {
    for (const e of args.calendarEvents) {
      const when = e.isAllDay
        ? '[Dia Inteiro]'
        : `[${formatTimeForPrompt(e.start)} - ${formatTimeForPrompt(e.end)}]`
      lines.push(`• ${when} ${e.title}${e.location ? ` (${e.location})` : ''}`)
    }
  }

  if (args.dbEvents.length > 0) {
    lines.push('', '🔔 **Eventos registrados comigo**')
    for (const e of args.dbEvents) {
      lines.push(`• ${formatTimeForPrompt(e.datetime)} — ${e.title}${e.location ? ` (${e.location})` : ''}`)
    }
  }

  lines.push('', '✅ **Tarefas pendentes de hoje**')
  if (args.tasks.length === 0) {
    lines.push('Nenhuma tarefa pendente pra hoje.')
  } else {
    for (const t of args.tasks) {
      lines.push(`• ${t.title}${t.areaSlug ? ` (${areaLabel(t.areaSlug)})` : ''}`)
    }
  }

  return lines.join('\n')
}

export function formatTasksQuery(
  tasks: Array<{ title: string; areaSlug?: string | null }>,
  filterLabel?: string
): string {
  const scope = filterLabel ? ` de ${filterLabel}` : ''
  if (tasks.length === 0) {
    return `✅ Nenhuma tarefa pendente${scope} pra hoje, capitão!`
  }
  const lines = [`✅ **Tarefas pendentes${scope}**`]
  for (const t of tasks) {
    lines.push(`• ${t.title}${t.areaSlug ? ` (${areaLabel(t.areaSlug)})` : ''}`)
  }
  return lines.join('\n')
}

export function formatWeekQuery(
  weekly: Array<{ areaSlug: string; activity: string; completedCount: number; targetCount: number }>,
  score?: { score: number; completed: number; total: number },
  streak?: number
): string {
  const lines: string[] = ['📊 **Sua semana**']
  if (weekly.length === 0) {
    lines.push('Nenhuma meta semanal configurada ainda — quer definir algumas?')
  } else {
    for (const w of weekly) {
      const pct = w.targetCount > 0 ? Math.round((w.completedCount / w.targetCount) * 100) : 100
      lines.push(`• [${w.areaSlug}] ${w.activity}: ${w.completedCount}/${w.targetCount} (${pct}%)`)
    }
  }
  if (score) {
    lines.push('', `Score: ${score.completed}/${score.total} (${score.score}%)`)
  }
  if (typeof streak === 'number' && streak > 0) {
    lines.push(`🔥 Streak: ${streak} semana${streak > 1 ? 's' : ''} seguidas acima de 70%`)
  }
  lines.push('', 'Lembre-se: 70% já é uma semana excelente, capitão.')
  return lines.join('\n')
}

export function formatProjectsQuery(
  projects: Array<{ name: string; githubRepo?: string | null }>
): string {
  if (projects.length === 0) {
    return '🚀 Nenhum projeto ativo registrado por aqui, capitão. Quer cadastrar um?'
  }
  const lines = ['🚀 **Projetos ativos**']
  for (const p of projects) {
    lines.push(`• ${p.name}${p.githubRepo ? ` (${p.githubRepo})` : ''}`)
  }
  return lines.join('\n')
}

export function formatProfileQuery(
  profile: { name?: string | null; currentEmployer?: string | null; currentRole?: string | null },
  longTermGoals: string[]
): string {
  const lines: string[] = ['🐚 **Seu registro no meu caderno**']
  if (profile.name) lines.push(`• Nome: ${profile.name}`)
  if (profile.currentEmployer) lines.push(`• Empresa: ${profile.currentEmployer}`)
  if (profile.currentRole) lines.push(`• Cargo: ${profile.currentRole}`)
  if (longTermGoals.length > 0) {
    lines.push('', '🌟 **Sonhos de longo prazo**')
    for (const g of longTermGoals) lines.push(`• ${g}`)
  }
  if (lines.length === 1) {
    lines.push('Ainda não sei quase nada sobre você — me conta seu nome, onde trabalha, seus sonhos!')
  }
  return lines.join('\n')
}

export function formatFreeQuery(
  freeBlocks: Array<{ start: Date; end: Date; durationMinutes: number }>,
  calendarStatus?: 'ok' | 'not_configured' | 'error'
): string {
  const warning = calendarWarning(calendarStatus)
  if (warning) {
    return `${warning}\nSem agenda confiável, não consigo calcular seus blocos livres agora.`
  }
  if (freeBlocks.length === 0) {
    return '⏱️ Nenhum bloco livre de 30min+ sobrou no horário operacional de hoje, capitão. Dia cheio — cuidado com a sobrecarga!'
  }
  const lines = ['⏱️ **Blocos livres de hoje**']
  for (const fb of freeBlocks) {
    lines.push(
      `• ${formatTimeForPrompt(fb.start)} às ${formatTimeForPrompt(fb.end)} (${fb.durationMinutes} minutos)`
    )
  }
  return lines.join('\n')
}
