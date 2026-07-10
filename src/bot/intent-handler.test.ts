import { describe, it, expect, vi, beforeEach } from 'vitest'
import { applyIntent } from './intent-handler'
import { eventsService } from '../services/events.service'
import { projectsService } from '../services/projects.service'
import { goalsService } from '../services/goals.service'
import { weeklyTargetsService } from '../services/weekly-targets.service'
import { getGitHubClient } from '../github/client'
import { Intent, UserContext } from '../ai/interpreter'

vi.mock('../services/events.service', () => ({
  eventsService: { delayAll: vi.fn().mockResolvedValue([]) },
}))
vi.mock('../services/projects.service', () => ({
  projectsService: { findByName: vi.fn() },
}))
vi.mock('../services/goals.service', () => ({
  goalsService: {
    findByTitle: vi.fn(),
    logProgress: vi.fn(),
    listActive: vi.fn().mockResolvedValue([]),
  },
}))
vi.mock('../services/weekly-targets.service', () => ({
  weeklyTargetsService: { logActivity: vi.fn() },
}))
vi.mock('../github/client', () => ({
  getGitHubClient: vi.fn(() => null),
}))

const ctx = { discordUserId: 'u1' } as UserContext

function delayIntent(data: { days: number; scope?: 'all' | 'project' | 'events'; projectName?: string }): Intent {
  return { type: 'delay_tasks', data, response: 'ok' } as Intent
}

describe('applyIntent — delay_tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adia todos os eventos quando scope é "all" e retorna ok sem reply própria', async () => {
    const result = await applyIntent(delayIntent({ days: 2, scope: 'all' }), 'u1', ctx)

    expect(eventsService.delayAll).toHaveBeenCalledWith(2)
    expect(result).toEqual({ status: 'ok' })
  })

  it('adia todos os eventos quando scope é omitido e não há projeto', async () => {
    const result = await applyIntent(delayIntent({ days: 3 }), 'u1', ctx)

    expect(eventsService.delayAll).toHaveBeenCalledWith(3)
    expect(result.status).toBe('ok')
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

    const result = await applyIntent(delayIntent({ days: 2, scope: 'project', projectName: 'Zestify' }), 'u1', ctx)

    expect(eventsService.delayAll).not.toHaveBeenCalled()
    expect(projectsService.findByName).toHaveBeenCalledWith('Zestify')
    expect(client.updateMilestoneDueDate).toHaveBeenCalledTimes(1)
    expect(client.updateMilestoneDueDate).toHaveBeenCalledWith(
      'sam',
      'zestify',
      1,
      new Date('2026-07-17T00:00:00Z')
    )
    expect(result.status).toBe('ok')
  })

  it('trata projectName sem scope como delay de projeto — sem tocar nos eventos', async () => {
    vi.mocked(projectsService.findByName).mockResolvedValue(null)

    await applyIntent(delayIntent({ days: 1, projectName: 'Inexistente' }), 'u1', ctx)

    expect(eventsService.delayAll).not.toHaveBeenCalled()
    expect(projectsService.findByName).toHaveBeenCalledWith('Inexistente')
  })

  it('retorna erro com reply determinística quando o projeto não é encontrado', async () => {
    vi.mocked(projectsService.findByName).mockResolvedValue(null)

    const result = await applyIntent(delayIntent({ days: 2, scope: 'project', projectName: 'Fantasma' }), 'u1', ctx)

    expect(eventsService.delayAll).not.toHaveBeenCalled()
    expect(result.status).toBe('error')
    expect(result.reply).toContain('Fantasma')
  })

  it('retorna erro com reply determinística quando o projeto não tem GitHub vinculado', async () => {
    vi.mocked(projectsService.findByName).mockResolvedValue({
      name: 'Zestify',
      githubOwner: null,
      githubRepoName: null,
    } as Awaited<ReturnType<typeof projectsService.findByName>>)

    const result = await applyIntent(delayIntent({ days: 2, scope: 'project', projectName: 'Zestify' }), 'u1', ctx)

    expect(result.status).toBe('error')
    expect(result.reply).toContain('Zestify')
    expect(result.reply).toMatch(/github/i)
  })
})

describe('applyIntent — log_progress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function logIntent(goalTitle: string, value: number): Intent {
    return { type: 'log_progress', data: { goalTitle, value }, response: 'ok' } as Intent
  }

  it('registra progresso e retorna ok quando a meta é encontrada', async () => {
    vi.mocked(goalsService.findByTitle).mockResolvedValue({
      id: 7,
      title: 'Ler 10 livros',
    } as Awaited<ReturnType<typeof goalsService.findByTitle>>)

    const result = await applyIntent(logIntent('Ler 10 livros', 1), 'u1', ctx)

    expect(goalsService.logProgress).toHaveBeenCalledWith(7, 1, undefined)
    expect(result).toEqual({ status: 'ok' })
  })

  it('retorna erro listando metas ativas quando a meta não é encontrada — sem confirmar falsamente', async () => {
    vi.mocked(goalsService.findByTitle).mockResolvedValue(null)
    vi.mocked(goalsService.listActive).mockResolvedValue([
      { title: 'Ler 10 livros' },
      { title: 'Correr 5km' },
    ] as Awaited<ReturnType<typeof goalsService.listActive>>)

    const result = await applyIntent(logIntent('Xablau', 3), 'u1', ctx)

    expect(goalsService.logProgress).not.toHaveBeenCalled()
    expect(result.status).toBe('error')
    expect(result.reply).toContain('Xablau')
    expect(result.reply).toContain('Ler 10 livros')
    expect(result.reply).toContain('Correr 5km')
  })
})

describe('applyIntent — nightly_checkin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function checkinIntent(activities: Array<{ areaSlug: string; description: string }>): Intent {
    return { type: 'nightly_checkin', data: { activities }, response: 'ok' } as Intent
  }

  it('retorna ok quando ao menos uma atividade é registrada', async () => {
    vi.mocked(weeklyTargetsService.logActivity)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1 } as Awaited<ReturnType<typeof weeklyTargetsService.logActivity>>)

    const result = await applyIntent(
      checkinIntent([
        { areaSlug: 'health', description: 'treinei' },
        { areaSlug: 'study', description: 'li 20 páginas' },
      ]),
      'u1',
      ctx
    )

    expect(result.status).toBe('ok')
  })

  it('retorna erro quando nenhuma atividade casa com metas semanais', async () => {
    vi.mocked(weeklyTargetsService.logActivity).mockResolvedValue(null)

    const result = await applyIntent(checkinIntent([{ areaSlug: 'health', description: 'treinei' }]), 'u1', ctx)

    expect(result.status).toBe('error')
    expect(result.reply).toMatch(/meta semanal/i)
  })
})

describe('applyIntent — passthrough', () => {
  it('chitchat retorna ok sem reply própria', async () => {
    const result = await applyIntent({ type: 'chitchat', data: {}, response: 'oi' } as Intent, 'u1', ctx)

    expect(result).toEqual({ status: 'ok' })
  })
})
