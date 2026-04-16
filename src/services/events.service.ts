import { prisma } from './db'

export interface CreateEventInput {
  title: string
  description?: string
  datetime: Date | string
  location?: string
  contactPerson?: string
  isAllDay?: boolean
  isRecurring?: boolean
  recurringRule?: string
}

export const eventsService = {
  async create(input: CreateEventInput) {
    return prisma.event.create({
      data: {
        title: input.title,
        description: input.description,
        datetime: new Date(input.datetime),
        location: input.location,
        contactPerson: input.contactPerson,
        isAllDay: input.isAllDay ?? false,
        isRecurring: input.isRecurring ?? false,
        recurringRule: input.recurringRule,
      },
    })
  },

  async listToday() {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    return prisma.event.findMany({
      where: {
        datetime: { gte: start, lte: end },
        status: { not: 'cancelled' },
      },
      orderBy: { datetime: 'asc' },
    })
  },

  async listUpcoming(hours: number) {
    const now = new Date()
    const horizon = new Date(now.getTime() + hours * 60 * 60 * 1000)
    return prisma.event.findMany({
      where: {
        datetime: { gte: now, lte: horizon },
        status: 'pending',
      },
      orderBy: { datetime: 'asc' },
    })
  },

  async findDueForReminder() {
    const now = new Date()
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)
    return prisma.event.findMany({
      where: {
        datetime: { gte: now, lte: oneHourLater },
        reminded: false,
        status: 'pending',
      },
    })
  },

  async markReminded(id: number) {
    return prisma.event.update({ where: { id }, data: { reminded: true } })
  },

  async markDone(id: number) {
    return prisma.event.update({ where: { id }, data: { status: 'done' } })
  },

  async delayAll(days: number) {
    const events = await prisma.event.findMany({ where: { status: 'pending' } })
    const ms = days * 24 * 60 * 60 * 1000
    return Promise.all(
      events.map((e) =>
        prisma.event.update({
          where: { id: e.id },
          data: { datetime: new Date(e.datetime.getTime() + ms), reminded: false },
        })
      )
    )
  },
}
