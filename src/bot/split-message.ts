import { ChatInputCommandInteraction, Message } from 'discord.js'

export const DISCORD_MESSAGE_LIMIT = 2000

// Responde uma interação já deferida, fatiando em múltiplas mensagens se preciso.
export async function editReplyInChunks(
  interaction: ChatInputCommandInteraction,
  text: string
): Promise<void> {
  const [first, ...rest] = splitDiscordMessage(text)
  await interaction.editReply(first)
  for (const chunk of rest) {
    await interaction.followUp(chunk)
  }
}

// Responde uma mensagem (DM/menção), fatiando em múltiplas mensagens se preciso.
export async function replyInChunks(message: Message, text: string): Promise<void> {
  const [first, ...rest] = splitDiscordMessage(text)
  await message.reply(first)
  for (const chunk of rest) {
    if ('send' in message.channel) await message.channel.send(chunk)
  }
}

// Fatia um texto em blocos que respeitam o limite de 2000 chars do Discord,
// preferindo quebrar em parágrafos, depois em linhas, e só então cortando duro.
export function splitDiscordMessage(text: string): string[] {
  if (text.length <= DISCORD_MESSAGE_LIMIT) return [text]

  const chunks: string[] = []
  let current = ''

  const flush = () => {
    if (current.trim().length > 0) chunks.push(current)
    current = ''
  }

  const append = (piece: string, separator: string) => {
    const candidate = current.length > 0 ? `${current}${separator}${piece}` : piece
    if (candidate.length <= DISCORD_MESSAGE_LIMIT) {
      current = candidate
      return
    }
    flush()
    if (piece.length <= DISCORD_MESSAGE_LIMIT) {
      current = piece
      return
    }
    if (separator === '\n\n') {
      for (const line of piece.split('\n')) append(line, '\n')
      return
    }
    for (let i = 0; i < piece.length; i += DISCORD_MESSAGE_LIMIT) {
      flush()
      current = piece.slice(i, i + DISCORD_MESSAGE_LIMIT)
    }
  }

  for (const paragraph of text.split('\n\n')) {
    append(paragraph, '\n\n')
  }
  flush()

  return chunks
}
