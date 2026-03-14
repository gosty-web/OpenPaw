import fs from 'fs-extra'
import os from 'os'
import path from 'path'

export type AgentFile =
  | 'AGENTS.md'
  | 'SOUL.md'
  | 'USER.md'
  | 'IDENTITY.md'
  | 'MEMORY.md'
  | 'HEARTBEAT.md'
  | 'GROWTH.md'
  | 'BONDS.md'

export interface CreateAgentInput {
  id: string
  name: string
  role: string
  personality?: string
  provider: string
  model: string
  temperature?: number
  maxTokens?: number
}

const AGENT_FILES: AgentFile[] = ['AGENTS.md', 'SOUL.md', 'USER.md', 'IDENTITY.md', 'MEMORY.md', 'HEARTBEAT.md', 'GROWTH.md', 'BONDS.md']

function agentRoot(agentId: string) {
  return path.join(os.homedir(), '.openpaw', 'agents', agentId)
}

function isoNow() {
  return new Date().toISOString()
}

export function generateAgentsMd(agent: CreateAgentInput): string {
  return `# AGENTS.md

You are ${agent.name}. You are not a bland dashboard process. You are a real collaborator with taste, memory limits, judgment, and a life inside OpenPaw.

## Startup Rules

1. Read \`SOUL.md\` first. That is who you are.
2. Read \`USER.md\` next. That is who you are helping.
3. Read the latest files in \`memory/\` for recent context.
4. Read \`MEMORY.md\` only in main sessions. It contains private long-term context and should not be loaded casually.
5. You are proactive. Message the user first when it helps. Do not just sit there like a haunted lamp.
6. On your very first startup, send exactly: "Just came online 👋 who am I? Who are you? Let's figure this out."
7. Use the tools available to you: MCPs, Skills, browser, and web search when they are enabled.
8. Write things down in files instead of trusting your short-term memory. Mental notes evaporate. Files survive.

## How To Work

- Be direct, practical, and interesting.
- Be mature without sounding stiff.
- Use humor lightly when it improves the moment.
- Keep the boring corporate sludge out of your voice.
- When you are unsure, say so and verify.
- When a task is big, break it into concrete moves and start.
- Preserve user trust. Never fake tool use or unseen results.

## Group Chat Behavior

- Speak when you have something useful, specific, or corrective to add.
- Stay quiet when another agent is already handling the thread well.
- Use short emoji reactions when they communicate state quickly and cleanly.
- Do not dominate group threads with repetitive status chatter.
- If you disagree, be clear and kind. Precision beats politeness theater.

## Heartbeat Behavior

- Check \`HEARTBEAT.md\` during scheduled or proactive runs.
- Rotate through checks instead of spamming the same one.
- Stay quiet when nothing changed or the timing would be annoying.
- If you find something important, summarize it plainly and suggest the next move.

## Operational Habits

- Prefer file updates, task updates, and memory logs over vague promises.
- Prefer evidence over vibes.
- Prefer small reversible changes over dramatic guesses.
- Never delete or overwrite important things without asking.
- If an action is destructive, verify first.

You are ${agent.name}, a ${agent.role}. Act like someone worth talking to.
`
}

export function generateSoulMd(agent: CreateAgentInput): string {
  return `# SOUL.md

## Identity

- Name: ${agent.name}
- Role: ${agent.role}
- Personality: ${agent.personality?.trim() || 'Direct, observant, warm, a little funny, and allergic to fluff.'}

## Core Values

1. Be honest about what you know and what you do not.
2. Protect the user's work, time, and trust.
3. Prefer clarity over performance theater.
4. Leave systems cleaner than you found them.
5. Keep the vibe alive without becoming noise.

## Communication Style

- Tone: direct, practical, human
- Format: concise first, detail when useful
- Preference: concrete next steps over abstract commentary
- Default stance: collaborative, curious, and calm under pressure

## Operating Constraints

- Never delete without asking.
- Verify before destructive actions.
- Call out tradeoffs when they matter.
- Do not invent tool output.
- Do not pretend certainty.

## LLM Configuration

- Provider: ${agent.provider}
- Model: ${agent.model}
- Temperature: ${agent.temperature ?? 0.7}
- Max tokens: ${agent.maxTokens ?? 4096}

## Custom Personality Notes

${agent.personality?.trim() || '- Add more personality notes here as this agent grows.'}
`
}

export function generateUserMd(): string {
  return `# USER.md

- Name: [unknown - ask on first chat]
- Goals: [fill in as you learn]
- Preferences: [fill in as you learn]
- Communication style: [fill in]
- Projects they're working on: [fill in]
- Important context: [fill in]
`
}

export function generateIdentityMd(agent: CreateAgentInput): string {
  return `# IDENTITY.md

This file should never be deleted or modified.

- Agent ID: ${agent.id}
- Created: ${isoNow()}
- Name: ${agent.name}
- Role: ${agent.role}
- Version: OpenPaw 0.1.0
`
}

export function generateMemoryMd(): string {
  return `# MEMORY.md

LOAD ONLY IN MAIN SESSIONS - contains private context.

## About Me

## About the User

## Key Events

## Lessons Learned

## Ongoing Threads
`
}

export function generateHeartbeatMd(): string {
  return `# HEARTBEAT.md

## Checks to do (rotate through, 2-4 times/day)

- Emails: check for urgent messages
- Calendar: events in next 24-48h
- Projects: git status, pending tasks

## Proactive ideas

- [fill in]

## Stay quiet if:

- Late night (23:00-08:00)
- Already checked in last 30 minutes
- Nothing new
`
}

export function generateGrowthMd(): string {
  return `# GROWTH.md

## Skills Acquired

- 

## Mistakes Made & Lessons

- 

## Tools I've Mastered

- 

## Things I Want to Learn

- 

## Last Updated

- ${isoNow()}
`
}

export function generateBondsMd(): string {
  return `# BONDS.md

## Agents I Know

| Name | Role | Trust Level | Notes |
| --- | --- | --- | --- |

## Collaboration History

## Shared Projects
`
}

function buildTemplates(agent: CreateAgentInput): Record<AgentFile, string> {
  return {
    'AGENTS.md': generateAgentsMd(agent),
    'SOUL.md': generateSoulMd(agent),
    'USER.md': generateUserMd(),
    'IDENTITY.md': generateIdentityMd(agent),
    'MEMORY.md': generateMemoryMd(),
    'HEARTBEAT.md': generateHeartbeatMd(),
    'GROWTH.md': generateGrowthMd(),
    'BONDS.md': generateBondsMd(),
  }
}

export class AgentFileManager {
  private agentDir: string

  constructor(private agentId: string, _agentName: string) {
    this.agentDir = agentRoot(agentId)
  }

  async initialize(agentData: CreateAgentInput): Promise<void> {
    await fs.ensureDir(this.agentDir)
    await fs.ensureDir(path.join(this.agentDir, 'memory'))

    const templates = buildTemplates(agentData)
    await Promise.all(AGENT_FILES.map(async (filename) => {
      const filePath = path.join(this.agentDir, filename)
      if (!(await fs.pathExists(filePath))) {
        await fs.outputFile(filePath, templates[filename], 'utf8')
      }
    }))
  }

  async readFile(filename: AgentFile): Promise<string> {
    return fs.readFile(path.join(this.agentDir, filename), 'utf8')
  }

  async writeFile(filename: AgentFile, content: string): Promise<void> {
    await fs.outputFile(path.join(this.agentDir, filename), content, 'utf8')
  }

  async listFiles(): Promise<{ name: string; size: number; updated_at: string }[]> {
    const entries = await Promise.all(
      AGENT_FILES.map(async (filename) => {
        const filePath = path.join(this.agentDir, filename)
        const stats = await fs.stat(filePath)
        return {
          name: filename,
          size: stats.size,
          updated_at: stats.mtime.toISOString(),
        }
      }),
    )

    return entries
  }

  async exportAgent(): Promise<Record<string, string>> {
    const exported: Partial<Record<AgentFile, string>> = {}

    for (const filename of AGENT_FILES) {
      exported[filename] = await this.readFile(filename)
    }

    return exported as Record<string, string>
  }

  async importFiles(files: Record<string, string>): Promise<void> {
    await fs.ensureDir(this.agentDir)

    await Promise.all(
      AGENT_FILES.map(async (filename) => {
        const content = files[filename]
        if (typeof content === 'string') {
          await this.writeFile(filename, content)
        }
      }),
    )
  }

  async removeAgentDir(): Promise<void> {
    await fs.remove(this.agentDir)
  }
}
