import { describe, it, expect } from 'vitest'
import {
  goalNotFound,
  goalCompleted,
  projectNotFound,
  projectWithoutGithub,
  nightlyNothingLogged,
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
