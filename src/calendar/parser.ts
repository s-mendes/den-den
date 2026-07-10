import { CalendarEvent, TimeBlock } from './client'
import { AreaSlug } from '@prisma/client'

// Calcula os intervalos livres dentro de uma janela operacional a partir de
// eventos já buscados. Eventos de dia inteiro não ocupam tempo; sobreposições
// são mescladas; eventos fora da janela são clampados/descartados.
export function computeFreeBlocks(
  events: CalendarEvent[],
  windowStart: Date,
  windowEnd: Date,
  minMinutes: number = 30
): TimeBlock[] {
  if (windowEnd.getTime() <= windowStart.getTime()) return []

  const busyEvents = events
    .filter((e) => !e.isAllDay)
    .map((e) => ({
      start: Math.max(windowStart.getTime(), e.start.getTime()),
      end: Math.min(windowEnd.getTime(), e.end.getTime()),
    }))
    .filter((e) => e.start < e.end)
    .sort((a, b) => a.start - b.start)

  const mergedBusy: Array<{ start: number; end: number }> = []
  for (const current of busyEvents) {
    const last = mergedBusy[mergedBusy.length - 1]
    if (last && current.start <= last.end) {
      last.end = Math.max(last.end, current.end)
    } else {
      mergedBusy.push({ ...current })
    }
  }

  const freeBlocks: TimeBlock[] = []
  let currentStart = windowStart.getTime()

  const pushIfLongEnough = (start: number, end: number) => {
    if (end - start >= minMinutes * 60 * 1000) {
      freeBlocks.push({
        start: new Date(start),
        end: new Date(end),
        durationMinutes: Math.round((end - start) / (60 * 1000)),
      })
    }
  }

  for (const busy of mergedBusy) {
    pushIfLongEnough(currentStart, busy.start)
    currentStart = Math.max(currentStart, busy.end)
  }
  pushIfLongEnough(currentStart, windowEnd.getTime())

  return freeBlocks
}

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
