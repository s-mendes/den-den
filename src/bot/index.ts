import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  Collection,
  ChatInputCommandInteraction,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js'
import { Interpreter } from '../ai/interpreter'
import { Planner } from '../ai/planner'
import { registerMessageCreate } from './events/messageCreate'
import { prefetchDMChannel } from './prefetch-dm'

import * as todayCmd from './commands/today'
import * as planCmd from './commands/plan'
import * as statusCmd from './commands/status'
import * as delayCmd from './commands/delay'

interface CommandData {
  name: string
  toJSON: () => RESTPostAPIChatInputApplicationCommandsJSONBody
}

type CommandModule = {
  data: CommandData
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>
}

export class DenDenBot {
  private client: Client
  private commands: Collection<string, CommandModule> = new Collection()
  private token: string
  private clientId: string
  private guildId?: string

  constructor(
    token: string,
    clientId: string,
    guildId: string | undefined,
    private interpreter: Interpreter,
    private planner: Planner
  ) {
    this.token = token
    this.clientId = clientId
    this.guildId = guildId

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Channel, Partials.Message],
    })

    this.registerCommands()
    this.registerHandlers()
  }

  private registerCommands() {
    const modules: CommandModule[] = [
      { data: todayCmd.data, execute: todayCmd.createExecute(this.planner) },
      { data: planCmd.data, execute: planCmd.createExecute(this.planner) },
      { data: statusCmd.data, execute: statusCmd.execute },
      { data: delayCmd.data, execute: delayCmd.execute },
    ]
    for (const m of modules) this.commands.set(m.data.name, m)
  }

  private registerHandlers() {
    this.client.once('ready', () => {
      console.log(`🐚 Den Den online como ${this.client.user?.tag}`)
    })

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return
      const cmd = this.commands.get(interaction.commandName)
      if (!cmd) return

      const allowedUser = process.env.DISCORD_USER_ID
      if (allowedUser && interaction.user.id !== allowedUser) {
        await interaction.reply({ content: 'Este Den Den é pessoal.', ephemeral: true })
        return
      }

      try {
        await cmd.execute(interaction)
      } catch (err) {
        console.error(`Erro no comando /${interaction.commandName}:`, err)
        const payload = { content: 'Deu um ruído na linha (kachak!). Tenta de novo.' }
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(payload)
        } else {
          await interaction.reply({ ...payload, ephemeral: true })
        }
      }
    })

    registerMessageCreate(this.client, this.interpreter)
  }

  async registerSlashCommandsWithDiscord() {
    const rest = new REST({ version: '10' }).setToken(this.token)
    const commandsJSON = Array.from(this.commands.values()).map((c) => c.data.toJSON())
    const route = this.guildId
      ? Routes.applicationGuildCommands(this.clientId, this.guildId)
      : Routes.applicationCommands(this.clientId)
    await rest.put(route, { body: commandsJSON })
    console.log(`✅ ${commandsJSON.length} slash commands registrados.`)
  }

  async login() {
    await this.client.login(this.token)
    // DMs criadas antes do bot estar online não geram CHANNEL_CREATE — sem este
    // prefetch o discord.js descarta messageCreate pra esse canal silenciosamente.
    const userId = process.env.DISCORD_USER_ID
    if (userId) {
      await prefetchDMChannel(this.client, userId)
    }
  }

  getClient(): Client {
    return this.client
  }
}
