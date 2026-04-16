import { prisma } from './db'

export interface UpdateProfileInput {
  name?: string
  currentEmployer?: string
  currentRole?: string
  longTermGoals?: string[]
}

export const profileService = {
  async getOrCreate(discordUserId: string) {
    const existing = await prisma.profile.findUnique({ where: { discordUserId } })
    if (existing) return existing
    return prisma.profile.create({ data: { discordUserId } })
  },

  async update(discordUserId: string, input: UpdateProfileInput) {
    const profile = await this.getOrCreate(discordUserId)
    return prisma.profile.update({
      where: { id: profile.id },
      data: {
        name: input.name ?? profile.name,
        currentEmployer: input.currentEmployer ?? profile.currentEmployer,
        currentRole: input.currentRole ?? profile.currentRole,
        longTermGoals: input.longTermGoals
          ? JSON.stringify(input.longTermGoals)
          : profile.longTermGoals,
      },
    })
  },

  async getLongTermGoals(discordUserId: string): Promise<string[]> {
    const profile = await this.getOrCreate(discordUserId)
    if (!profile.longTermGoals) return []
    try {
      return JSON.parse(profile.longTermGoals)
    } catch {
      return []
    }
  },
}
