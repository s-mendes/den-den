import { PrismaClient, AreaSlug } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_AREAS = [
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

async function main() {
  console.log('🌱 Iniciando seed de Áreas da Vida...')

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
    console.log(`  Area upserted: ${area.slug} (${area.name})`)
  }

  // Preenche areaSlug para metas e projetos existentes que estejam nulos
  // Como as colunas antigas "category" foram dropadas pela migration do prisma,
  // nós apenas garantimos que registros órfãos ganhem um valor padrão coerente.
  
  // Para Goals
  const updatedGoals = await prisma.goal.updateMany({
    where: { areaSlug: null },
    data: { areaSlug: AreaSlug.personal }
  })
  if (updatedGoals.count > 0) {
    console.log(`  Updated ${updatedGoals.count} goals with default area: personal`)
  }

  // Para Projects
  const updatedProjects = await prisma.project.updateMany({
    where: { areaSlug: null },
    data: { areaSlug: AreaSlug.business }
  })
  if (updatedProjects.count > 0) {
    console.log(`  Updated ${updatedProjects.count} projects with default area: business`)
  }

  console.log('✅ Seed finalizado com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
