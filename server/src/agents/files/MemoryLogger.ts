import fs from 'fs-extra'
import os from 'os'
import path from 'path'

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export class MemoryLogger {
  private memoryDir: string

  constructor(private agentId: string) {
    this.memoryDir = path.join(os.homedir(), '.openpaw', 'agents', agentId, 'memory')
  }

  async append(entry: string): Promise<void> {
    await fs.ensureDir(this.memoryDir)

    const now = new Date()
    const filePath = path.join(this.memoryDir, `${toDateKey(now)}.md`)
    const timestamp = now.toISOString().slice(11, 19)
    const line = `- [${timestamp}] ${entry.trim()}\n`

    await fs.appendFile(filePath, line, 'utf8')
  }

  async readRecent(days: number): Promise<Array<{ date: string; content: string }>> {
    await fs.ensureDir(this.memoryDir)
    const items: Array<{ date: string; content: string }> = []

    for (let index = 0; index < days; index += 1) {
      const date = new Date()
      date.setDate(date.getDate() - index)
      const dateKey = toDateKey(date)
      const filePath = path.join(this.memoryDir, `${dateKey}.md`)

      if (await fs.pathExists(filePath)) {
        items.push({
          date: dateKey,
          content: await fs.readFile(filePath, 'utf8'),
        })
      }
    }

    return items
  }

  async getLatestDate(): Promise<string | null> {
    await fs.ensureDir(this.memoryDir)
    const entries = await fs.readdir(this.memoryDir)
    const dates = entries
      .filter((entry) => /^\d{4}-\d{2}-\d{2}\.md$/.test(entry))
      .map((entry) => entry.replace(/\.md$/, ''))
      .sort()

    return dates.at(-1) ?? null
  }
}
