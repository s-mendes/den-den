import { describe, it, expect } from 'vitest'
import { classifyEventArea, analyzeDayEvents } from './parser'
import { AreaSlug } from '@prisma/client'
import { CalendarEvent } from './client'

describe('calendar parser', () => {
  describe('classifyEventArea', () => {
    it('deve classificar trabalho fixo corretamente', () => {
      expect(classifyEventArea('Daily Macle')).toBe(AreaSlug.work)
      expect(classifyEventArea('Reunião com Macle Sistemas')).toBe(AreaSlug.work)
    })

    it('deve classificar side projects comerciais corretamente', () => {
      expect(classifyEventArea('Ajustes no painel Zestify')).toBe(AreaSlug.business)
      expect(classifyEventArea('Reunião Excursa')).toBe(AreaSlug.business)
    })

    it('deve classificar conteúdo retro-play corretamente', () => {
      expect(classifyEventArea('Gravar Daffy Duck in Hollywood')).toBe(AreaSlug.content)
      expect(classifyEventArea('Edição de vídeo')).toBe(AreaSlug.content)
    })

    it('deve classificar saúde e treino corretamente', () => {
      expect(classifyEventArea('Academia - pernas')).toBe(AreaSlug.health)
      expect(classifyEventArea('Consulta com cardiologista')).toBe(AreaSlug.health)
    })

    it('deve classificar tempo pessoal corretamente', () => {
      expect(classifyEventArea('Jantar com Luana')).toBe(AreaSlug.personal)
      expect(classifyEventArea('Assistir série')).toBe(AreaSlug.personal)
    })

    it('deve classificar estudos corretamente', () => {
      expect(classifyEventArea('Curso de TypeScript avançado')).toBe(AreaSlug.study)
      expect(classifyEventArea('Leitura de livro de arquitetura')).toBe(AreaSlug.study)
    })

    it('deve cair no padrão personal caso não encontre palavra-chave', () => {
      expect(classifyEventArea('Ir ao supermercado')).toBe(AreaSlug.personal)
    })
  })

  describe('analyzeDayEvents', () => {
    it('deve calcular sumários de tempo por área e sinalizar treinos', () => {
      const date = new Date('2026-07-09T00:00:00Z')
      const events: CalendarEvent[] = [
        {
          id: '1',
          title: 'Daily Macle',
          start: new Date('2026-07-09T09:00:00Z'),
          end: new Date('2026-07-09T09:30:00Z'), // 30min
          isAllDay: false,
        },
        {
          id: '2',
          title: 'Zestify refactor',
          start: new Date('2026-07-09T19:00:00Z'),
          end: new Date('2026-07-09T20:30:00Z'), // 90min
          isAllDay: false,
        },
        {
          id: '3',
          title: 'Academia treino de ombro',
          start: new Date('2026-07-09T21:00:00Z'),
          end: new Date('2026-07-09T22:00:00Z'), // 60min
          isAllDay: false,
        },
      ]

      const analysis = analyzeDayEvents(date, events)

      expect(analysis.totalDurationMinutes).toBe(180)
      
      const work = analysis.areas.find((a) => a.areaSlug === AreaSlug.work)
      expect(work?.durationMinutes).toBe(30)

      const business = analysis.areas.find((a) => a.areaSlug === AreaSlug.business)
      expect(business?.durationMinutes).toBe(90)

      const health = analysis.areas.find((a) => a.areaSlug === AreaSlug.health)
      expect(health?.durationMinutes).toBe(60)

      expect(analysis.hasWorkout).toBe(true)
      expect(analysis.isHeavyWorkDay).toBe(false)
    })

    it('deve sinalizar dia pesado de trabalho se Macle exceder 8h', () => {
      const date = new Date('2026-07-09T00:00:00Z')
      const events: CalendarEvent[] = [
        {
          id: '1',
          title: 'Macle Sistemas expediente',
          start: new Date('2026-07-09T08:00:00Z'),
          end: new Date('2026-07-09T17:00:00Z'), // 9 horas (540 minutos)
          isAllDay: false,
        },
      ]

      const analysis = analyzeDayEvents(date, events)

      expect(analysis.isHeavyWorkDay).toBe(true)
    })
  })
})
