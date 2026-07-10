import { eventsService } from '../services/events.service'
import { projectsService } from '../services/projects.service'
import { getGitHubClient } from '../github/client'

export type DelayOutcome =
  | { kind: 'events_delayed'; count: number }
  | { kind: 'project_delayed'; projectName: string; milestonesUpdated: number }
  | { kind: 'project_not_found'; projectName?: string }
  | { kind: 'project_without_github'; projectName: string }

export async function delayTasks(
  days: number,
  scope?: 'all' | 'project' | 'events',
  projectName?: string
): Promise<DelayOutcome> {
  const isProjectScope = scope === 'project' || (!!projectName && scope === undefined)

  if (isProjectScope) {
    if (!projectName) return { kind: 'project_not_found' }

    const project = await projectsService.findByName(projectName)
    if (!project) return { kind: 'project_not_found', projectName }

    const client = getGitHubClient()
    if (!client || !project.githubOwner || !project.githubRepoName) {
      return { kind: 'project_without_github', projectName: project.name }
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
    return { kind: 'project_delayed', projectName: project.name, milestonesUpdated: updated }
  }

  const updatedEvents = await eventsService.delayAll(days)
  return { kind: 'events_delayed', count: updatedEvents.length }
}
