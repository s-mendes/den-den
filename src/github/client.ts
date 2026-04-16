import { Octokit } from '@octokit/rest'

export class GitHubClient {
  private octokit: Octokit

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token })
  }

  async listOpenIssues(owner: string, repo: string) {
    const { data } = await this.octokit.issues.listForRepo({
      owner,
      repo,
      state: 'open',
      per_page: 50,
    })
    return data.filter((i) => !i.pull_request)
  }

  async listMilestones(owner: string, repo: string) {
    const { data } = await this.octokit.issues.listMilestones({
      owner,
      repo,
      state: 'open',
      per_page: 50,
    })
    return data
  }

  async updateMilestoneDueDate(owner: string, repo: string, milestoneNumber: number, newDueDate: Date) {
    return this.octokit.issues.updateMilestone({
      owner,
      repo,
      milestone_number: milestoneNumber,
      due_on: newDueDate.toISOString(),
    })
  }

  async countCommitsToday(owner: string, repo: string, author?: string): Promise<number> {
    const since = new Date()
    since.setHours(0, 0, 0, 0)
    try {
      const { data } = await this.octokit.repos.listCommits({
        owner,
        repo,
        since: since.toISOString(),
        author,
        per_page: 100,
      })
      return data.length
    } catch {
      return 0
    }
  }

  async getLastCommitDate(owner: string, repo: string): Promise<Date | null> {
    try {
      const { data } = await this.octokit.repos.listCommits({
        owner,
        repo,
        per_page: 1,
      })
      const commit = data[0]
      const dateStr = commit?.commit.author?.date ?? commit?.commit.committer?.date
      return dateStr ? new Date(dateStr) : null
    } catch {
      return null
    }
  }
}

let cachedClient: GitHubClient | null = null

export function getGitHubClient(): GitHubClient | null {
  if (cachedClient) return cachedClient
  const token = process.env.GITHUB_TOKEN
  if (!token) return null
  cachedClient = new GitHubClient(token)
  return cachedClient
}
