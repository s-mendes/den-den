import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { goalsService } from '../../services/goals.service'
import { editReplyInChunks } from '../split-message'

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Resumo do progresso das suas metas ativas')

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply()
  const goals = await goalsService.listActive()
  if (!goals.length) {
    await interaction.editReply('Nenhuma meta ativa ainda. Me conta o que você quer conquistar!')
    return
  }

  const lines = ['🎯 **METAS ATIVAS**\n']
  for (const g of goals) {
    const target = g.targetValue ? `/${g.targetValue}` : ''
    const unit = g.unit ? ` ${g.unit}` : ''
    const pct =
      g.targetValue && g.targetValue > 0
        ? ` (${Math.round((g.currentValue / g.targetValue) * 100)}%)`
        : ''
    const deadline = g.deadline ? ` — prazo ${g.deadline.toISOString().slice(0, 10)}` : ''
    lines.push(`• **${g.title}**: ${g.currentValue}${target}${unit}${pct}${deadline}`)
  }
  await editReplyInChunks(interaction, lines.join('\n'))
}
