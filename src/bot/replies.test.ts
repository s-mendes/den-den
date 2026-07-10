import { describe, it, expect } from 'vitest'
import {
  goalNotFound,
  goalCompleted,
  taskCreated,
  taskCompleted,
  taskNotFound,
  projectNotFound,
  projectWithoutGithub,
  nightlyNothingLogged,
  formatGoalsQuery,
  formatTodayQuery,
  formatTasksQuery,
  formatWeekQuery,
  formatProjectsQuery,
  formatProfileQuery,
  formatFreeQuery,
} from './replies'

describe('replies — templates determinísticos de falha', () => {
  describe('goalNotFound', () => {
    it('inclui o título procurado e lista as metas ativas como candidatas', () => {
      const reply = goalNotFound('Xablau', ['Ler 10 livros', 'Correr 5km por semana'])

      expect(reply).toContain('Xablau')
      expect(reply).toContain('Ler 10 livros')
      expect(reply).toContain('Correr 5km por semana')
      expect(reply).toMatch(/não encontrei/i)
    })

    it('avisa que não há metas ativas quando a lista está vazia', () => {
      const reply = goalNotFound('Xablau', [])

      expect(reply).toContain('Xablau')
      expect(reply).toMatch(/nenhuma meta ativa/i)
    })
  })

  describe('goalCompleted', () => {
    it('confirma a conclusão citando o título real da meta', () => {
      const reply = goalCompleted('Ler 10 livros')

      expect(reply).toContain('Ler 10 livros')
      expect(reply).toMatch(/concluída/i)
    })

    it('inclui o progresso final quando informado', () => {
      const reply = goalCompleted('Ler 10 livros', { currentValue: 8, targetValue: 10, unit: 'livros' })

      expect(reply).toContain('8/10 livros')
    })
  })

  describe('taskCreated', () => {
    it('confirma a criação citando o título da tarefa', () => {
      const reply = taskCreated('Ajustar cupom do checkout')

      expect(reply).toContain('Ajustar cupom do checkout')
      expect(reply).toMatch(/anotad/i)
    })

    it('ecoa a área quando a tarefa tem areaSlug — feedback da classificação', () => {
      const reply = taskCreated('Gravar gameplay', 'content')

      expect(reply).toContain('🎮 Conteúdo')
    })
  })

  describe('taskCompleted', () => {
    it('confirma a conclusão citando o título da tarefa', () => {
      const reply = taskCompleted('Finalizar issue #86')

      expect(reply).toContain('Finalizar issue #86')
      expect(reply).toMatch(/concluída/i)
    })
  })

  describe('taskNotFound', () => {
    it('inclui o título procurado e as tarefas pendentes de hoje', () => {
      const reply = taskNotFound('issue #99', ['Ligar pro dentista'])

      expect(reply).toContain('issue #99')
      expect(reply).toContain('Ligar pro dentista')
      expect(reply).toMatch(/não encontrei/i)
    })

    it('avisa quando não há tarefas pendentes hoje', () => {
      const reply = taskNotFound('issue #99', [])

      expect(reply).toContain('issue #99')
      expect(reply).toMatch(/nenhuma tarefa pendente/i)
    })
  })

  describe('projectNotFound', () => {
    it('inclui o nome do projeto procurado', () => {
      const reply = projectNotFound('Fantasma')

      expect(reply).toContain('Fantasma')
      expect(reply).toMatch(/não encontrei/i)
    })

    it('pede o nome do projeto quando nenhum foi informado', () => {
      const reply = projectNotFound()

      expect(reply).toMatch(/qual projeto/i)
    })
  })

  describe('projectWithoutGithub', () => {
    it('explica que o projeto não tem repositório GitHub vinculado', () => {
      const reply = projectWithoutGithub('Zestify')

      expect(reply).toContain('Zestify')
      expect(reply).toMatch(/github/i)
    })
  })

  describe('nightlyNothingLogged', () => {
    it('avisa que nenhuma atividade casou com metas semanais', () => {
      const reply = nightlyNothingLogged()

      expect(reply).toMatch(/meta semanal/i)
    })
  })
})

describe('replies — formatters de query com dados reais', () => {
  describe('formatGoalsQuery', () => {
    it('mostra metas ativas e metas semanais em seções separadas', () => {
      const reply = formatGoalsQuery(
        [{ title: 'Ler 10 livros', currentValue: 8, targetValue: 10, unit: 'livros' }],
        [{ areaSlug: 'health', activity: 'Treinar', completedCount: 1, targetCount: 3 }]
      )

      expect(reply).toContain('Metas ativas')
      expect(reply).toContain('Ler 10 livros: 8/10 livros')
      expect(reply).toContain('Metas semanais')
      expect(reply).toContain('Treinar: 1/3')
    })

    it('nunca responde silêncio: listas vazias têm mensagem amigável', () => {
      const reply = formatGoalsQuery([], [])

      expect(reply).toMatch(/nenhuma meta ativa/i)
      expect(reply).toMatch(/nenhuma meta semanal/i)
    })
  })

  describe('formatTodayQuery', () => {
    it('mostra agenda, eventos e tarefas pendentes', () => {
      const reply = formatTodayQuery({
        calendarStatus: 'ok',
        calendarEvents: [
          {
            title: 'Daily Macle',
            start: new Date('2026-07-10T12:00:00Z'),
            end: new Date('2026-07-10T12:30:00Z'),
            isAllDay: false,
          },
        ],
        dbEvents: [{ title: 'Consulta médica', datetime: new Date('2026-07-10T18:00:00Z') }],
        tasks: [{ title: 'Ajustar cupom do checkout', areaSlug: 'work' }],
      })

      expect(reply).toContain('Daily Macle')
      expect(reply).toContain('Consulta médica')
      expect(reply).toContain('Ajustar cupom do checkout')
      expect(reply).toContain('💼 Trabalho')
    })

    it('avisa quando o calendar está indisponível — não finge dia livre', () => {
      const reply = formatTodayQuery({
        calendarStatus: 'error',
        calendarEvents: [],
        dbEvents: [],
        tasks: [],
      })

      expect(reply).toMatch(/não consegui acessar.*calendar/i)
      expect(reply).not.toMatch(/sem eventos no calendário/i)
    })
  })

  describe('formatTasksQuery', () => {
    it('lista tarefas com tag de área', () => {
      const reply = formatTasksQuery([
        { title: 'Corrigir bug do checkout', areaSlug: 'work' },
        { title: 'Gravar gameplay', areaSlug: 'content' },
      ])

      expect(reply).toContain('Corrigir bug do checkout')
      expect(reply).toContain('💼 Trabalho')
      expect(reply).toContain('🎮 Conteúdo')
    })

    it('inclui o rótulo do filtro no título quando informado', () => {
      const reply = formatTasksQuery([{ title: 'Corrigir bug do checkout', areaSlug: 'work' }], '💼 Trabalho')

      expect(reply).toMatch(/tarefas.*💼 Trabalho/i)
    })

    it('vazio com filtro tem mensagem amigável citando o filtro', () => {
      const reply = formatTasksQuery([], '💼 Trabalho')

      expect(reply).toMatch(/nenhuma tarefa pendente/i)
      expect(reply).toContain('💼 Trabalho')
    })
  })

  describe('formatWeekQuery', () => {
    it('mostra progresso por área com score e streak', () => {
      const reply = formatWeekQuery(
        [{ areaSlug: 'health', activity: 'Treinar', completedCount: 1, targetCount: 3 }],
        { score: 40, completed: 2, total: 5 },
        3
      )

      expect(reply).toContain('Treinar: 1/3')
      expect(reply).toContain('2/5 (40%)')
      expect(reply).toContain('3 semana')
    })
  })

  describe('formatProjectsQuery', () => {
    it('lista projetos ativos com repo', () => {
      const reply = formatProjectsQuery([{ name: 'Zestify', githubRepo: 'sam/zestify' }])

      expect(reply).toContain('Zestify')
      expect(reply).toContain('sam/zestify')
    })

    it('lista vazia tem mensagem amigável', () => {
      expect(formatProjectsQuery([])).toMatch(/nenhum projeto/i)
    })
  })

  describe('formatProfileQuery', () => {
    it('mostra perfil e sonhos de longo prazo', () => {
      const reply = formatProfileQuery(
        { name: 'Samuel', currentEmployer: 'Macle', currentRole: 'Dev' },
        ['Viver de side projects']
      )

      expect(reply).toContain('Samuel')
      expect(reply).toContain('Macle')
      expect(reply).toContain('Viver de side projects')
    })
  })

  describe('formatFreeQuery', () => {
    it('lista blocos livres', () => {
      const reply = formatFreeQuery(
        [{ start: new Date('2026-07-10T20:00:00Z'), end: new Date('2026-07-10T22:00:00Z'), durationMinutes: 120 }],
        'ok'
      )

      expect(reply).toContain('120 minutos')
    })

    it('avisa quando o calendar está indisponível', () => {
      const reply = formatFreeQuery([], 'error')

      expect(reply).toMatch(/não consegui acessar.*calendar/i)
    })
  })
})
