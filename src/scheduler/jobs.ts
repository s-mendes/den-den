import cron from 'node-cron'
import { Client, User } from 'discord.js'
import { Planner } from '../ai/planner'
import { buildUserContext } from '../bot/context'
import { eventsService } from '../services/events.service'
import { projectsService } from '../services/projects.service'
import { getGitHubClient } from '../github/client'
import { formatTimeForPrompt, resolveTimeZone } from '../ai/time'
import { splitDiscordMessage } from '../bot/split-message'

export class Scheduler {
  constructor(
    private client: Client,
    private planner: Planner,
    private targetUserId: string
  ) {}

  start() {
    const timezone = resolveTimeZone()
    cron.schedule('0 8 * * *', () => this.morningBriefing().catch(console.error), { timezone })
    cron.schedule('*/15 * * * *', () => this.eventReminders().catch(console.error), { timezone })
    cron.schedule('30 21 * * *', () => this.nightlyCheck().catch(console.error), { timezone })
    cron.schedule('0 20 * * 0', () => this.weeklySummary().catch(console.error), { timezone })
    console.log(
      `⏰ Scheduler ativo (${timezone}): bom dia 08h, lembretes a cada 15min, check 21h30, resumo dom 20h`
    )
  }

  private async getTargetUser(): Promise<User | null> {
    try {
      return await this.client.users.fetch(this.targetUserId)
    } catch (err) {
      console.error('Não consegui encontrar o usuário alvo:', err)
      return null
    }
  }

  private async dm(content: string) {
    const user = await this.getTargetUser()
    if (!user) return
    try {
      for (const chunk of splitDiscordMessage(content)) {
        await user.send(chunk)
      }
    } catch (err) {
      console.error('Não consegui enviar DM:', err)
    }
  }

  async morningBriefing() {
    const context = await buildUserContext(this.targetUserId)
    const staleProjects = await this.findStaleProjects()
    const briefing = await this.planner.today(context, { staleProjects })
    await this.dm(`🌅 **Bom dia!**\n\n${briefing}`)
  }

  async eventReminders() {
    const events = await eventsService.findDueForReminder()
    for (const e of events) {
      const when = formatTimeForPrompt(e.datetime)
      const location = e.location ? ` em ${e.location}` : ''
      const person = e.contactPerson ? ` com ${e.contactPerson}` : ''
      await this.dm(
        `🔔 **Lembrete em 1h**: ${e.title}${person}${location} às ${when}. Bora se preparar!`
      )
      await eventsService.markReminded(e.id)
    }
  }

  async nightlyCheck() {
    await this.dm(
      `🌙 **Como foi hoje?** Me conta o que rolou nas suas metas ou side projects (pode escrever em linguagem natural).\n\n` +
      `Exemplos:\n` +
      `- *"Treinei hoje e gravei um vídeo pro canal"* \n` +
      `- *"Fiz 2h de desenvolvimento no Zestify"* \n` +
      `- *"Hoje o dia na Macle foi pesado, só trabalhei e descansei"*`
    )
  }

  async weeklySummary() {
    const context = await buildUserContext(this.targetUserId)
    const summary = await this.planner.weekly(context)
    await this.dm(`📊 **Resumo semanal**\n\n${summary}`)
  }

  private async countCommitsToday(): Promise<number> {
    const client = getGitHubClient()
    if (!client) return 0
    const projects = await projectsService.listActive()
    let total = 0
    for (const p of projects) {
      if (!p.githubOwner || !p.githubRepoName) continue
      total += await client.countCommitsToday(p.githubOwner, p.githubRepoName)
    }
    return total
  }

  private async findStaleProjects(): Promise<string[]> {
    const client = getGitHubClient()
    if (!client) return []
    const projects = await projectsService.listActive()
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    const stale: string[] = []
    for (const p of projects) {
      if (!p.githubOwner || !p.githubRepoName) continue
      const last = await client.getLastCommitDate(p.githubOwner, p.githubRepoName)
      if (!last || last < threeDaysAgo) stale.push(p.name)
    }
    return stale
  }
}
