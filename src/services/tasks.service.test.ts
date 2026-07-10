import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { tasksService } from './tasks.service'
import { prisma } from './db'
import { projectsService } from './projects.service'
import { AreaSlug } from '@prisma/client'

vi.mock('./db', () => ({
  prisma: {
    task: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}))
vi.mock('./projects.service', () => ({
  projectsService: { findByName: vi.fn() },
}))

const originalEnv = { ...process.env }

describe('tasksService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.APP_TIME_ZONE = 'America/Sao_Paulo'
    vi.mocked(prisma.task.create).mockResolvedValue({ id: 1, title: 'x' } as never)
    vi.mocked(prisma.task.findMany).mockResolvedValue([] as never)
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.useRealTimers()
  })

  describe('create', () => {
    it('resolve projectName para projectId via projectsService', async () => {
      vi.mocked(projectsService.findByName).mockResolvedValue({
        id: 42,
        name: 'Zestify',
      } as Awaited<ReturnType<typeof projectsService.findByName>>)

      await tasksService.create({ title: 'Ajustar cupom', projectName: 'Zestify', areaSlug: AreaSlug.work })

      expect(projectsService.findByName).toHaveBeenCalledWith('Zestify')
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ title: 'Ajustar cupom', projectId: 42, areaSlug: 'work' }),
      })
    })

    it('não falha quando o projeto não existe — cria a tarefa sem projectId', async () => {
      vi.mocked(projectsService.findByName).mockResolvedValue(null)

      await tasksService.create({ title: 'Ajustar cupom', projectName: 'Fantasma' })

      expect(prisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ title: 'Ajustar cupom', projectId: undefined }),
      })
    })

    it('usa o dia local de hoje como date por padrão (23h SP não vaza pro dia seguinte)', async () => {
      // 02:00Z de 10/07 = 23:00 de 09/07 em São Paulo
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-07-10T02:00:00Z'))

      await tasksService.create({ title: 'Ligar pro dentista' })

      expect(prisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ date: new Date('2026-07-09T00:00:00Z') }),
      })
    })

    it('aceita date como string YYYY-MM-DD e usa exatamente esse dia', async () => {
      await tasksService.create({ title: 'Revisar PR', date: '2026-07-15' })

      expect(prisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ date: new Date('2026-07-15T00:00:00Z') }),
      })
    })
  })

  describe('listOpenForDate', () => {
    it('filtra tarefas pendentes do dia local', async () => {
      await tasksService.listOpenForDate(new Date('2026-07-10T14:00:00Z'))

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: { date: new Date('2026-07-10T00:00:00Z'), status: 'pending' },
        orderBy: { createdAt: 'asc' },
      })
    })
  })

  describe('complete', () => {
    it('marca a tarefa como done', async () => {
      await tasksService.complete(9)

      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 9 },
        data: { status: 'done' },
      })
    })
  })

  describe('findOpenByTitle', () => {
    it('casa o título com as tarefas pendentes de hoje via matcher tolerante', async () => {
      vi.mocked(prisma.task.findMany).mockResolvedValue([
        { id: 1, title: 'Ajustar cupom de desconto do checkout' },
        { id: 2, title: 'Ligar pro dentista' },
      ] as never)

      const found = await tasksService.findOpenByTitle('cupom do checkout')

      expect(found).toMatchObject({ id: 1 })
    })

    it('retorna null quando nada casa', async () => {
      vi.mocked(prisma.task.findMany).mockResolvedValue([{ id: 2, title: 'Ligar pro dentista' }] as never)

      expect(await tasksService.findOpenByTitle('issue #86')).toBeNull()
    })
  })
})
