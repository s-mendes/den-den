import 'dotenv/config'
import { createAIProvider } from './ai/factory'
import { Interpreter } from './ai/interpreter'
import { Planner } from './ai/planner'
import { DenDenBot } from './bot'
import { Scheduler } from './scheduler/jobs'
import { prisma } from './services/db'

async function main() {
  const token = requireEnv('DISCORD_TOKEN')
  const clientId = requireEnv('DISCORD_CLIENT_ID')
  const guildId = process.env.DISCORD_GUILD_ID
  const targetUserId = requireEnv('DISCORD_USER_ID')

  const ai = createAIProvider()
  console.log(`🤖 Provedor de IA: ${process.env.AI_PROVIDER || 'gemini'}`)

  const interpreter = new Interpreter(ai)
  const planner = new Planner(ai)

  const bot = new DenDenBot(token, clientId, guildId, interpreter, planner)

  await bot.registerSlashCommandsWithDiscord()
  await bot.login()

  const scheduler = new Scheduler(bot.getClient(), planner, targetUserId)
  scheduler.start()

  const shutdown = async () => {
    console.log('Encerrando...')
    await prisma.$disconnect()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} não definida no .env`)
  return value
}

main().catch((err) => {
  console.error('Falha ao iniciar Den Den:', err)
  process.exit(1)
})
