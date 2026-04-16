import { prisma } from './db'

export interface CreateGoalInput {
  title: string
  description?: string
  targetValue?: number
  unit?: string
  deadline?: Date | string
  category?: 'work' | 'personal' | 'sideproject'
}

export const goalsService = {
  async create(input: CreateGoalInput) {
    return prisma.goal.create({
      data: {
        title: input.title,
        description: input.description,
        targetValue: input.targetValue,
        unit: input.unit,
        deadline: input.deadline ? new Date(input.deadline) : undefined,
        category: input.category ?? 'personal',
      },
    })
  },

  async listActive() {
    return prisma.goal.findMany({
      where: { status: 'active' },
      orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
    })
  },

  async findByTitle(title: string) {
    return prisma.goal.findFirst({
      where: { title: { contains: title, mode: 'insensitive' } },
    })
  },

  async logProgress(goalId: number, value: number, note?: string) {
    await prisma.goalEntry.create({ data: { goalId, value, note } })
    return prisma.goal.update({
      where: { id: goalId },
      data: { currentValue: { increment: value } },
    })
  },

  async complete(goalId: number) {
    return prisma.goal.update({ where: { id: goalId }, data: { status: 'completed' } })
  },
}
