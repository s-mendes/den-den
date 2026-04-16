import { prisma } from './db'

export interface CreateProjectInput {
  name: string
  description?: string
  category?: 'work' | 'sideproject' | 'personal'
  githubRepo?: string
  priority?: number
}

function parseGithubRepo(repo?: string): { owner?: string; name?: string } {
  if (!repo) return {}
  const [owner, name] = repo.split('/')
  return { owner, name }
}

export const projectsService = {
  async create(input: CreateProjectInput) {
    const { owner, name } = parseGithubRepo(input.githubRepo)
    return prisma.project.create({
      data: {
        name: input.name,
        description: input.description,
        category: input.category ?? 'sideproject',
        githubRepo: input.githubRepo,
        githubOwner: owner,
        githubRepoName: name,
        priority: input.priority ?? 3,
      },
    })
  },

  async listActive() {
    return prisma.project.findMany({
      where: { status: 'active' },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
    })
  },

  async findByName(name: string) {
    return prisma.project.findFirst({ where: { name: { contains: name, mode: 'insensitive' } } })
  },
}
