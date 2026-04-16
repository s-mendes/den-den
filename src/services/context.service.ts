import { prisma } from './db'

export interface CreateContextLogInput {
  description: string
  startDate: Date | string
  endDate?: Date | string
  impact?: string
}

export const contextService = {
  async create(input: CreateContextLogInput) {
    return prisma.contextLog.create({
      data: {
        description: input.description,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        impact: input.impact,
      },
    })
  },

  async listActive() {
    const now = new Date()
    return prisma.contextLog.findMany({
      where: {
        active: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      orderBy: { startDate: 'desc' },
    })
  },

  async deactivate(id: number) {
    return prisma.contextLog.update({ where: { id }, data: { active: false } })
  },
}
