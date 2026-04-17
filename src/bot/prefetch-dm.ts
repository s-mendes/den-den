import { Client } from 'discord.js'

export async function prefetchDMChannel(client: Client, userId: string): Promise<void> {
  const user = await client.users.fetch(userId)
  await user.createDM()
  console.log(`📬 Canal de DM com ${user.tag} pré-carregado.`)
}
