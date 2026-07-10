import { describe, it, expect, vi, beforeEach } from 'vitest'
import { applyIntent } from './intent-handler'
import { eventsService } from '../services/events.service'
import { projectsService } from '../services/projects.service'
import { getGitHubClient } from '../github/client'
import { Intent } from '../ai/interpreter'

vi.mock('../services/events.service', () => ({
  eventsService: { delayAll: vi.fn().mockResolvedValue([]) },
}))
vi.mock('../services/projects.service', () => ({
  projectsService: { findByName: vi.fn() },
}))
vi.mock('../github/client', () => ({
  getGitHubClient: vi.fn(() => null),
}))

function delayIntent(data: { days: number; scope?: 'all' | 'project' | 'events'; projectName?: string }): Intent {
  return { type: 'delay_tasks', data, response: 'ok' } as Intent
}

describe('applyIntent — delay_tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adia todos os eventos quando scope é "all"', async () => {
    await applyIntent(delayIntent({ days: 2, scope: 'all' }), 'u1')

    expect(eventsService.delayAll).toHaveBeenCalledWith(2)
  })

  it('adia todos os eventos quando scope é omitido e não há projeto', async () => {
    await applyIntent(delayIntent({ days: 3 }), 'u1')

    expect(eventsService.delayAll).toHaveBeenCalledWith(3)
  })

  it('adia apenas milestones do projeto quando scope é "project" — sem tocar nos eventos', async () => {
    vi.mocked(projectsService.findByName).mockResolvedValue({
      name: 'Zestify',
      githubOwner: 'sam',
      githubRepoName: 'zestify',
    } as Awaited<ReturnType<typeof projectsService.findByName>>)
    const client = {
      listMilestones: vi.fn().mockResolvedValue([
        { number: 1, due_on: '2026-07-15T00:00:00Z' },
        { number: 2, due_on: null },
      ]),
      updateMilestoneDueDate: vi.fn().mockResolvedValue(undefined),
    }
    vi.mocked(getGitHubClient).mockReturnValue(client as unknown as ReturnType<typeof getGitHubClient>)

    await applyIntent(delayIntent({ days: 2, scope: 'project', projectName: 'Zestify' }), 'u1')

    expect(eventsService.delayAll).not.toHaveBeenCalled()
    expect(projectsService.findByName).toHaveBeenCalledWith('Zestify')
    expect(client.updateMilestoneDueDate).toHaveBeenCalledTimes(1)
    expect(client.updateMilestoneDueDate).toHaveBeenCalledWith(
      'sam',
      'zestify',
      1,
      new Date('2026-07-17T00:00:00Z')
    )
  })

  it('trata projectName sem scope como delay de projeto — sem tocar nos eventos', async () => {
    vi.mocked(projectsService.findByName).mockResolvedValue(null)

    await applyIntent(delayIntent({ days: 1, projectName: 'Inexistente' }), 'u1')

    expect(eventsService.delayAll).not.toHaveBeenCalled()
    expect(projectsService.findByName).toHaveBeenCalledWith('Inexistente')
  })

  it('não adia eventos quando o projeto não é encontrado', async () => {
    vi.mocked(projectsService.findByName).mockResolvedValue(null)

    await applyIntent(delayIntent({ days: 2, scope: 'project', projectName: 'Fantasma' }), 'u1')

    expect(eventsService.delayAll).not.toHaveBeenCalled()
  })
})
