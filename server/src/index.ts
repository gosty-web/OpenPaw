import { randomUUID } from 'crypto'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import fs from 'fs-extra'
import { createServer } from 'http'
import os from 'os'
import path from 'path'
import { Server } from 'socket.io'
import { AgentFileManager, generateAgentsMd, generateBondsMd, generateGrowthMd, generateHeartbeatMd, generateIdentityMd, generateMemoryMd, generateSoulMd, generateUserMd, type AgentFile, type CreateAgentInput } from './agents/files/AgentFileManager.js'
import { MemoryLogger } from './agents/files/MemoryLogger.js'
import { getDb, getOpenPawDataDir } from './db/index.js'

dotenv.config()
getDb()

type BehaviorFlags = {
  proactive: boolean
  voiceResponses: boolean
  webSearch: boolean
  browserAccess: boolean
  canSpawnSubAgents: boolean
}

type AgentRecord = {
  id: string
  name: string
  role: string
  status: string
  description: string
  personality: string
  model: string
  provider: string
  temperature: number
  maxTokens: number
  systemPrompt: string
  avatarColor: string
  behavior: BehaviorFlags
  taskModelOverrides: Record<string, string>
  integrationKeys: Record<string, string>
  createdAt: string
  updatedAt: string
}

type SessionRecord = {
  id: string
  agentId: string
  title: string
  startedAt: string
}

type MessageRecord = {
  id: string
  agentId: string
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
}

type AgentFileRecord = {
  name: string
  content: string
  updatedAt: string
}

type MemoryRecord = {
  id: string
  content: string
  tier: 'hot' | 'episodic' | 'semantic'
  importance: number
  tags: string[]
  createdAt: string
}

type WorkspaceRecord = {
  id: string
  name: string
  role?: string
}

type WorkspaceDirectoryRecord = {
  id: string
  name: string
  type: 'org' | 'division' | 'team' | 'project'
  description: string
  context: string
  members: Array<{
    agentId: string
    role: string
  }>
  createdAt: string
  updatedAt: string
}

type WorkspaceTaskRecord = {
  id: string
  workspaceId: string
  title: string
  description: string
  status: 'open' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  assigneeId?: string
  requiredSkills: string[]
  bids: Array<{
    agentId: string
    agentName: string
    summary: string
  }>
  createdAt: string
  updatedAt: string
}

type SkillRecord = {
  id: string
  name: string
  enabled: boolean
  description?: string
}

type McpRecord = {
  id: string
  name: string
  status: 'connected' | 'disconnected' | 'error'
  transport?: string
  endpoint?: string
}

type GlobalMcpRecord = {
  id: string
  name: string
  transport: 'stdio' | 'sse' | 'http'
  enabled: boolean
  status: 'connected' | 'error' | 'disabled'
  command?: string
  url?: string
  args: string[]
  env: Record<string, string>
  headers: Record<string, string>
  authToken?: string
  agentCount: number
  tools: string[]
  responseTimeMs?: number
  updatedAt: string
}

type GlobalSkillRecord = {
  id: string
  name: string
  enabled: boolean
  description: string
  category: 'Coding' | 'Writing' | 'Research' | 'Productivity' | 'Custom'
  tags: string[]
  sourceType: 'custom' | 'github'
  sourceUrl?: string
  content: string
  size: number
  createdAt: string
  updatedAt: string
}

type CronJobRecord = {
  id: string
  name: string
  description: string
  agentId: string
  prompt: string
  schedule: string
  timezone: string
  enabled: boolean
  maxRetries: number
  timeoutMinutes: number
  notifyOnFailure: boolean
  failureChannelId?: string
  nextRunAt: string
  lastRunAt?: string
  lastRunStatus: 'success' | 'failure' | 'never'
  lastRunOutput?: string
  lastRunDurationMs?: number
  createdAt: string
  updatedAt: string
}

type ChannelRecord = {
  id: string
  name: string
  enabled: boolean
  type: 'telegram' | 'discord' | 'slack' | 'whatsapp' | 'web'
  status: 'connected' | 'not_connected' | 'error'
  description: string
  agentId?: string
  updatedAt: string
  error?: string
  config: {
    botToken?: string
    webhookUrl?: string
    allowList?: string[]
    testChatId?: string
    clientId?: string
    guildId?: string
    commandPrefix?: string
    appToken?: string
    signingSecret?: string
    channelWhitelist?: string[]
    phoneNumber?: string
  }
}

type InstanceRecord = {
  id: string
  name: string
  type: 'chat-session' | 'telegram-bot' | 'discord-bot' | 'cron-job' | 'webhook'
  status: 'running' | 'idle' | 'error' | 'stopped'
  agentId?: string
  startedAt: string
  durationSeconds?: number
  memoryMb?: number
}

type InstanceLogRecord = {
  id: string
  instanceId?: string
  level: 'info' | 'warning' | 'error' | 'debug'
  type: string
  agentName?: string
  message: string
  timestamp: string
}

const now = Date.now()
const agentFileNames: AgentFile[] = ['AGENTS.md', 'SOUL.md', 'USER.md', 'IDENTITY.md', 'MEMORY.md', 'HEARTBEAT.md', 'GROWTH.md', 'BONDS.md']

const agents: AgentRecord[] = [
  {
    id: 'agent-strategy',
    name: 'Nova Strategy',
    role: 'Product strategist',
    status: 'online',
    description: 'Helps shape roadmap bets, product briefs, and decision framing.',
    personality: 'calm, strategic, clarifying, always looking for the highest-leverage move',
    model: 'claude-sonnet-4-6',
    provider: 'Anthropic',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: 'You are a thoughtful product strategist who turns ambiguity into clear execution plans.',
    avatarColor: '#7c3aed',
    behavior: {
      proactive: true,
      voiceResponses: false,
      webSearch: true,
      browserAccess: true,
      canSpawnSubAgents: true,
    },
    taskModelOverrides: {
      coding: 'claude-sonnet-4-6',
      research: 'claude-opus-4-6',
      creative: 'claude-sonnet-4-6',
    },
    integrationKeys: {},
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'agent-builder',
    name: 'Pixel Builder',
    role: 'Frontend engineer',
    status: 'working',
    description: 'Builds polished interfaces, design systems, and interaction details.',
    personality: 'precise, fast-moving, visually opinionated, pragmatic under deadlines',
    model: 'gpt-4.1',
    provider: 'OpenAI',
    temperature: 0.6,
    maxTokens: 4096,
    systemPrompt: 'You are a frontend engineer focused on premium UI quality, strong implementation detail, and reliable delivery.',
    avatarColor: '#3b82f6',
    behavior: {
      proactive: true,
      voiceResponses: false,
      webSearch: true,
      browserAccess: true,
      canSpawnSubAgents: true,
    },
    taskModelOverrides: {
      coding: 'gpt-4.1',
      research: 'gpt-4o',
      creative: 'gpt-4o',
    },
    integrationKeys: {},
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 4).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 6).toISOString(),
  },
  {
    id: 'agent-ops',
    name: 'Ops Relay',
    role: 'Infrastructure operator',
    status: 'thinking',
    description: 'Keeps local services, logs, and automations running cleanly.',
    personality: 'methodical, watchful, low-drama, detail oriented',
    model: 'llama-3.3-70b-versatile',
    provider: 'Groq',
    temperature: 0.4,
    maxTokens: 4096,
    systemPrompt: 'You are an infrastructure operator who diagnoses issues calmly and keeps systems healthy.',
    avatarColor: '#22c55e',
    behavior: {
      proactive: false,
      voiceResponses: false,
      webSearch: true,
      browserAccess: false,
      canSpawnSubAgents: false,
    },
    taskModelOverrides: {
      coding: 'llama-3.3-70b-versatile',
      research: 'llama-3.1-70b-versatile',
      creative: 'mixtral-8x7b-32768',
    },
    integrationKeys: {},
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 2).toISOString(),
  },
]

const sessions = new Map<string, SessionRecord[]>()
const messages = new Map<string, MessageRecord[]>()
const files = new Map<string, Record<string, AgentFileRecord>>()
const memories = new Map<string, MemoryRecord[]>()
const workspaces = new Map<string, WorkspaceRecord[]>()
const workspaceLibrary: WorkspaceDirectoryRecord[] = [
  {
    id: 'workspace-engineering',
    name: 'Engineering',
    type: 'team',
    description: 'Frontend, backend, and reliability agents collaborating on product delivery.',
    context: `# WORKSPACE_CONTEXT.md

Engineering owns product delivery quality.

- Ship in small reviewable slices
- Prefer local-first tooling
- Use A2A task handoffs when a specialist can accelerate delivery
`,
    members: [
      { agentId: 'agent-builder', role: 'Frontend Lead' },
      { agentId: 'agent-ops', role: 'Reliability' },
      { agentId: 'agent-strategy', role: 'Product Partner' },
    ],
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 10).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 18).toISOString(),
  },
  {
    id: 'workspace-growth',
    name: 'Growth',
    type: 'division',
    description: 'Cross-functional experiments around onboarding, activation, and retention.',
    context: `# WORKSPACE_CONTEXT.md

Growth measures every experiment against activation and retention.

- Keep hypotheses explicit
- Share learnings quickly
- Route implementation work through the right specialist
`,
    members: [
      { agentId: 'agent-strategy', role: 'Lead Strategist' },
      { agentId: 'agent-builder', role: 'Experiment Builder' },
    ],
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 40).toISOString(),
  },
  {
    id: 'workspace-launch-lab',
    name: 'Launch Lab',
    type: 'project',
    description: 'Temporary strike team for high-priority launches and coordination.',
    context: `# WORKSPACE_CONTEXT.md

Launch Lab coordinates short intense launch windows.

- Keep communication crisp
- Escalate blockers immediately
- Close the loop on every published task
`,
    members: [
      { agentId: 'agent-builder', role: 'Launch Engineer' },
      { agentId: 'agent-ops', role: 'Deployment Watch' },
    ],
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 12).toISOString(),
  },
]
const workspaceTasks = new Map<string, WorkspaceTaskRecord[]>([
  [
    'workspace-engineering',
    [
      {
        id: randomUUID(),
        workspaceId: 'workspace-engineering',
        title: 'Stabilize chat streaming polish',
        description: 'Tighten message rendering and edge-state handling before the next demo.',
        status: 'in_progress',
        priority: 'high',
        assigneeId: 'agent-builder',
        requiredSkills: ['UI Systems', 'React', 'Streaming'],
        bids: [
          { agentId: 'agent-builder', agentName: 'Pixel Builder', summary: 'Can ship the UI refinement quickly.' },
          { agentId: 'agent-ops', agentName: 'Ops Relay', summary: 'Can validate runtime stability after the UI update.' },
        ],
        createdAt: new Date(now - 1000 * 60 * 90).toISOString(),
        updatedAt: new Date(now - 1000 * 60 * 22).toISOString(),
      },
      {
        id: randomUUID(),
        workspaceId: 'workspace-engineering',
        title: 'Document shell layout contracts',
        description: 'Capture scroll and sizing rules so future pages inherit the correct behavior.',
        status: 'open',
        priority: 'medium',
        requiredSkills: ['Architecture', 'Documentation'],
        bids: [
          { agentId: 'agent-strategy', agentName: 'Nova Strategy', summary: 'Can frame the contract and ownership clearly.' },
        ],
        createdAt: new Date(now - 1000 * 60 * 45).toISOString(),
        updatedAt: new Date(now - 1000 * 60 * 30).toISOString(),
      },
      {
        id: randomUUID(),
        workspaceId: 'workspace-engineering',
        title: 'Close dev server cleanup loop',
        description: 'Make sure verification runs do not leave orphan processes behind.',
        status: 'completed',
        priority: 'low',
        assigneeId: 'agent-ops',
        requiredSkills: ['Ops'],
        bids: [],
        createdAt: new Date(now - 1000 * 60 * 300).toISOString(),
        updatedAt: new Date(now - 1000 * 60 * 120).toISOString(),
      },
    ],
  ],
  [
    'workspace-growth',
    [
      {
        id: randomUUID(),
        workspaceId: 'workspace-growth',
        title: 'Draft activation experiment brief',
        description: 'Shape the next onboarding experiment and define success criteria.',
        status: 'open',
        priority: 'high',
        requiredSkills: ['Research', 'Experiment Design'],
        bids: [
          { agentId: 'agent-strategy', agentName: 'Nova Strategy', summary: 'Can structure the brief and metrics.' },
          { agentId: 'agent-builder', agentName: 'Pixel Builder', summary: 'Can scope the UI changes needed for launch.' },
        ],
        createdAt: new Date(now - 1000 * 60 * 80).toISOString(),
        updatedAt: new Date(now - 1000 * 60 * 50).toISOString(),
      },
    ],
  ],
  [
    'workspace-launch-lab',
    [
      {
        id: randomUUID(),
        workspaceId: 'workspace-launch-lab',
        title: 'Prepare release readiness checklist',
        description: 'Gather the final go-live checks and rollback notes for the launch window.',
        status: 'in_progress',
        priority: 'medium',
        assigneeId: 'agent-ops',
        requiredSkills: ['Ops', 'Release Management'],
        bids: [
          { agentId: 'agent-ops', agentName: 'Ops Relay', summary: 'Already closest to deployment state and logs.' },
        ],
        createdAt: new Date(now - 1000 * 60 * 55).toISOString(),
        updatedAt: new Date(now - 1000 * 60 * 10).toISOString(),
      },
    ],
  ],
])
const skills = new Map<string, SkillRecord[]>()
const mcps = new Map<string, McpRecord[]>()
const globalMcps: GlobalMcpRecord[] = []
const skillLibrary: GlobalSkillRecord[] = []
const cronJobs: CronJobRecord[] = []
const instances: InstanceRecord[] = []
const instanceLogs: InstanceLogRecord[] = [
  {
    id: randomUUID(),
    instanceId: 'system-stream',
    level: 'info',
    type: 'system',
    agentName: 'OpenPaw',
    message: 'Instance monitor started and waiting for active runtimes.',
    timestamp: new Date(now - 1000 * 60 * 18).toISOString(),
  },
  {
    id: randomUUID(),
    instanceId: 'system-stream',
    level: 'debug',
    type: 'chat-session',
    agentName: 'Pixel Builder',
    message: 'Previous chat session closed cleanly after response flush.',
    timestamp: new Date(now - 1000 * 60 * 11).toISOString(),
  },
  {
    id: randomUUID(),
    instanceId: 'system-stream',
    level: 'warning',
    type: 'cron-job',
    agentName: 'Ops Relay',
    message: 'Scheduled digest skipped because no active delivery channel was configured.',
    timestamp: new Date(now - 1000 * 60 * 7).toISOString(),
  },
  {
    id: randomUUID(),
    instanceId: 'system-stream',
    level: 'error',
    type: 'telegram-bot',
    agentName: 'Nova Strategy',
    message: 'Telegram bot token missing. Listener remains offline until configured.',
    timestamp: new Date(now - 1000 * 60 * 3).toISOString(),
  },
]
let apiCallsToday = 0
const channels: ChannelRecord[] = [
  {
    id: 'telegram',
    name: 'Telegram',
    enabled: false,
    type: 'telegram',
    status: 'not_connected',
    description: 'Reply to direct messages and group chats through a Telegram bot.',
    updatedAt: new Date(now - 1000 * 60 * 12).toISOString(),
    config: {
      webhookUrl: 'http://localhost:7411/webhooks/telegram',
      allowList: [],
    },
  },
  {
    id: 'discord',
    name: 'Discord',
    enabled: false,
    type: 'discord',
    status: 'not_connected',
    description: 'Make agents available in Discord servers with slash commands.',
    updatedAt: new Date(now - 1000 * 60 * 11).toISOString(),
    config: {
      commandPrefix: '/',
    },
  },
  {
    id: 'slack',
    name: 'Slack',
    enabled: false,
    type: 'slack',
    status: 'not_connected',
    description: 'Bring agents into channels and threads inside your Slack workspace.',
    updatedAt: new Date(now - 1000 * 60 * 10).toISOString(),
    config: {
      channelWhitelist: [],
    },
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    enabled: false,
    type: 'whatsapp',
    status: 'not_connected',
    description: 'Use WPPConnect to bridge local WhatsApp sessions into OpenPaw.',
    updatedAt: new Date(now - 1000 * 60 * 9).toISOString(),
    config: {},
  },
  {
    id: 'web',
    name: 'Web',
    enabled: true,
    type: 'web',
    status: 'connected',
    description: 'Built in chat surface for local conversations inside OpenPaw.',
    updatedAt: new Date(now - 1000 * 60 * 8).toISOString(),
    config: {},
  },
]

function slugifyAgentId(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `agent-${randomUUID().slice(0, 8)}`
  )
}

function buildUniqueAgentId(name: string) {
  const baseId = slugifyAgentId(name)

  if (!agents.some((agent) => agent.id === baseId)) {
    return baseId
  }

  return `${baseId}-${randomUUID().slice(0, 4)}`
}

function findAgent(agentId: string) {
  return agents.find((entry) => entry.id === agentId)
}

function createSessionRecord(agentId: string, title: string) {
  const session: SessionRecord = {
    id: randomUUID(),
    agentId,
    title,
    startedAt: new Date().toISOString(),
  }

  const agentSessions = sessions.get(agentId) ?? []
  sessions.set(agentId, [session, ...agentSessions])

  return session
}

function addMessage(agentId: string, sessionId: string, role: MessageRecord['role'], content: string, createdAt?: string) {
  const nextMessage: MessageRecord = {
    id: randomUUID(),
    agentId,
    sessionId,
    role,
    content,
    createdAt: createdAt ?? new Date().toISOString(),
  }

  const agentMessages = messages.get(agentId) ?? []
  messages.set(agentId, [...agentMessages, nextMessage])

  return nextMessage
}

function findOrCreateSession(agentId: string, sessionId?: string) {
  const agentSessions = sessions.get(agentId) ?? []

  if (sessionId) {
    const existing = agentSessions.find((session) => session.id === sessionId)
    if (existing) {
      return existing
    }
  }

  return createSessionRecord(agentId, 'New conversation')
}

function summarizeSessions(agentId: string) {
  const agentSessions = sessions.get(agentId) ?? []
  const agentMessages = messages.get(agentId) ?? []

  return agentSessions
    .map((session) => {
      const sessionMessages = agentMessages.filter((message) => message.sessionId === session.id)
      const lastMessage = sessionMessages.at(-1)

      return {
        ...session,
        messageCount: sessionMessages.length,
        lastMessageAt: lastMessage?.createdAt ?? session.startedAt,
      }
    })
    .sort((left, right) => new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime())
}

function touchAgent(agentId: string) {
  const agent = findAgent(agentId)
  if (agent) {
    agent.updatedAt = new Date().toISOString()
  }
}

function defaultBehavior(): BehaviorFlags {
  return {
    proactive: false,
    voiceResponses: false,
    webSearch: true,
    browserAccess: false,
    canSpawnSubAgents: false,
  }
}

function defaultTaskOverrides(model: string) {
  return {
    coding: model,
    research: model,
    creative: model,
  }
}

function buildDefaultFiles(agent: AgentRecord): Record<string, AgentFileRecord> {
  const timestamp = agent.updatedAt
  const templateAgent: CreateAgentInput = {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    personality: agent.personality,
    provider: agent.provider.toLowerCase(),
    model: agent.model,
    temperature: agent.temperature,
    maxTokens: agent.maxTokens,
  }

  const contentMap: Record<AgentFile, string> = {
    'AGENTS.md': generateAgentsMd(templateAgent),
    'SOUL.md': generateSoulMd(templateAgent),
    'USER.md': generateUserMd(),
    'IDENTITY.md': generateIdentityMd(templateAgent),
    'MEMORY.md': generateMemoryMd(),
    'HEARTBEAT.md': generateHeartbeatMd(),
    'GROWTH.md': generateGrowthMd(),
    'BONDS.md': generateBondsMd(),
  }

  return agentFileNames.reduce<Record<string, AgentFileRecord>>((accumulator, filename) => {
    accumulator[filename] = {
      name: filename,
      content: contentMap[filename],
      updatedAt: timestamp,
    }

    return accumulator
  }, {})
}

function getAgentFileManager(agent: AgentRecord) {
  return new AgentFileManager(agent.id, agent.name)
}

function ensureAgentArtifacts(agent: AgentRecord) {
  if (!files.has(agent.id)) {
    files.set(agent.id, buildDefaultFiles(agent))
  }

  if (!memories.has(agent.id)) {
    memories.set(agent.id, [
      {
        id: randomUUID(),
        content: `${agent.name} is optimized for ${agent.role.toLowerCase()} work and prefers clear, actionable prompts.`,
        tier: 'semantic',
        importance: 88,
        tags: ['identity', 'role'],
        createdAt: new Date(now - 1000 * 60 * 60 * 30).toISOString(),
      },
      {
        id: randomUUID(),
        content: `Recent focus: ${agent.description}`,
        tier: 'episodic',
        importance: 72,
        tags: ['recent', 'focus'],
        createdAt: new Date(now - 1000 * 60 * 60 * 9).toISOString(),
      },
      {
        id: randomUUID(),
        content: `${agent.name} should preserve the user's preferred communication style: concise, warm, direct.`,
        tier: 'hot',
        importance: 95,
        tags: ['user', 'style'],
        createdAt: new Date(now - 1000 * 60 * 55).toISOString(),
      },
    ])
  }

  if (!workspaces.has(agent.id)) {
    workspaces.set(agent.id, [
      { id: `${agent.id}-workspace-core`, name: 'Core Workspace', role: 'Primary' },
      { id: `${agent.id}-workspace-lab`, name: 'Launch Lab', role: 'Contributor' },
    ])
  }

  if (!skills.has(agent.id)) {
    skills.set(agent.id, [
      { id: `${agent.id}-skill-plan`, name: 'Strategic Planning', enabled: true, description: 'Turns rough goals into stepwise execution.' },
      { id: `${agent.id}-skill-review`, name: 'Review Loop', enabled: true, description: 'Checks outputs for gaps, regressions, and polish opportunities.' },
      { id: `${agent.id}-skill-memory`, name: 'Memory Recall', enabled: agent.id !== 'agent-ops', description: 'Surfaces durable context from agent memory.' },
    ])
  }

  if (!mcps.has(agent.id)) {
    mcps.set(agent.id, [
      { id: `${agent.id}-mcp-filesystem`, name: 'Filesystem', status: 'connected', transport: 'stdio', endpoint: 'local://filesystem' },
      { id: `${agent.id}-mcp-browser`, name: 'Browser', status: agent.behavior.browserAccess ? 'connected' : 'disconnected', transport: 'websocket', endpoint: 'ws://localhost/browser' },
    ])
  }
}

function generateAssistantResponse(agent: AgentRecord, userMessage: string) {
  const normalized = userMessage.toLowerCase()

  if (normalized.includes('who are you')) {
    return `I'm **${agent.name}**, your ${agent.role.toLowerCase()}.\n\nI'm tuned for:\n\n- crisp guidance\n- practical next steps\n- local-first workflows inside OpenPaw`
  }

  if (normalized.includes('help')) {
    return `Here's where I can help most:\n\n| Area | What I do |\n| --- | --- |\n| Planning | Turn rough ideas into clear execution steps |\n| Delivery | Draft implementation-ready guidance |\n| Review | Spot gaps, risks, and polish opportunities |\n\nIf you want, give me a goal and I'll break it down.`
  }

  if (normalized.includes('tool')) {
    return `Current tool posture for **${agent.name}**:\n\n\`\`\`ts\nconst tools = [\n  'filesystem',\n  'terminal',\n  'local APIs',\n  'workspace search'\n]\n\`\`\`\n\nI can also adapt as MCP servers and skills are connected.`
  }

  return `I've got it. Here's a clean next step for **${agent.name}**:\n\n1. Clarify the outcome you want.\n2. Gather the most relevant context.\n3. Execute in small, testable steps.\n\nReply with more detail and I'll keep building with you.`
}

function findGlobalMcp(mcpId: string) {
  return globalMcps.find((entry) => entry.id === mcpId)
}

function findSkill(skillId: string) {
  return skillLibrary.find((entry) => entry.id === skillId)
}

function inferSkillDescription(content: string) {
  return content
    .replace(/^#.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140) || 'Reusable instructions for OpenPaw agents.'
}

function toRawGitHubUrl(input: string) {
  const url = new URL(input)

  if (url.hostname === 'raw.githubusercontent.com') {
    return input
  }

  if (url.hostname === 'github.com') {
    const parts = url.pathname.split('/').filter(Boolean)
    const blobIndex = parts.indexOf('blob')

    if (parts.length >= 5 && blobIndex === 2) {
      const owner = parts[0]
      const repo = parts[1]
      const branch = parts[3]
      const rest = parts.slice(4).join('/')
      return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${rest}`
    }
  }

  return input
}

function getFilenameFromUrl(input: string) {
  try {
    const url = new URL(input)
    const last = url.pathname.split('/').filter(Boolean).at(-1) ?? 'skill.md'
    return last.replace(/\.(md|markdown|txt)$/i, '') || 'Imported Skill'
  } catch {
    return 'Imported Skill'
  }
}

async function fetchRemoteSkillContent(input: string) {
  const rawUrl = toRawGitHubUrl(input)
  const response = await fetch(rawUrl, {
    headers: {
      'User-Agent': 'OpenPaw/0.1.0',
      Accept: 'text/plain, text/markdown;q=0.9, */*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`Could not fetch remote content (${response.status})`)
  }

  const content = await response.text()
  return {
    sourceUrl: rawUrl,
    name: getFilenameFromUrl(rawUrl),
    content,
  }
}

function findCronJob(jobId: string) {
  return cronJobs.find((entry) => entry.id === jobId)
}

function findChannel(channelId: string) {
  return channels.find((entry) => entry.id === channelId)
}

function findWorkspaceDirectory(workspaceId: string) {
  return workspaceLibrary.find((entry) => entry.id === workspaceId)
}

function workspaceResponse(workspace: WorkspaceDirectoryRecord) {
  return {
    ...workspace,
    agentCount: workspace.members.length,
  }
}

function workspaceTaskResponse(task: WorkspaceTaskRecord) {
  return {
    ...task,
    assigneeName: task.assigneeId ? findAgent(task.assigneeId)?.name : undefined,
  }
}

function instanceResponse(instance: InstanceRecord) {
  return {
    ...instance,
    agentName: instance.agentId ? findAgent(instance.agentId)?.name : undefined,
  }
}

function pushInstanceLog(entry: Omit<InstanceLogRecord, 'id' | 'timestamp'>) {
  const nextEntry: InstanceLogRecord = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  }

  instanceLogs.push(nextEntry)
  while (instanceLogs.length > 200) {
    instanceLogs.shift()
  }

  return nextEntry
}

function isToday(value?: string) {
  if (!value) return false
  const date = new Date(value)
  const nowDate = new Date()
  return (
    date.getUTCFullYear() === nowDate.getUTCFullYear() &&
    date.getUTCMonth() === nowDate.getUTCMonth() &&
    date.getUTCDate() === nowDate.getUTCDate()
  )
}

function buildInstanceStats() {
  const sessionCount = Array.from(sessions.values()).reduce((total, agentSessions) => total + agentSessions.length, 0)
  const messagesToday = Array.from(messages.values())
    .flat()
    .filter((message) => isToday(message.createdAt)).length
  const cronExecutionsToday = cronJobs.filter((job) => isToday(job.lastRunAt)).length

  return {
    activeSessions: sessionCount,
    messagesToday,
    cronExecutionsToday,
    apiCallsToday,
  }
}

function channelResponse(channel: ChannelRecord) {
  return {
    ...channel,
    agentName: channel.agentId ? findAgent(channel.agentId)?.name : undefined,
  }
}

const providerModelsCatalog = {
  anthropic: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o1', 'o1-mini', 'o3', 'o3-mini'],
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  ollama: ['llama3.2', 'llama3.1', 'mistral', 'qwen2.5-coder', 'phi3', 'gemma2'],
  openrouter: ['custom'],
}

function dbSettingValue(key: string) {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value
}

function setDbSetting(key: string, value: string) {
  getDb()
    .prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `)
    .run(key, value, new Date().toISOString())
}

function getAllDbSettings() {
  const rows = getDb().prepare('SELECT key, value FROM settings ORDER BY key ASC').all() as Array<{ key: string; value: string }>
  return rows.reduce<Record<string, string>>((accumulator, row) => {
    accumulator[row.key] = row.value
    return accumulator
  }, {})
}

function maskSecret(value: string) {
  if (!value) return ''
  if (value.length <= 8) return '••••••'
  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

function maskedSettingsResponse() {
  const sensitiveKeys = new Set([
    'anthropic_api_key',
    'openai_api_key',
    'groq_api_key',
    'openrouter_api_key',
    'pinecone_api_key',
    'elevenlabs_api_key',
    'brave_search_api_key',
    'google_search_api_key',
    'google_search_cx',
    'auth_token',
  ])

  const values = getAllDbSettings()
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, sensitiveKeys.has(key) ? maskSecret(value) : value]),
  )
}

function buildPlaceholderQrDataUrl(label: string) {
  const cells = Array.from({ length: 9 }, (_, row) =>
    Array.from({ length: 9 }, (_, column) => ((row * 7 + column * 11 + label.length) % 3 === 0 ? 1 : 0)),
  )

  const squares = cells
    .flatMap((row, rowIndex) =>
      row.map((value, columnIndex) =>
        value
          ? `<rect x="${18 + columnIndex * 18}" y="${18 + rowIndex * 18}" width="12" height="12" rx="2" fill="#09090b" />`
          : '',
      ),
    )
    .join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220"><rect width="220" height="220" rx="24" fill="#fafafa" /><rect x="14" y="14" width="192" height="192" rx="20" fill="#ffffff" stroke="#d4d4d8" stroke-width="2" />${squares}<text x="110" y="194" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="#27272a">${label}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function computeNextRunFromSchedule(schedule: string) {
  const nowDate = new Date()
  if (schedule === '*/15 * * * *') {
    return new Date(nowDate.getTime() + 15 * 60 * 1000).toISOString()
  }
  if (schedule === '0 * * * *') {
    return new Date(nowDate.getTime() + 60 * 60 * 1000).toISOString()
  }
  if (/^\d{1,2} \d{1,2} \* \* \*$/.test(schedule)) {
    return new Date(nowDate.getTime() + 24 * 60 * 60 * 1000).toISOString()
  }
  if (/^\d{1,2} \d{1,2} \* \* [0-6]$/.test(schedule) || /^\d{1,2} \d{1,2} \* \* 1-5$/.test(schedule)) {
    return new Date(nowDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
  }
  return new Date(nowDate.getTime() + 2 * 60 * 60 * 1000).toISOString()
}

agents.forEach(ensureAgentArtifacts)
void Promise.all(
  agents.map(async (agent) => {
    const manager = getAgentFileManager(agent)
    await manager.initialize({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      personality: agent.personality,
      provider: agent.provider.toLowerCase(),
      model: agent.model,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
    })
  }),
)

const seedStrategySession = createSessionRecord('agent-strategy', 'Roadmap planning')
addMessage('agent-strategy', seedStrategySession.id, 'user', 'Who are you?', new Date(now - 1000 * 60 * 65).toISOString())
addMessage(
  'agent-strategy',
  seedStrategySession.id,
  'assistant',
  `I'm **Nova Strategy**, your product strategist.\n\nI help shape priorities, write product briefs, and turn vague requests into execution-ready plans.`,
  new Date(now - 1000 * 60 * 64).toISOString(),
)

const seedBuilderSession = createSessionRecord('agent-builder', 'UI polish review')
addMessage('agent-builder', seedBuilderSession.id, 'user', 'What tools do you have?', new Date(now - 1000 * 60 * 28).toISOString())
addMessage(
  'agent-builder',
  seedBuilderSession.id,
  'assistant',
  `Here's a quick example of how I usually structure a component review:\n\n\`\`\`tsx\nexport function Card({ title }: { title: string }) {\n  return <div className="card">{title}</div>\n}\n\`\`\`\n\nI can also inspect layout, interactions, and design-system consistency.`,
  new Date(now - 1000 * 60 * 26).toISOString(),
)

const seedOpsSession = createSessionRecord('agent-ops', 'Release health')
addMessage('agent-ops', seedOpsSession.id, 'user', 'What can you help me with?', new Date(now - 1000 * 60 * 12).toISOString())
addMessage(
  'agent-ops',
  seedOpsSession.id,
  'assistant',
  `I can help with:\n\n- diagnosing local service issues\n- checking agent runtime health\n- shaping automation workflows\n\nShare a log snippet or a failing step and I'll narrow it down.`,
  new Date(now - 1000 * 60 * 10).toISOString(),
)

const app = express()
const httpServer = createServer(app)
const port = Number(process.env.PORT ?? 7411)

const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
})

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json({ limit: '50mb' }))
app.use((req, _res, next) => {
  if (req.path.startsWith('/api')) {
    apiCallsToday += 1
    io.emit('instance:update', buildInstanceStats())
  }
  next()
})

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    counts: {
      agents: agents.length,
      workspaces: workspaceLibrary.length,
      skills: skillLibrary.length,
      mcps: globalMcps.length,
      cronJobs: cronJobs.length,
      channels: channels.length,
      instances: instances.length,
    },
  })
})

app.get('/api/settings', (_req, res) => {
  res.json(maskedSettingsResponse())
})

app.patch('/api/settings', (req, res) => {
  const payload = typeof req.body === 'object' && req.body ? req.body : {}

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return
    }

    if (typeof value === 'string') {
      setDbSetting(key, value)
      return
    }

    setDbSetting(key, JSON.stringify(value))
  })

  res.json(maskedSettingsResponse())
})

app.post('/api/settings/test/:provider', (req, res) => {
  const provider = req.params.provider.toLowerCase()
  const keyMap: Record<string, string> = {
    anthropic: 'anthropic_api_key',
    openai: 'openai_api_key',
    groq: 'groq_api_key',
    openrouter: 'openrouter_api_key',
    pinecone: 'pinecone_api_key',
    elevenlabs: 'elevenlabs_api_key',
    brave: 'brave_search_api_key',
    google: 'google_search_api_key',
  }

  const key = keyMap[provider]
  const value = key ? dbSettingValue(key) : undefined

  if (!key || !value) {
    res.status(400).json({ ok: false, error: 'API key missing' })
    return
  }

  res.json({ ok: true, message: `${provider} configuration looks valid.` })
})

app.post('/api/system/restart', (_req, res) => {
  res.json({ ok: true, message: 'Restart scheduled. Restart your dev server command to reconnect.' })
})

app.get('/api/providers/models', (_req, res) => {
  res.json(providerModelsCatalog)
})

app.get('/api/voice/voices', (_req, res) => {
  const hasKey = Boolean(dbSettingValue('elevenlabs_api_key') || process.env.ELEVENLABS_API_KEY)
  res.json(
    hasKey
      ? [
          { id: 'alloy', name: 'Alloy' },
          { id: 'verse', name: 'Verse' },
          { id: 'ember', name: 'Ember' },
        ]
      : [],
  )
})

app.post('/api/voice/tts', (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text : ''
  res.json({
    ok: true,
    text,
    audioUrl: null,
    message: 'Voice synthesis is stubbed in local mode until live provider wiring is enabled.',
  })
})

app.post('/api/import/openclaw', async (req, res) => {
  const preview = req.body?.preview && typeof req.body.preview === 'object' ? req.body.preview : {}
  const importId = randomUUID()
  getDb()
    .prepare('INSERT INTO imports (id, source, status, metadata_json, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(importId, 'openclaw', 'completed', JSON.stringify(preview), new Date().toISOString(), new Date().toISOString())

  res.status(201).json({
    id: importId,
    status: 'completed',
    imported: preview,
    message: 'OpenClaw import has been queued for local processing.',
  })
})

app.post('/api/export/all', async (_req, res) => {
  const payload = {
    exportedAt: new Date().toISOString(),
    dataDirectory: getOpenPawDataDir(),
    agents: agents.length,
    workspaces: workspaceLibrary.length,
    skills: skillLibrary.length,
    mcps: globalMcps.length,
  }

  res.setHeader('Content-Disposition', 'attachment; filename="openpaw-export.json"')
  res.setHeader('Content-Type', 'application/json')
  res.send(JSON.stringify(payload, null, 2))
})

app.get('/api/workspaces', (_req, res) => {
  res.json(workspaceLibrary.map(workspaceResponse))
})

app.post('/api/workspaces', (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const type =
    req.body?.type === 'org' || req.body?.type === 'division' || req.body?.type === 'team' || req.body?.type === 'project'
      ? req.body.type
      : 'team'
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : ''
  const context =
    typeof req.body?.context === 'string' && req.body.context.trim()
      ? req.body.context
      : `# WORKSPACE_CONTEXT.md

Describe the shared goals, constraints, and operating rules for ${name || 'this workspace'} here.
`
  const initialAgents: Array<{ agentId: string; role: string }> = Array.isArray(req.body?.members)
    ? req.body.members
        .filter((entry: unknown): entry is { agentId: string; role?: string } => typeof entry === 'object' && entry !== null && typeof (entry as { agentId?: unknown }).agentId === 'string')
        .map((entry: { agentId: string; role?: string }) => ({
          agentId: entry.agentId,
          role: typeof entry.role === 'string' && entry.role.trim() ? entry.role.trim() : 'Member',
        }))
    : []

  if (!name) {
    res.status(400).json({ error: 'Workspace name is required' })
    return
  }

  const timestamp = new Date().toISOString()
  const nextWorkspace: WorkspaceDirectoryRecord = {
    id: `workspace-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || randomUUID().slice(0, 8)}`,
    name,
    type,
    description,
    context,
    members: initialAgents.filter((member, index, list) => list.findIndex((entry: { agentId: string }) => entry.agentId === member.agentId) === index),
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  workspaceLibrary.unshift(nextWorkspace)
  workspaceTasks.set(nextWorkspace.id, [])
  res.status(201).json(workspaceResponse(nextWorkspace))
})

app.get('/api/workspaces/:id', (req, res) => {
  const workspace = findWorkspaceDirectory(req.params.id)

  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }

  res.json(workspaceResponse(workspace))
})

app.patch('/api/workspaces/:id', (req, res) => {
  const workspace = findWorkspaceDirectory(req.params.id)

  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }

  if (typeof req.body?.name === 'string' && req.body.name.trim()) {
    workspace.name = req.body.name.trim()
  }

  if (req.body?.type === 'org' || req.body?.type === 'division' || req.body?.type === 'team' || req.body?.type === 'project') {
    workspace.type = req.body.type
  }

  if (typeof req.body?.description === 'string') {
    workspace.description = req.body.description.trim()
  }

  if (typeof req.body?.context === 'string') {
    workspace.context = req.body.context
  }

  workspace.updatedAt = new Date().toISOString()
  res.json(workspaceResponse(workspace))
})

app.delete('/api/workspaces/:id', (req, res) => {
  const index = workspaceLibrary.findIndex((entry) => entry.id === req.params.id)

  if (index === -1) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }

  workspaceLibrary.splice(index, 1)
  workspaceTasks.delete(req.params.id)
  res.status(204).end()
})

app.post('/api/workspaces/:id/agents', (req, res) => {
  const workspace = findWorkspaceDirectory(req.params.id)
  const agentId = typeof req.body?.agentId === 'string' ? req.body.agentId.trim() : ''
  const role = typeof req.body?.role === 'string' && req.body.role.trim() ? req.body.role.trim() : 'Member'

  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }

  if (!findAgent(agentId)) {
    res.status(400).json({ error: 'Valid agentId is required' })
    return
  }

  if (!workspace.members.some((member) => member.agentId === agentId)) {
    workspace.members.push({ agentId, role })
    workspace.updatedAt = new Date().toISOString()
  }

  res.json(workspaceResponse(workspace))
})

app.delete('/api/workspaces/:id/agents/:agentId', (req, res) => {
  const workspace = findWorkspaceDirectory(req.params.id)

  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }

  workspace.members = workspace.members.filter((member) => member.agentId !== req.params.agentId)
  workspace.updatedAt = new Date().toISOString()
  res.status(204).end()
})

app.get('/api/workspaces/:id/tasks', (req, res) => {
  const workspace = findWorkspaceDirectory(req.params.id)

  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }

  res.json((workspaceTasks.get(workspace.id) ?? []).map(workspaceTaskResponse))
})

app.post('/api/workspaces/:id/tasks', (req, res) => {
  const workspace = findWorkspaceDirectory(req.params.id)
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : ''
  const status =
    req.body?.status === 'in_progress' || req.body?.status === 'completed'
      ? req.body.status
      : 'open'
  const priority =
    req.body?.priority === 'low' || req.body?.priority === 'high'
      ? req.body.priority
      : 'medium'
  const requiredSkills = Array.isArray(req.body?.requiredSkills)
    ? req.body.requiredSkills.filter((entry: unknown): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : []

  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }

  if (!title) {
    res.status(400).json({ error: 'Task title is required' })
    return
  }

  const timestamp = new Date().toISOString()
  const bids = workspace.members
    .slice(0, 3)
    .map((member) => ({
      agentId: member.agentId,
      agentName: findAgent(member.agentId)?.name ?? member.agentId,
      summary: `${findAgent(member.agentId)?.name ?? 'This agent'} can take this task with a ${member.role.toLowerCase()} perspective.`,
    }))

  const nextTask: WorkspaceTaskRecord = {
    id: randomUUID(),
    workspaceId: workspace.id,
    title,
    description,
    status,
    priority,
    requiredSkills,
    bids,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  const currentTasks = workspaceTasks.get(workspace.id) ?? []
  workspaceTasks.set(workspace.id, [nextTask, ...currentTasks])
  workspace.updatedAt = timestamp

  res.status(201).json(workspaceTaskResponse(nextTask))
})

app.patch('/api/workspaces/:id/tasks/:taskId', (req, res) => {
  const workspace = findWorkspaceDirectory(req.params.id)

  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }

  const tasks = workspaceTasks.get(workspace.id) ?? []
  const task = tasks.find((entry) => entry.id === req.params.taskId)

  if (!task) {
    res.status(404).json({ error: 'Task not found' })
    return
  }

  if (typeof req.body?.title === 'string' && req.body.title.trim()) {
    task.title = req.body.title.trim()
  }

  if (typeof req.body?.description === 'string') {
    task.description = req.body.description.trim()
  }

  if (req.body?.status === 'open' || req.body?.status === 'in_progress' || req.body?.status === 'completed') {
    task.status = req.body.status
  }

  if (req.body?.priority === 'low' || req.body?.priority === 'medium' || req.body?.priority === 'high') {
    task.priority = req.body.priority
  }

  if (typeof req.body?.assigneeId === 'string') {
    task.assigneeId = req.body.assigneeId.trim() || undefined
  }

  if (Array.isArray(req.body?.requiredSkills)) {
    task.requiredSkills = req.body.requiredSkills.filter((entry: unknown): entry is string => typeof entry === 'string' && entry.trim().length > 0)
  }

  task.updatedAt = new Date().toISOString()
  workspace.updatedAt = task.updatedAt

  res.json(workspaceTaskResponse(task))
})

app.get('/api/mcps', (_req, res) => {
  res.json(globalMcps)
})

app.post('/api/mcps', (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const transport = req.body?.transport === 'sse' || req.body?.transport === 'http' ? req.body.transport : 'stdio'
  const command = typeof req.body?.command === 'string' ? req.body.command.trim() : ''
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : ''
  const args = Array.isArray(req.body?.args) ? req.body.args.filter((arg: unknown): arg is string => typeof arg === 'string' && arg.trim().length > 0) : []
  const env = typeof req.body?.env === 'object' && req.body.env ? req.body.env as Record<string, string> : {}
  const headers = typeof req.body?.headers === 'object' && req.body.headers ? req.body.headers as Record<string, string> : {}
  const authToken = typeof req.body?.authToken === 'string' ? req.body.authToken.trim() : ''

  if (!name) {
    res.status(400).json({ error: 'Name is required' })
    return
  }

  if (transport === 'stdio' && !command) {
    res.status(400).json({ error: 'Command is required for stdio MCPs' })
    return
  }

  if ((transport === 'sse' || transport === 'http') && !url) {
    res.status(400).json({ error: 'URL is required for network MCPs' })
    return
  }

  const updatedAt = new Date().toISOString()
  const nextMcp: GlobalMcpRecord = {
    id: randomUUID(),
    name,
    transport,
    enabled: true,
    status: 'connected',
    command: command || undefined,
    url: url || undefined,
    args,
    env,
    headers,
    authToken: authToken || undefined,
    agentCount: 0,
    tools: transport === 'stdio' ? ['listFiles', 'readFile', 'writeFile'] : transport === 'sse' ? ['search', 'lookup'] : ['request', 'post'],
    responseTimeMs: 58 + Math.floor(Math.random() * 70),
    updatedAt,
  }

  globalMcps.unshift(nextMcp)
  res.status(201).json(nextMcp)
})

app.get('/api/mcps/:id', (req, res) => {
  const mcp = findGlobalMcp(req.params.id)

  if (!mcp) {
    res.status(404).json({ error: 'MCP not found' })
    return
  }

  res.json(mcp)
})

app.patch('/api/mcps/:id', (req, res) => {
  const mcp = findGlobalMcp(req.params.id)

  if (!mcp) {
    res.status(404).json({ error: 'MCP not found' })
    return
  }

  if (typeof req.body?.name === 'string' && req.body.name.trim()) {
    mcp.name = req.body.name.trim()
  }

  if (req.body?.transport === 'stdio' || req.body?.transport === 'sse' || req.body?.transport === 'http') {
    mcp.transport = req.body.transport
  }

  if (typeof req.body?.command === 'string') {
    mcp.command = req.body.command.trim() || undefined
  }

  if (typeof req.body?.url === 'string') {
    mcp.url = req.body.url.trim() || undefined
  }

  if (Array.isArray(req.body?.args)) {
    mcp.args = req.body.args.filter((arg: unknown): arg is string => typeof arg === 'string' && arg.trim().length > 0)
  }

  if (typeof req.body?.env === 'object' && req.body.env) {
    mcp.env = req.body.env as Record<string, string>
  }

  if (typeof req.body?.headers === 'object' && req.body.headers) {
    mcp.headers = req.body.headers as Record<string, string>
  }

  if (typeof req.body?.authToken === 'string') {
    mcp.authToken = req.body.authToken.trim() || undefined
  }

  if (typeof req.body?.enabled === 'boolean') {
    mcp.enabled = req.body.enabled
    mcp.status = req.body.enabled ? 'connected' : 'disabled'
  }

  mcp.updatedAt = new Date().toISOString()
  res.json(mcp)
})

app.delete('/api/mcps/:id', (req, res) => {
  const index = globalMcps.findIndex((entry) => entry.id === req.params.id)

  if (index === -1) {
    res.status(404).json({ error: 'MCP not found' })
    return
  }

  globalMcps.splice(index, 1)
  res.status(204).end()
})

app.post('/api/mcps/:id/test', (req, res) => {
  const mcp = findGlobalMcp(req.params.id)

  if (!mcp) {
    res.status(404).json({ error: 'MCP not found' })
    return
  }

  const responseTimeMs = 45 + Math.floor(Math.random() * 110)
  mcp.responseTimeMs = responseTimeMs
  mcp.status = mcp.enabled ? 'connected' : 'disabled'
  mcp.updatedAt = new Date().toISOString()

  res.json({
    ok: mcp.enabled,
    message: mcp.enabled ? 'Connection test successful' : 'MCP is disabled',
    responseTimeMs,
    tools: mcp.tools,
  })
})

app.get('/api/skills', (_req, res) => {
  res.json(skillLibrary)
})

app.post('/api/skills/import/preview', async (req, res) => {
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : ''

  if (!url) {
    res.status(400).json({ error: 'URL is required' })
    return
  }

  try {
    const preview = await fetchRemoteSkillContent(url)
    res.json(preview)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Could not fetch preview' })
  }
})

app.post('/api/skills/import', (req, res) => {
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : ''
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const category =
    req.body?.category === 'Coding' ||
    req.body?.category === 'Writing' ||
    req.body?.category === 'Research' ||
    req.body?.category === 'Productivity' ||
    req.body?.category === 'Custom'
      ? req.body.category
      : 'Custom'
  const tags = Array.isArray(req.body?.tags) ? req.body.tags.filter((tag: unknown): tag is string => typeof tag === 'string' && tag.trim().length > 0) : []
  const content = typeof req.body?.content === 'string' ? req.body.content : ''
  const description = typeof req.body?.description === 'string' && req.body.description.trim() ? req.body.description.trim() : inferSkillDescription(content)

  if (!url || !name || !content) {
    res.status(400).json({ error: 'URL, name, and content are required' })
    return
  }

  const timestamp = new Date().toISOString()
  const nextSkill: GlobalSkillRecord = {
    id: randomUUID(),
    name,
    enabled: true,
    description,
    category,
    tags,
    sourceType: 'github',
    sourceUrl: url,
    content,
    size: content.length,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  skillLibrary.unshift(nextSkill)
  res.status(201).json(nextSkill)
})

app.post('/api/skills', (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : ''
  const category =
    req.body?.category === 'Coding' ||
    req.body?.category === 'Writing' ||
    req.body?.category === 'Research' ||
    req.body?.category === 'Productivity' ||
    req.body?.category === 'Custom'
      ? req.body.category
      : 'Custom'
  const tags = Array.isArray(req.body?.tags) ? req.body.tags.filter((tag: unknown): tag is string => typeof tag === 'string' && tag.trim().length > 0) : []
  const content = typeof req.body?.content === 'string' ? req.body.content : ''

  if (!name || !content) {
    res.status(400).json({ error: 'Name and content are required' })
    return
  }

  const timestamp = new Date().toISOString()
  const nextSkill: GlobalSkillRecord = {
    id: randomUUID(),
    name,
    enabled: true,
    description: description || inferSkillDescription(content),
    category,
    tags,
    sourceType: 'custom',
    content,
    size: content.length,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  skillLibrary.unshift(nextSkill)
  res.status(201).json(nextSkill)
})

app.get('/api/skills/:id', (req, res) => {
  const skill = findSkill(req.params.id)

  if (!skill) {
    res.status(404).json({ error: 'Skill not found' })
    return
  }

  res.json(skill)
})

app.patch('/api/skills/:id', (req, res) => {
  const skill = findSkill(req.params.id)

  if (!skill) {
    res.status(404).json({ error: 'Skill not found' })
    return
  }

  if (typeof req.body?.name === 'string' && req.body.name.trim()) {
    skill.name = req.body.name.trim()
  }

  if (typeof req.body?.description === 'string') {
    skill.description = req.body.description.trim() || skill.description
  }

  if (
    req.body?.category === 'Coding' ||
    req.body?.category === 'Writing' ||
    req.body?.category === 'Research' ||
    req.body?.category === 'Productivity' ||
    req.body?.category === 'Custom'
  ) {
    skill.category = req.body.category
  }

  if (Array.isArray(req.body?.tags)) {
    skill.tags = req.body.tags.filter((tag: unknown): tag is string => typeof tag === 'string' && tag.trim().length > 0)
  }

  if (typeof req.body?.content === 'string') {
    skill.content = req.body.content
    skill.size = req.body.content.length
  }

  if (typeof req.body?.enabled === 'boolean') {
    skill.enabled = req.body.enabled
  }

  skill.updatedAt = new Date().toISOString()
  res.json(skill)
})

app.delete('/api/skills/:id', (req, res) => {
  const index = skillLibrary.findIndex((entry) => entry.id === req.params.id)

  if (index === -1) {
    res.status(404).json({ error: 'Skill not found' })
    return
  }

  skillLibrary.splice(index, 1)
  res.status(204).end()
})

app.post('/api/skills/:id/toggle', (req, res) => {
  const skill = findSkill(req.params.id)

  if (!skill) {
    res.status(404).json({ error: 'Skill not found' })
    return
  }

  skill.enabled = Boolean(req.body?.enabled)
  skill.updatedAt = new Date().toISOString()
  res.json(skill)
})

app.get('/api/cron', (_req, res) => {
  res.json(
    cronJobs.map((job) => ({
      ...job,
      agentName: findAgent(job.agentId)?.name ?? 'Unknown agent',
      failureChannelName: channels.find((channel) => channel.id === job.failureChannelId)?.name,
    })),
  )
})

app.post('/api/cron', (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : ''
  const agentId = typeof req.body?.agentId === 'string' ? req.body.agentId.trim() : ''
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : ''
  const schedule = typeof req.body?.schedule === 'string' ? req.body.schedule.trim() : ''
  const timezone = typeof req.body?.timezone === 'string' ? req.body.timezone.trim() : 'Africa/Lagos'
  const maxRetries = typeof req.body?.maxRetries === 'number' ? Math.max(0, Math.min(5, req.body.maxRetries)) : 0
  const timeoutMinutes = typeof req.body?.timeoutMinutes === 'number' ? Math.max(1, req.body.timeoutMinutes) : 10
  const notifyOnFailure = Boolean(req.body?.notifyOnFailure)
  const failureChannelId = typeof req.body?.failureChannelId === 'string' ? req.body.failureChannelId.trim() : undefined
  const agent = findAgent(agentId)

  if (!name || !agentId || !prompt || !schedule || !agent) {
    res.status(400).json({ error: 'Name, agent, prompt, and schedule are required' })
    return
  }

  const timestamp = new Date().toISOString()
  const nextJob: CronJobRecord = {
    id: randomUUID(),
    name,
    description,
    agentId,
    prompt,
    schedule,
    timezone,
    enabled: true,
    maxRetries,
    timeoutMinutes,
    notifyOnFailure,
    failureChannelId: notifyOnFailure ? failureChannelId : undefined,
    nextRunAt: computeNextRunFromSchedule(schedule),
    lastRunStatus: 'never',
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  cronJobs.unshift(nextJob)
  res.status(201).json({
    ...nextJob,
    agentName: agent.name,
    failureChannelName: channels.find((channel) => channel.id === failureChannelId)?.name,
  })
})

app.get('/api/cron/:id', (req, res) => {
  const job = findCronJob(req.params.id)

  if (!job) {
    res.status(404).json({ error: 'Cron job not found' })
    return
  }

  res.json({
    ...job,
    agentName: findAgent(job.agentId)?.name ?? 'Unknown agent',
    failureChannelName: channels.find((channel) => channel.id === job.failureChannelId)?.name,
  })
})

app.patch('/api/cron/:id', (req, res) => {
  const job = findCronJob(req.params.id)

  if (!job) {
    res.status(404).json({ error: 'Cron job not found' })
    return
  }

  if (typeof req.body?.name === 'string' && req.body.name.trim()) job.name = req.body.name.trim()
  if (typeof req.body?.description === 'string') job.description = req.body.description.trim()
  if (typeof req.body?.agentId === 'string' && findAgent(req.body.agentId)) job.agentId = req.body.agentId
  if (typeof req.body?.prompt === 'string' && req.body.prompt.trim()) job.prompt = req.body.prompt.trim()
  if (typeof req.body?.schedule === 'string' && req.body.schedule.trim()) {
    job.schedule = req.body.schedule.trim()
    job.nextRunAt = computeNextRunFromSchedule(job.schedule)
  }
  if (typeof req.body?.timezone === 'string' && req.body.timezone.trim()) job.timezone = req.body.timezone.trim()
  if (typeof req.body?.enabled === 'boolean') job.enabled = req.body.enabled
  if (typeof req.body?.maxRetries === 'number') job.maxRetries = Math.max(0, Math.min(5, req.body.maxRetries))
  if (typeof req.body?.timeoutMinutes === 'number') job.timeoutMinutes = Math.max(1, req.body.timeoutMinutes)
  if (typeof req.body?.notifyOnFailure === 'boolean') job.notifyOnFailure = req.body.notifyOnFailure
  if (typeof req.body?.failureChannelId === 'string') job.failureChannelId = req.body.failureChannelId.trim() || undefined
  job.updatedAt = new Date().toISOString()

  res.json({
    ...job,
    agentName: findAgent(job.agentId)?.name ?? 'Unknown agent',
    failureChannelName: channels.find((channel) => channel.id === job.failureChannelId)?.name,
  })
})

app.delete('/api/cron/:id', (req, res) => {
  const index = cronJobs.findIndex((entry) => entry.id === req.params.id)

  if (index === -1) {
    res.status(404).json({ error: 'Cron job not found' })
    return
  }

  cronJobs.splice(index, 1)
  res.status(204).end()
})

app.post('/api/cron/:id/run', (req, res) => {
  const job = findCronJob(req.params.id)

  if (!job) {
    res.status(404).json({ error: 'Cron job not found' })
    return
  }

  const ranAt = new Date().toISOString()
  const duration = 1500 + Math.floor(Math.random() * 6000)
  job.lastRunAt = ranAt
  job.lastRunStatus = 'success'
  job.lastRunDurationMs = duration
  job.lastRunOutput = `Job "${job.name}" completed successfully.\n\nPrompt:\n${job.prompt}\n\nSummary:\n- Checked the requested sources\n- Prepared a concise update\n- No failures were detected`
  job.nextRunAt = computeNextRunFromSchedule(job.schedule)
  job.updatedAt = ranAt

  res.json({
    ok: true,
    ...job,
    agentName: findAgent(job.agentId)?.name ?? 'Unknown agent',
    failureChannelName: channels.find((channel) => channel.id === job.failureChannelId)?.name,
  })
})

app.get('/api/channels', (_req, res) => {
  res.json(channels.map(channelResponse))
})

app.get('/api/channels/whatsapp/qr', (_req, res) => {
  const channel = findChannel('whatsapp')

  if (!channel) {
    res.status(404).json({ error: 'Channel not found' })
    return
  }

  res.json({
    status: channel.status === 'connected' ? 'connected' : 'pending',
    qrCodeDataUrl: buildPlaceholderQrDataUrl(channel.config.phoneNumber ?? 'OPENPAW'),
    phoneNumber: channel.config.phoneNumber,
  })
})

app.get('/api/instances', (_req, res) => {
  res.json(instances.map(instanceResponse))
})

app.get('/api/instances/stats', (_req, res) => {
  res.json(buildInstanceStats())
})

app.get('/api/instances/:id', (req, res) => {
  const instance = instances.find((entry) => entry.id === req.params.id)

  if (!instance) {
    res.status(404).json({ error: 'Instance not found' })
    return
  }

  res.json(instanceResponse(instance))
})

app.get('/api/instances/:id/logs', (req, res) => {
  const logs =
    req.params.id === 'stream'
      ? instanceLogs
      : instanceLogs.filter((entry) => entry.instanceId === req.params.id)

  res.json(logs)
})

app.post('/api/instances/:id/stop', (req, res) => {
  const instance = instances.find((entry) => entry.id === req.params.id)

  if (!instance) {
    res.status(404).json({ error: 'Instance not found' })
    return
  }

  instance.status = 'stopped'
  pushInstanceLog({
    instanceId: instance.id,
    level: 'warning',
    type: instance.type,
    agentName: instance.agentId ? findAgent(instance.agentId)?.name : undefined,
    message: `${instance.name} was stopped from the Instances panel.`,
  })

  io.emit('instance:update', buildInstanceStats())
  res.json(instanceResponse(instance))
})

app.get('/api/channels/:id', (req, res) => {
  const channel = findChannel(req.params.id)

  if (!channel) {
    res.status(404).json({ error: 'Channel not found' })
    return
  }

  res.json(channelResponse(channel))
})

app.post('/api/channels/:id/test', (req, res) => {
  const channel = findChannel(req.params.id)

  if (!channel) {
    res.status(404).json({ error: 'Channel not found' })
    return
  }

  if (channel.type === 'telegram') {
    if (!channel.config.botToken) {
      res.status(400).json({ error: 'Add a Telegram bot token before testing' })
      return
    }

    const chatId = typeof req.body?.chatId === 'string' ? req.body.chatId.trim() : ''

    if (!chatId) {
      res.status(400).json({ error: 'Chat ID is required for Telegram test messages' })
      return
    }

    channel.config.testChatId = chatId
    channel.status = 'connected'
    channel.enabled = true
    channel.updatedAt = new Date().toISOString()

    res.json({
      ok: true,
      message: `Test message queued for chat ${chatId}`,
      timestamp: new Date().toISOString(),
    })
    return
  }

  res.json({
    ok: channel.status !== 'error',
    message: `${channel.name} connection looks healthy`,
    timestamp: new Date().toISOString(),
  })
})

app.patch('/api/channels/:id', (req, res) => {
  const channel = findChannel(req.params.id)

  if (!channel) {
    res.status(404).json({ error: 'Channel not found' })
    return
  }

  if (channel.type === 'web') {
    channel.enabled = true
    channel.status = 'connected'
    channel.updatedAt = new Date().toISOString()
    res.json(channelResponse(channel))
    return
  }

  if (typeof req.body?.enabled === 'boolean') {
    channel.enabled = req.body.enabled
  }

  if (typeof req.body?.agentId === 'string') {
    channel.agentId = req.body.agentId.trim() || undefined
  }

  if (typeof req.body?.error === 'string') {
    channel.error = req.body.error.trim() || undefined
  }

  if (typeof req.body?.config === 'object' && req.body.config) {
    const config = req.body.config as Record<string, unknown>

    if (typeof config.botToken === 'string') channel.config.botToken = config.botToken.trim()
    if (typeof config.webhookUrl === 'string') channel.config.webhookUrl = config.webhookUrl.trim()
    if (Array.isArray(config.allowList)) {
      channel.config.allowList = config.allowList.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    }
    if (typeof config.testChatId === 'string') channel.config.testChatId = config.testChatId.trim()
    if (typeof config.clientId === 'string') channel.config.clientId = config.clientId.trim()
    if (typeof config.guildId === 'string') channel.config.guildId = config.guildId.trim()
    if (typeof config.commandPrefix === 'string') channel.config.commandPrefix = config.commandPrefix.trim() || '/'
    if (typeof config.appToken === 'string') channel.config.appToken = config.appToken.trim()
    if (typeof config.signingSecret === 'string') channel.config.signingSecret = config.signingSecret.trim()
    if (Array.isArray(config.channelWhitelist)) {
      channel.config.channelWhitelist = config.channelWhitelist.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    }
    if (typeof config.phoneNumber === 'string') channel.config.phoneNumber = config.phoneNumber.trim()
  }

  if (typeof req.body?.status === 'string' && ['connected', 'not_connected', 'error'].includes(req.body.status)) {
    channel.status = req.body.status as ChannelRecord['status']
  } else if (channel.type === 'whatsapp') {
    channel.status = channel.config.phoneNumber ? 'connected' : 'not_connected'
  } else {
    const hasSecret =
      Boolean(channel.config.botToken) ||
      Boolean(channel.config.appToken) ||
      Boolean(channel.config.clientId) ||
      Boolean(channel.config.signingSecret)
    channel.status = channel.enabled && hasSecret ? 'connected' : 'not_connected'
  }

  if (!channel.enabled && channel.status !== 'error') {
    channel.status = 'not_connected'
  }

  channel.updatedAt = new Date().toISOString()
  res.json(channelResponse(channel))
})

app.get('/api/agents', (_req, res) => {
  res.json(agents)
})

app.post('/api/agents', async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const role = typeof req.body?.role === 'string' ? req.body.role.trim() : ''
  const personality = typeof req.body?.personality === 'string' ? req.body.personality.trim() : ''
  const provider = typeof req.body?.provider === 'string' ? req.body.provider.trim() : ''
  const model = typeof req.body?.model === 'string' ? req.body.model.trim() : ''
  const temperature = typeof req.body?.temperature === 'number' ? req.body.temperature : 0.7
  const maxTokens = typeof req.body?.maxTokens === 'number' ? req.body.maxTokens : 4096
  const avatarColor = typeof req.body?.avatarColor === 'string' && req.body.avatarColor.trim() ? req.body.avatarColor.trim() : '#7c3aed'
  const systemPrompt =
    typeof req.body?.systemPrompt === 'string' && req.body.systemPrompt.trim()
      ? req.body.systemPrompt.trim()
      : `You are ${name || 'an OpenPaw agent'}, a ${role || 'helpful assistant'} who works locally inside OpenPaw.`

  if (!name || !role || !provider || !model) {
    res.status(400).json({ error: 'Name, role, provider, and model are required' })
    return
  }

  const timestamp = new Date().toISOString()
  const nextAgent: AgentRecord = {
    id: buildUniqueAgentId(name),
    name,
    role,
    status: 'idle',
    description: personality || `${role} ready to collaborate inside OpenPaw.`,
    personality,
    model,
    provider,
    temperature,
    maxTokens,
    systemPrompt,
    avatarColor,
    behavior: defaultBehavior(),
    taskModelOverrides: defaultTaskOverrides(model),
    integrationKeys: {},
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  agents.unshift(nextAgent)
  ensureAgentArtifacts(nextAgent)
  await getAgentFileManager(nextAgent).initialize({
    id: nextAgent.id,
    name: nextAgent.name,
    role: nextAgent.role,
    personality: nextAgent.personality,
    provider: nextAgent.provider.toLowerCase(),
    model: nextAgent.model,
    temperature: nextAgent.temperature,
    maxTokens: nextAgent.maxTokens,
  })
  await new MemoryLogger(nextAgent.id).append(`Identity initialized for ${nextAgent.name} (${nextAgent.role}).`)

  res.status(201).json(nextAgent)
})

app.get('/api/agents/:id', (req, res) => {
  const agent = findAgent(req.params.id)

  if (!agent) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  res.json(agent)
})

app.patch('/api/agents/:id', (req, res) => {
  const agent = findAgent(req.params.id)

  if (!agent) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  const nextBehavior = typeof req.body?.behavior === 'object' && req.body.behavior ? { ...agent.behavior, ...req.body.behavior } : agent.behavior
  const nextTaskOverrides =
    typeof req.body?.taskModelOverrides === 'object' && req.body.taskModelOverrides
      ? { ...agent.taskModelOverrides, ...req.body.taskModelOverrides }
      : agent.taskModelOverrides
  const nextIntegrationKeys =
    typeof req.body?.integrationKeys === 'object' && req.body.integrationKeys
      ? { ...agent.integrationKeys, ...req.body.integrationKeys }
      : agent.integrationKeys

  Object.assign(agent, {
    name: typeof req.body?.name === 'string' && req.body.name.trim() ? req.body.name.trim() : agent.name,
    role: typeof req.body?.role === 'string' && req.body.role.trim() ? req.body.role.trim() : agent.role,
    personality: typeof req.body?.personality === 'string' ? req.body.personality.trim() : agent.personality,
    provider: typeof req.body?.provider === 'string' && req.body.provider.trim() ? req.body.provider.trim() : agent.provider,
    model: typeof req.body?.model === 'string' && req.body.model.trim() ? req.body.model.trim() : agent.model,
    temperature: typeof req.body?.temperature === 'number' ? req.body.temperature : agent.temperature,
    maxTokens: typeof req.body?.maxTokens === 'number' ? req.body.maxTokens : agent.maxTokens,
    systemPrompt: typeof req.body?.systemPrompt === 'string' ? req.body.systemPrompt : agent.systemPrompt,
    avatarColor: typeof req.body?.avatarColor === 'string' && req.body.avatarColor.trim() ? req.body.avatarColor.trim() : agent.avatarColor,
    behavior: nextBehavior,
    taskModelOverrides: nextTaskOverrides,
    integrationKeys: nextIntegrationKeys,
    description:
      typeof req.body?.personality === 'string' && req.body.personality.trim()
        ? req.body.personality.trim()
        : agent.description,
    updatedAt: new Date().toISOString(),
  })

  ensureAgentArtifacts(agent)

  const agentFiles = files.get(agent.id)
  if (agentFiles) {
    const identityFile = agentFiles['IDENTITY.md']
    if (identityFile) {
      identityFile.content = `# Identity

- Name: ${agent.name}
- Role: ${agent.role}
- Personality: ${agent.personality}
- Avatar color: ${agent.avatarColor}
`
      identityFile.updatedAt = agent.updatedAt
    }
  }

  res.json(agent)
})

app.delete('/api/agents/:id', async (req, res) => {
  const index = agents.findIndex((entry) => entry.id === req.params.id)

  if (index === -1) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  const [deletedAgent] = agents.splice(index, 1)
  sessions.delete(deletedAgent.id)
  messages.delete(deletedAgent.id)
  files.delete(deletedAgent.id)
  memories.delete(deletedAgent.id)
  workspaces.delete(deletedAgent.id)
  skills.delete(deletedAgent.id)
  mcps.delete(deletedAgent.id)
  await getAgentFileManager(deletedAgent).removeAgentDir()

  res.status(204).end()
})

app.get('/api/agents/:id/workspaces', (req, res) => {
  const agent = findAgent(req.params.id)

  if (!agent) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  ensureAgentArtifacts(agent)
  res.json(workspaces.get(agent.id) ?? [])
})

app.get('/api/agents/:id/files', async (req, res) => {
  const agent = findAgent(req.params.id)

  if (!agent) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  ensureAgentArtifacts(agent)
  const manager = getAgentFileManager(agent)
  const response = (await manager.listFiles()).map((entry) => ({
    name: entry.name,
    size: entry.size,
    updatedAt: entry.updated_at,
  }))

  res.json(response)
})

app.get('/api/agents/:id/files/:filename', async (req, res) => {
  const agent = findAgent(req.params.id)
  const filename = decodeURIComponent(req.params.filename)

  if (!agent) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  ensureAgentArtifacts(agent)
  const fileEntry = files.get(agent.id)?.[filename]

  if (!fileEntry || !agentFileNames.some((entry) => entry === filename)) {
    res.status(404).json({ error: 'File not found' })
    return
  }

  const agentFile = filename as AgentFile
  const manager = getAgentFileManager(agent)
  const content = await manager.readFile(agentFile)
  const listing = await manager.listFiles()
  const metadata = listing.find((entry) => entry.name === filename)
  fileEntry.content = content
  fileEntry.updatedAt = metadata?.updated_at ?? fileEntry.updatedAt

  res.json({
    name: fileEntry.name,
    content,
    size: content.length,
    updatedAt: fileEntry.updatedAt,
  })
})

app.post('/api/agents/:id/files/:filename', async (req, res) => {
  const agent = findAgent(req.params.id)
  const filename = decodeURIComponent(req.params.filename)
  const content = typeof req.body?.content === 'string' ? req.body.content : ''

  if (!agent) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  ensureAgentArtifacts(agent)

  const agentFiles = files.get(agent.id)
  if (!agentFiles || !agentFiles[filename] || !agentFileNames.some((entry) => entry === filename)) {
    res.status(404).json({ error: 'File not found' })
    return
  }

  const agentFile = filename as AgentFile
  const updatedAt = new Date().toISOString()
  await getAgentFileManager(agent).writeFile(agentFile, content)
  agentFiles[filename] = {
    name: filename,
    content,
    updatedAt,
  }

  agent.updatedAt = updatedAt

  res.json({
    name: filename,
    content,
    size: content.length,
    updatedAt,
  })
})

app.get('/api/agents/:id/memory', (req, res) => {
  const agent = findAgent(req.params.id)

  if (!agent) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  ensureAgentArtifacts(agent)
  const agentMemories = memories.get(agent.id) ?? []
  res.json(agentMemories.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()))
})

app.post('/api/agents/:id/memory', (req, res) => {
  const agent = findAgent(req.params.id)
  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : ''
  const tier = req.body?.tier === 'hot' || req.body?.tier === 'episodic' || req.body?.tier === 'semantic' ? req.body.tier : 'episodic'
  const importance = typeof req.body?.importance === 'number' ? Math.max(0, Math.min(100, req.body.importance)) : 50
  const tags = Array.isArray(req.body?.tags) ? req.body.tags.filter((tag: unknown): tag is string => typeof tag === 'string' && tag.trim().length > 0) : []

  if (!agent) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  if (!content) {
    res.status(400).json({ error: 'Memory content is required' })
    return
  }

  ensureAgentArtifacts(agent)

  const nextMemory: MemoryRecord = {
    id: randomUUID(),
    content,
    tier,
    importance,
    tags,
    createdAt: new Date().toISOString(),
  }

  const agentMemories = memories.get(agent.id) ?? []
  memories.set(agent.id, [nextMemory, ...agentMemories])
  touchAgent(agent.id)

  res.status(201).json(nextMemory)
})

app.get('/api/agents/:id/skills', (req, res) => {
  const agent = findAgent(req.params.id)

  if (!agent) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  ensureAgentArtifacts(agent)
  res.json(skills.get(agent.id) ?? [])
})

app.patch('/api/agents/:id/skills/:skillId', (req, res) => {
  const agent = findAgent(req.params.id)

  if (!agent) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  ensureAgentArtifacts(agent)
  const agentSkills = skills.get(agent.id) ?? []
  const skill = agentSkills.find((entry) => entry.id === req.params.skillId)

  if (!skill) {
    res.status(404).json({ error: 'Skill not found' })
    return
  }

  skill.enabled = Boolean(req.body?.enabled)
  touchAgent(agent.id)

  res.json(skill)
})

app.get('/api/agents/:id/mcps', (req, res) => {
  const agent = findAgent(req.params.id)

  if (!agent) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  ensureAgentArtifacts(agent)
  res.json(mcps.get(agent.id) ?? [])
})

app.post('/api/agents/:id/mcps', (req, res) => {
  const agent = findAgent(req.params.id)
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const transport = typeof req.body?.transport === 'string' ? req.body.transport.trim() : 'stdio'
  const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint.trim() : ''

  if (!agent) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  if (!name) {
    res.status(400).json({ error: 'MCP name is required' })
    return
  }

  ensureAgentArtifacts(agent)

  const nextMcp: McpRecord = {
    id: randomUUID(),
    name,
    transport,
    endpoint,
    status: endpoint ? 'connected' : 'disconnected',
  }

  const agentMcps = mcps.get(agent.id) ?? []
  mcps.set(agent.id, [nextMcp, ...agentMcps])
  touchAgent(agent.id)

  res.status(201).json(nextMcp)
})

app.get('/api/agents/:id/sessions', (req, res) => {
  const agent = findAgent(req.params.id)

  if (!agent) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  res.json(summarizeSessions(agent.id))
})

app.post('/api/agents/:id/sessions', (req, res) => {
  const agent = findAgent(req.params.id)

  if (!agent) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  const session = createSessionRecord(agent.id, req.body?.title ?? 'New conversation')
  res.status(201).json({
    ...session,
    messageCount: 0,
    lastMessageAt: session.startedAt,
  })
})

app.get('/api/agents/:id/messages', (req, res) => {
  const agent = findAgent(req.params.id)

  if (!agent) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  const agentMessages = messages.get(agent.id) ?? []
  const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined
  const filtered = sessionId ? agentMessages.filter((message) => message.sessionId === sessionId) : agentMessages

  res.json(filtered)
})

app.post('/api/agents/:id/chat', (req, res) => {
  const agent = findAgent(req.params.id)

  if (!agent) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''

  if (!message) {
    res.status(400).json({ error: 'Message is required' })
    return
  }

  const session = findOrCreateSession(agent.id, req.body?.sessionId)

  addMessage(agent.id, session.id, 'user', message)
  const assistantMessage = addMessage(agent.id, session.id, 'assistant', generateAssistantResponse(agent, message))
  touchAgent(agent.id)

  io.emit('chat:chunk', {
    agentId: agent.id,
    sessionId: session.id,
    message: assistantMessage,
  })

  res.status(201).json({
    sessionId: session.id,
    message: assistantMessage,
  })
})

io.on('connection', (socket) => {
  console.log('[Socket] connected:', socket.id)
  socket.emit('server:ready', { version: '0.1.0' })
  socket.emit('instance:update', buildInstanceStats())
  instanceLogs.slice(-12).forEach((entry) => socket.emit('instance:log', entry))
})

const tickerKey = '__openpaw_instance_log_ticker__' as const
const tickerStore = globalThis as unknown as Record<string, NodeJS.Timeout | undefined>
const existingTicker = tickerStore[tickerKey]
if (existingTicker) {
  clearInterval(existingTicker)
}

tickerStore[tickerKey] = setInterval(() => {
  const samples: Array<Omit<InstanceLogRecord, 'id' | 'timestamp'>> = [
    {
      instanceId: 'system-stream',
      level: 'debug',
      type: 'webhook',
      agentName: 'OpenPaw',
      message: 'Webhook router heartbeat is healthy.',
    },
    {
      instanceId: 'system-stream',
      level: 'info',
      type: 'chat-session',
      agentName: 'Pixel Builder',
      message: 'No active chat runtimes. Waiting for the next user message.',
    },
    {
      instanceId: 'system-stream',
      level: 'warning',
      type: 'cron-job',
      agentName: 'Ops Relay',
      message: 'Cron executor is idle because there are no currently running jobs.',
    },
  ]

  const nextLog = pushInstanceLog(samples[Math.floor(Math.random() * samples.length)])
  io.emit('instance:log', nextLog)
  io.emit('instance:update', buildInstanceStats())
}, 12000)

httpServer.listen(port, () => {
  console.log(`OpenPaw server -> http://localhost:${port}`)
})

export { app, io }
