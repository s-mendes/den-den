import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { delayTasks } from '../delay-actions'

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

  const outcome = await delayTasks(days, projectName ? 'project' : 'events', projectName)

  switch (outcome.kind) {
    case 'project_not_found':
      await interaction.editReply(`Não achei o projeto "${projectName}".`)
      return
    case 'project_without_github':
      await interaction.editReply(
        `Projeto "${outcome.projectName}" encontrado, mas sem GitHub conectado — nada pra empurrar por aqui.`
      )
      return
    case 'project_delayed':
      await interaction.editReply(
        `Empurrei ${outcome.milestonesUpdated} milestones do **${outcome.projectName}** em ${days} dias. Respira e segue.`
      )
      return
    case 'events_delayed':
      await interaction.editReply(
        `Empurrei ${outcome.count} eventos em ${days} dias. A vida muda, a gente se adapta — vamo que vamo.`
      )
      return
  }
}
