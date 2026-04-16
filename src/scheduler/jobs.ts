import cron from 'node-cron'
import { Client, User } from 'discord.js'
import { Planner } from '../ai/planner'
import { buildUserContext } from '../bot/context'
import { eventsService } from '../services/events.service'
import { projectsService } from '../services/projects.service'
import { getGitHubClient } from '../github/client'

export class Scheduler {
  constructor(
    private client: Client,
    private planner: Planner,
    private targetUserId: string
  ) {}

  start() {
    cron.schedule('0 8 * * *', () => this.morningBriefing().catch(console.error))
    cron.schedule('*/15 * * * *', () => this.eventReminders().catch(console.error))
    cron.schedule('0 21 * * *', () => this.nightlyCheck().catch(console.error))
    cron.schedule('30 7 * * 1', () => this.weeklySummary().catch(console.error))
    console.log('⏰ Scheduler ativo: bom dia 08h, lembretes a cada 15min, check 21h, resumo seg 07:30')
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
      await user.send(content)
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
      const when = e.datetime.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      const location = e.location ? ` em ${e.location}` : ''
      const person = e.contactPerson ? ` com ${e.contactPerson}` : ''
      await this.dm(
        `🔔 **Lembrete em 1h**: ${e.title}${person}${location} às ${when}. Bora se preparar!`
      )
      await eventsService.markReminded(e.id)
    }
  }

  async nightlyCheck() {
    const context = await buildUserContext(this.targetUserId)
    const commitsToday = await this.countCommitsToday()
    const message = await this.planner.nightlyCheck(context, commitsToday)
    await this.dm(`🌙 **Check da noite**\n\n${message}`)
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
