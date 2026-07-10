import { prisma } from './db'
import { AreaSlug } from '@prisma/client'
import { DEFAULT_AREAS } from './areas.data'

export { DEFAULT_AREAS } from './areas.data'
export type { DefaultArea } from './areas.data'

export const areasService = {
  async listAll() {
    return prisma.area.findMany({
      orderBy: { id: 'asc' },
    })
  },

  async findBySlug(slug: AreaSlug) {
    return prisma.area.findUnique({
      where: { slug },
    })
  },

  async seedDefaults() {
    const results = []
    for (const defaultArea of DEFAULT_AREAS) {
      const area = await prisma.area.upsert({
        where: { slug: defaultArea.slug },
        update: {
          name: defaultArea.name,
          emoji: defaultArea.emoji,
          description: defaultArea.description,
          color: defaultArea.color,
        },
        create: {
          slug: defaultArea.slug,
          name: defaultArea.name,
          emoji: defaultArea.emoji,
          description: defaultArea.description,
          color: defaultArea.color,
        },
      })
      results.push(area)
    }
    return results
  },
}
