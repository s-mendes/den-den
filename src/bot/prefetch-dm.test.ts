import { describe, it, expect, vi } from 'vitest'
import { Client } from 'discord.js'
import { prefetchDMChannel } from './prefetch-dm'

describe('prefetchDMChannel', () => {
  it('busca o usuário pelo id e cria o canal de DM', async () => {
    const createDM = vi.fn().mockResolvedValue({})
    const fetch = vi.fn().mockResolvedValue({ tag: 'robindark', createDM })
    const client = { users: { fetch } } as unknown as Client

    await prefetchDMChannel(client, '251876243904004097')

    expect(fetch).toHaveBeenCalledWith('251876243904004097')
    expect(createDM).toHaveBeenCalledOnce()
  })

  it('propaga erro quando o fetch do usuário falha', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('Unknown User'))
    const client = { users: { fetch } } as unknown as Client

    await expect(prefetchDMChannel(client, 'id-invalido')).rejects.toThrow('Unknown User')
  })
})
