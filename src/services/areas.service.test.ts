import { describe, it, expect, vi, beforeEach } from 'vitest'
import { areasService, DEFAULT_AREAS } from './areas.service'
import { prisma } from './db'
import { AreaSlug } from '@prisma/client'

vi.mock('./db', () => ({
  prisma: {
    area: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

describe('areasService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listAll', () => {
    it('deve listar todas as áreas ordenadas por id', async () => {
      const mockAreas = [
        { id: 1, slug: AreaSlug.work, name: 'Trabalho' },
        { id: 2, slug: AreaSlug.business, name: 'Negócios' },
      ]
      vi.mocked(prisma.area.findMany).mockResolvedValue(mockAreas as any)

      const result = await areasService.listAll()

      expect(prisma.area.findMany).toHaveBeenCalledWith({
        orderBy: { id: 'asc' },
      })
      expect(result).toEqual(mockAreas)
    })
  })

  describe('findBySlug', () => {
    it('deve buscar uma área específica pelo slug', async () => {
      const mockArea = { id: 1, slug: AreaSlug.work, name: 'Trabalho' }
      vi.mocked(prisma.area.findUnique).mockResolvedValue(mockArea as any)

      const result = await areasService.findBySlug(AreaSlug.work)

      expect(prisma.area.findUnique).toHaveBeenCalledWith({
        where: { slug: AreaSlug.work },
      })
      expect(result).toEqual(mockArea)
    })
  })

  describe('seedDefaults', () => {
    it('deve rodar o upsert para cada uma das áreas padrão', async () => {
      vi.mocked(prisma.area.upsert).mockImplementation(async ({ create }) => ({
        id: Math.random(),
        ...create,
      }) as any)

      const result = await areasService.seedDefaults()

      expect(prisma.area.upsert).toHaveBeenCalledTimes(DEFAULT_AREAS.length)
      expect(result).toHaveLength(DEFAULT_AREAS.length)
      expect(result[0].slug).toBe(DEFAULT_AREAS[0].slug)
    })
  })
})
