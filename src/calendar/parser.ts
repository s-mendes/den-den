import { CalendarEvent } from './client'
import { AreaSlug } from '@prisma/client'

export interface AreaTimeSummary {
  areaSlug: AreaSlug
  durationMinutes: number
}

export interface DayAnalysis {
  date: Date
  totalDurationMinutes: number
  areas: AreaTimeSummary[]
  isHeavyWorkDay: boolean
  hasWorkout: boolean
  hasPersonalTime: boolean
}

const AREA_KEYWORDS: Array<{ area: AreaSlug; keywords: string[] }> = [
  {
    area: AreaSlug.work,
    keywords: ['macle', 'work', 'trabalho', 'reunião macle', 'standup', 'daily', 'sprint plan'],
  },
  {
    area: AreaSlug.business,
    keywords: ['zestify', 'excursa', 'business', 'negócio', 'side project', 'pitch', 'reunião comercial'],
  },
  {
    area: AreaSlug.content,
    keywords: ['retro play', 'gameplay', 'gravar', 'gravação', 'edit', 'edição', 'youtube', 'vídeo', 'canal'],
  },
  {
    area: AreaSlug.health,
    keywords: ['treino', 'academia', 'corrida', 'futebol', 'exercício', 'médico', 'dentista', 'consulta', 'saúde', 'pedalar'],
  },
  {
    area: AreaSlug.personal,
    keywords: ['luana', 'jantar', 'almoço', 'lazer', 'descanso', 'filme', 'série', 'folga', 'viagem', 'família'],
  },
  {
    area: AreaSlug.study,
    keywords: ['estudo', 'estudar', 'curso', 'aula', 'livro', 'ler', 'pesquisa', 'faculdade', 'workshop'],
  },
]

export function classifyEventArea(title: string): AreaSlug {
  const cleanTitle = title.toLowerCase()

  for (const mapping of AREA_KEYWORDS) {
    if (mapping.keywords.some((keyword) => cleanTitle.includes(keyword))) {
      return mapping.area
    }
  }

  // Padrão default para eventos de calendário pessoais
  return AreaSlug.personal
}

export function analyzeDayEvents(date: Date, events: CalendarEvent[]): DayAnalysis {
  const activeEvents = events.filter((e) => !e.isAllDay)

  const areasMap = new Map<AreaSlug, number>()
  // Inicializa todas as áreas com 0
  Object.values(AreaSlug).forEach((slug) => {
    areasMap.set(slug as AreaSlug, 0)
  })

  let totalDurationMinutes = 0
  let isHeavyWorkDay = false
  let hasWorkout = false
  let hasPersonalTime = false

  for (const event of activeEvents) {
    const durationMs = event.end.getTime() - event.start.getTime()
    const durationMinutes = Math.round(durationMs / (60 * 1000))
    
    if (durationMinutes <= 0) continue

    const area = classifyEventArea(event.title)
    
    // Acumula
    const current = areasMap.get(area) || 0
    areasMap.set(area, current + durationMinutes)
    totalDurationMinutes += durationMinutes

    if (area === AreaSlug.health) {
      // Se tiver evento de treino/saúde
      const cleanTitle = event.title.toLowerCase()
      if (cleanTitle.includes('treino') || cleanTitle.includes('academia') || cleanTitle.includes('corrida') || cleanTitle.includes('exercício')) {
        hasWorkout = true
      }
    }

    if (area === AreaSlug.personal) {
      hasPersonalTime = true
    }
  }

  // Verifica se o trabalho na Macle/Work excedeu 8h (480 minutos)
  const workMinutes = areasMap.get(AreaSlug.work) || 0
  if (workMinutes >= 480) {
    isHeavyWorkDay = true
  }

  const areas: AreaTimeSummary[] = Array.from(areasMap.entries()).map(([areaSlug, durationMinutes]) => ({
    areaSlug,
    durationMinutes,
  }))

  return {
    date,
    totalDurationMinutes,
    areas,
    isHeavyWorkDay,
    hasWorkout,
    hasPersonalTime,
  }
}
