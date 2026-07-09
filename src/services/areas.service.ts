import { prisma } from './db'
import { AreaSlug } from '@prisma/client'

export interface DefaultArea {
  slug: AreaSlug
  name: string
  emoji: string
  description: string
  color: string
}

export const DEFAULT_AREAS: DefaultArea[] = [
  {
    slug: AreaSlug.work,
    name: 'Trabalho',
    emoji: '💼',
    description: 'Trabalho fixo (Macle Sistemas)',
    color: '#0E8A16',
  },
  {
    slug: AreaSlug.business,
    name: 'Negócios',
    emoji: '🚀',
    description: 'Side projects comerciais (Zestify, Excursa)',
    color: '#1D76DB',
  },
  {
    slug: AreaSlug.content,
    name: 'Conteúdo',
    emoji: '🎮',
    description: 'Criação de conteúdo (Retro Play Archive/gameplays)',
    color: '#D93F0B',
  },
  {
    slug: AreaSlug.health,
    name: 'Saúde',
    emoji: '🏋️',
    description: 'Atividade física e bem-estar',
    color: '#5319E7',
  },
  {
    slug: AreaSlug.personal,
    name: 'Pessoal',
    emoji: '❤️',
    description: 'Relacionamentos, descanso e lazer',
    color: '#FBCA04',
  },
  {
    slug: AreaSlug.study,
    name: 'Estudos',
    emoji: '📚',
    description: 'Cursos, livros e aprendizado',
    color: '#FEF2C0',
  },
]

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
