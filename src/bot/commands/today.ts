import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { Planner } from '../../ai/planner'
import { buildUserContext } from '../context'
import { projectsService } from '../../services/projects.service'
import { getGitHubClient } from '../../github/client'

export const data = new SlashCommandBuilder()
  .setName('today')
  .setDescription('Briefing completo do seu dia')

export function createExecute(planner: Planner) {
  return async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const context = await buildUserContext(interaction.user.id)
    const staleProjects = await findStaleProjects()

    const briefing = await planner.today(context, { staleProjects })
    await interaction.editReply(briefing)
  }
}

async function findStaleProjects(): Promise<string[]> {
  const client = getGitHubClient()
  if (!client) return []

  const projects = await projectsService.listActive()
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  const stale: string[] = []

  for (const p of projects) {
    if (!p.githubOwner || !p.githubRepoName) continue
    const lastCommit = await client.getLastCommitDate(p.githubOwner, p.githubRepoName)
    if (!lastCommit || lastCommit < threeDaysAgo) stale.push(p.name)
  }

  return stale
}
