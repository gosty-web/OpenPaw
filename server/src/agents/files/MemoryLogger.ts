import fs from 'fs-extra';
import os from 'os';
import path from 'path';

/**
 * Manages daily memory log files for an agent.
 */
export class MemoryLogger {
  private memoryDir: string;

  constructor(agentId: string) {
    this.memoryDir = path.join(os.homedir(), '.openpaw', 'agents', agentId, 'memory');
  }

  /**
   * Appends a timestamped entry to today's memory log file.
   */
  async append(entry: string): Promise<void> {
    await fs.ensureDir(this.memoryDir);
    const dateStr = new Date().toISOString().split('T')[0];
    const filePath = path.join(this.memoryDir, `${dateStr}.md`);
    const timestamp = new Date().toLocaleTimeString();
    const line = `[${timestamp}] ${entry}\n`;
    
    await fs.appendFile(filePath, line);
  }

  /**
   * Reads memory logs from the last N days.
   */
  async readRecent(days: number): Promise<string[]> {
    if (!await fs.pathExists(this.memoryDir)) return [];

    const files = await fs.readdir(this.memoryDir);
    const sortedLogFiles = files
      .filter(f => f.endsWith('.md'))
      .sort((a, b) => b.localeCompare(a)); // Newest first

    const result: string[] = [];
    const targetCount = Math.min(days, sortedLogFiles.length);

    for (let i = 0; i < targetCount; i++) {
      const content = await fs.readFile(path.join(this.memoryDir, sortedLogFiles[i]), 'utf-8');
      result.push(content);
    }

    return result;
  }

  /**
   * Returns the date of the most recent log file.
   */
  async getLatestDate(): Promise<string | null> {
    if (!await fs.pathExists(this.memoryDir)) return null;

    const files = await fs.readdir(this.memoryDir);
    const logFiles = files.filter(f => f.endsWith('.md')).sort();
    
    if (logFiles.length === 0) return null;
    return logFiles[logFiles.length - 1].replace('.md', '');
  }
}
