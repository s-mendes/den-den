import { describe, it, expect } from 'vitest'
import { pickBestByTitle } from './title-match'

interface Item {
  title: string
}

const get = (i: Item) => i.title

describe('pickBestByTitle', () => {
  it('casa título exato ignorando caixa e acentos', () => {
    const items: Item[] = [{ title: 'Gravação de Vídeo' }, { title: 'Ler 10 livros' }]

    expect(pickBestByTitle(items, get, 'gravacao de video')).toEqual({ title: 'Gravação de Vídeo' })
  })

  it('casa por sobreposição de palavras significativas (>3 letras)', () => {
    const items: Item[] = [{ title: 'Ler 10 livros' }, { title: 'Correr 5km por semana' }]

    expect(pickBestByTitle(items, get, 'finalizei a meta dos livros')).toEqual({ title: 'Ler 10 livros' })
  })

  it('retorna null quando nenhum item casa', () => {
    const items: Item[] = [{ title: 'Ler 10 livros' }, { title: 'Correr 5km' }]

    expect(pickBestByTitle(items, get, 'xablau')).toBeNull()
  })

  it('retorna null para lista vazia', () => {
    expect(pickBestByTitle([], get, 'qualquer coisa')).toBeNull()
  })

  it('desempata pelo maior número de palavras coincidentes', () => {
    const items: Item[] = [{ title: 'Estudar inglês' }, { title: 'Estudar inglês avançado no curso' }]

    expect(pickBestByTitle(items, get, 'estudar inglês avançado')).toEqual({
      title: 'Estudar inglês avançado no curso',
    })
  })

  it('palavras curtas (<=3 letras) não geram falso match', () => {
    const items: Item[] = [{ title: 'Ler 10 livros' }]

    expect(pickBestByTitle(items, get, 'foi um dia bom')).toBeNull()
  })
})
