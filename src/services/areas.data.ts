// Dados estáticos das áreas da vida — módulo puro, sem import de Prisma,
// para que camadas puras (replies, formatters) usem sem puxar o client do banco.
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

// Rótulo humano "💼 Trabalho" para exibição; slug desconhecido volta como está
export function areaLabel(slug: string): string {
  const area = DEFAULT_AREAS.find((a) => a.slug === slug)
  return area ? `${area.emoji} ${area.name}` : slug
}
