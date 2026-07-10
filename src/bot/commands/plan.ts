import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { Planner } from '../../ai/planner'
import { buildUserContext } from '../context'
import { editReplyInChunks } from '../split-message'

export const data = new SlashCommandBuilder()
  .setName('plan')
  .setDescription('Plano e resumo da semana')

export function createExecute(planner: Planner) {
  return async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()
    const context = await buildUserContext(interaction.user.id, 7)
    const plan = await planner.weekly(context)
    await editReplyInChunks(interaction, plan)
  }
}
