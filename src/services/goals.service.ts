import { prisma } from './db'
import { AreaSlug } from '@prisma/client'
import { pickBestByTitle } from './title-match'

export interface CreateGoalInput {
  title: string
  description?: string
  targetValue?: number
  unit?: string
  deadline?: Date | string
  areaSlug?: AreaSlug
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
        areaSlug: input.areaSlug ?? AreaSlug.personal,
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

  // Matching tolerante: primeiro tenta casar com metas ativas (caixa/acento-insensitive,
  // sobreposição de palavras), depois cai no contains do banco como último recurso.
  async findBestByTitle(title: string) {
    const active = await this.listActive()
    const best = pickBestByTitle(active, (g) => g.title, title)
    if (best) return best
    return this.findByTitle(title)
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
