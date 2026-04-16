import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { eventsService } from '../../services/events.service'
import { projectsService } from '../../services/projects.service'
import { getGitHubClient } from '../../github/client'

export const data = new SlashCommandBuilder()
  .setName('delay')
  .setDescription('Empurra eventos e milestones para frente')
  .addIntegerOption((opt) =>
    opt.setName('days').setDescription('Quantos dias empurrar').setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('project').setDescription('Limitar a um projeto específico (nome ou repo)')
  )

export async function execute(interaction: ChatInputCommandInteraction) {
  const days = interaction.options.getInteger('days', true)
  const projectName = interaction.options.getString('project') ?? undefined

  await interaction.deferReply()

  if (projectName) {
    const project = await projectsService.findByName(projectName)
    if (!project) {
      await interaction.editReply(`Não achei o projeto "${projectName}".`)
      return
    }
    const client = getGitHubClient()
    if (!client || !project.githubOwner || !project.githubRepoName) {
      await interaction.editReply(
        `Projeto "${project.name}" encontrado, mas sem GitHub conectado — nada pra empurrar por aqui.`
      )
      return
    }
    const milestones = await client.listMilestones(project.githubOwner, project.githubRepoName)
    const ms = days * 24 * 60 * 60 * 1000
    let updated = 0
    for (const m of milestones) {
      if (!m.due_on) continue
      const newDue = new Date(new Date(m.due_on).getTime() + ms)
      await client.updateMilestoneDueDate(project.githubOwner, project.githubRepoName, m.number, newDue)
      updated++
    }
    await interaction.editReply(
      `Empurrei ${updated} milestones do **${project.name}** em ${days} dias. Respira e segue.`
    )
    return
  }

  const updated = await eventsService.delayAll(days)
  await interaction.editReply(
    `Empurrei ${updated.length} eventos em ${days} dias. A vida muda, a gente se adapta — vamo que vamo.`
  )
}
