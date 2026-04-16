import { Client, Message, ChannelType } from 'discord.js'
import { Interpreter } from '../../ai/interpreter'
import { buildUserContext } from '../context'
import { applyIntent } from '../intent-handler'

export function registerMessageCreate(client: Client, interpreter: Interpreter) {
  client.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return

    const isDM = message.channel.type === ChannelType.DM
    const isMention = client.user ? message.mentions.has(client.user.id) : false

    if (!isDM && !isMention) return

    const allowedUser = process.env.DISCORD_USER_ID
    if (allowedUser && message.author.id !== allowedUser) return

    const content = stripMention(message.content, client.user?.id)
    if (!content.trim()) return

    try {
      await message.channel.sendTyping()
      const context = await buildUserContext(message.author.id)
      const intent = await interpreter.interpret(content, context)
      await applyIntent(intent, message.author.id)
      await message.reply(intent.response)
    } catch (err) {
      console.error('Erro ao processar mensagem:', err)
      await message.reply(
        'Deu um ruído na linha (kachak!). Tenta de novo daqui a pouco — ou checa meus logs.'
      )
    }
  })
}

function stripMention(content: string, botId?: string): string {
  if (!botId) return content
  return content.replace(new RegExp(`<@!?${botId}>`, 'g'), '').trim()
}
