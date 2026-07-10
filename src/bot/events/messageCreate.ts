import { Client, Message, ChannelType } from 'discord.js'
import { Interpreter } from '../../ai/interpreter'
import { buildUserContext } from '../context'
import { applyIntent } from '../intent-handler'
import { replyInChunks } from '../split-message'

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
      if ('sendTyping' in message.channel) {
        await message.channel.sendTyping()
      }
      const context = await buildUserContext(message.author.id)

      // Recupera as últimas 10 mensagens do canal para usar como memória de curto prazo
      const channelMessages = await message.channel.messages.fetch({ limit: 10 })
      const history = Array.from(channelMessages.values())
        .filter((msg) => msg.id !== message.id) // ignora a mensagem atual
        .reverse() // ordem cronológica (mais antigo primeiro)
        .map((msg) => ({
          role: msg.author.id === client.user?.id ? ('assistant' as const) : ('user' as const),
          content: stripMention(msg.content, client.user?.id),
        }))
        .filter((msg) => msg.content.trim() !== '')

      const intent = await interpreter.interpret(content, context, history)
      const result = await applyIntent(intent, message.author.id, context)
      // A reply determinística reflete o que de fato aconteceu; sem ela, vale a response do LLM
      await replyInChunks(message, result.reply ?? intent.response)
    } catch (err) {
      console.error('Erro ao processar mensagem:', err)
      await message.reply(
        'Opa, minha linha tá meio chiada agora (kachak kachak!). A IA pediu um tempinho — me chama de novo daqui a uns minutos, tá? 🐚'
      )
    }
  })
}

function stripMention(content: string, botId?: string): string {
  if (!botId) return content
  return content.replace(new RegExp(`<@!?${botId}>`, 'g'), '').trim()
}
