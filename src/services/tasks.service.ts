import { prisma } from './db'
import { AreaSlug } from '@prisma/client'
import { projectsService } from './projects.service'
import { pickBestByTitle } from './title-match'
import { getLocalDayStart } from '../ai/time'

export interface CreateTaskInput {
  title: string
  areaSlug?: AreaSlug
  projectName?: string
  date?: Date | string
}

// Data vinda do LLM pode ser "YYYY-MM-DD" puro: nesse caso o dia já é o
// pretendido — parsear como Date o jogaria pro dia anterior no fuso local.
function resolveDayKey(date?: Date | string): Date {
  if (typeof date === 'string') {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
    if (dateOnly) {
      const [, year, month, day] = dateOnly
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
    }
    return getLocalDayStart(new Date(date))
  }
  return getLocalDayStart(date ?? new Date())
}

export const tasksService = {
  async create(input: CreateTaskInput) {
    const project = input.projectName ? await projectsService.findByName(input.projectName) : null
    return prisma.task.create({
      data: {
        title: input.title,
        areaSlug: input.areaSlug,
        projectId: project?.id,
        date: resolveDayKey(input.date),
      },
    })
  },

  async listForDate(date: Date = new Date()) {
    return prisma.task.findMany({
      where: { date: resolveDayKey(date) },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    })
  },

  async listOpenForDate(date: Date = new Date()) {
    return prisma.task.findMany({
      where: { date: resolveDayKey(date), status: 'pending' },
      orderBy: { createdAt: 'asc' },
    })
  },

  async complete(taskId: number) {
    return prisma.task.update({ where: { id: taskId }, data: { status: 'done' } })
  },

  async findOpenByTitle(title: string, date: Date = new Date()) {
    const open = await this.listOpenForDate(date)
    return pickBestByTitle(open, (t) => t.title, title)
  },
}
