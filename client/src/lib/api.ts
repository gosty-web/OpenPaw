export interface HealthResponse {
  status: string
  version: string
  timestamp: string
  counts?: Record<string, number>
}

export interface Agent {
  id: string
  name: string
  status?: string
  role?: string
  description?: string
  personality?: string
  model?: string
  provider?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  avatarColor?: string
  behavior?: {
    proactive?: boolean
    voiceResponses?: boolean
    webSearch?: boolean
    browserAccess?: boolean
    canSpawnSubAgents?: boolean
  }
  taskModelOverrides?: Record<string, string>
  integrationKeys?: Record<string, string>
  createdAt?: string
  updatedAt?: string
}

export interface AgentMemory {
  id: string
  content: string
  tier?: 'hot' | 'episodic' | 'semantic'
  importance?: number
  tags?: string[]
  createdAt?: string
}

export interface AgentSession {
  id: string
  agentId: string
  title?: string
  messageCount?: number
  lastMessageAt?: string
  startedAt?: string
  endedAt?: string
}

export interface AgentMessage {
  id: string
  agentId?: string
  sessionId?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: string
}

export interface ChatResponse {
  sessionId: string
  message: AgentMessage
}

export interface AgentFile {
  name: string
  content?: string
  path?: string
  size?: number
  updatedAt?: string
}

export interface AgentWorkspace {
  id: string
  name: string
  role?: string
}

export interface AgentSkill {
  id: string
  name: string
  enabled: boolean
  description?: string
}

export interface AgentMCP {
  id: string
  name: string
  status: 'connected' | 'disconnected' | 'error'
  transport?: string
  endpoint?: string
}

export interface Workspace {
  id: string
  name: string
  type?: 'org' | 'division' | 'team' | 'project'
  description?: string
  context?: string
  agentCount?: number
  members?: Array<{
    agentId: string
    role?: string
  }>
  createdAt?: string
  updatedAt?: string
}

export interface WorkspaceTask {
  id: string
  workspaceId: string
  title: string
  description?: string
  status?: 'open' | 'in_progress' | 'completed'
  priority?: 'low' | 'medium' | 'high'
  assigneeId?: string
  assigneeName?: string
  requiredSkills?: string[]
  bids?: Array<{
    agentId: string
    agentName: string
    summary: string
  }>
  createdAt?: string
  updatedAt?: string
}

export interface MCPServer {
  id: string
  name: string
  transport?: 'stdio' | 'sse' | 'http'
  enabled?: boolean
  status?: 'connected' | 'error' | 'disabled'
  command?: string
  url?: string
  args?: string[]
  env?: Record<string, string>
  headers?: Record<string, string>
  authToken?: string
  agentCount?: number
  tools?: string[]
  responseTimeMs?: number
  updatedAt?: string
}

export interface Skill {
  id: string
  name: string
  enabled?: boolean
  description?: string
  category?: 'Coding' | 'Writing' | 'Research' | 'Productivity' | 'Custom'
  tags?: string[]
  sourceType?: 'custom' | 'github'
  sourceUrl?: string
  content?: string
  size?: number
  createdAt?: string
  updatedAt?: string
}

export interface CronJob {
  id: string
  name: string
  description?: string
  agentId?: string
  agentName?: string
  prompt?: string
  schedule?: string
  timezone?: string
  enabled?: boolean
  maxRetries?: number
  timeoutMinutes?: number
  notifyOnFailure?: boolean
  failureChannelId?: string
  failureChannelName?: string
  nextRunAt?: string
  lastRunAt?: string
  lastRunStatus?: 'success' | 'failure' | 'never'
  lastRunOutput?: string
  lastRunDurationMs?: number
  createdAt?: string
  updatedAt?: string
}

export interface Channel {
  id: string
  name: string
  enabled: boolean
  type?: 'telegram' | 'discord' | 'slack' | 'whatsapp' | 'web' | string
  status?: 'connected' | 'not_connected' | 'error'
  description?: string
  agentId?: string
  agentName?: string
  updatedAt?: string
  error?: string
  config?: {
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

export interface ChannelTestResponse {
  ok: boolean
  message: string
  timestamp?: string
}

export interface WhatsappQrResponse {
  status: 'pending' | 'connected'
  qrCodeDataUrl: string
  phoneNumber?: string
}

export interface Instance {
  id: string
  name: string
  type?: 'chat-session' | 'telegram-bot' | 'discord-bot' | 'cron-job' | 'webhook'
  status?: 'running' | 'idle' | 'error' | 'stopped'
  agentId?: string
  agentName?: string
  startedAt?: string
  durationSeconds?: number
  memoryMb?: number
}

export interface InstanceLog {
  id: string
  instanceId?: string
  level: 'info' | 'warning' | 'error' | 'debug'
  type?: string
  agentName?: string
  message: string
  timestamp: string
}

export interface InstanceStats {
  activeSessions: number
  messagesToday: number
  cronExecutionsToday: number
  apiCallsToday: number
}

export interface AppSettings {
  theme?: string
  provider?: string
  [key: string]: unknown
}

export interface ProviderModelsResponse {
  [provider: string]: string[]
}

export interface VoiceOption {
  id: string
  name: string
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options

  const response = await fetch(`/api${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

async function download(path: string, options: RequestOptions = {}): Promise<Blob> {
  const { body, headers, ...rest } = options

  const response = await fetch(`/api${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }

  return response.blob()
}

export interface CreateAgentPayload {
  name: string
  role: string
  personality?: string
  provider: string
  model: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  avatarColor?: string
}

type AgentInput = CreateAgentPayload
type WorkspaceInput = Partial<Workspace> & { name: string }
type MCPInput = Partial<MCPServer> & { name: string }
type SkillInput = Partial<Skill> & { name: string }
type CronInput = Partial<CronJob> & { name: string }
type ChannelInput = Partial<Channel>
type SettingsInput = Partial<AppSettings>

export const api = {
  agents: {
    list: () => request<Agent[]>('/agents'),
    get: (id: string) => request<Agent>(`/agents/${id}`),
    create: (payload: AgentInput) => request<Agent>('/agents', { method: 'POST', body: payload }),
    update: (id: string, payload: Partial<Agent>) =>
      request<Agent>(`/agents/${id}`, { method: 'PATCH', body: payload }),
    delete: (id: string) => request<void>(`/agents/${id}`, { method: 'DELETE' }),
    memory: (id: string) => request<AgentMemory[]>(`/agents/${id}/memory`),
    addMemory: (
      id: string,
      payload: {
        content: string
        tier: 'hot' | 'episodic' | 'semantic'
        importance: number
        tags: string[]
      },
    ) => request<AgentMemory>(`/agents/${id}/memory`, { method: 'POST', body: payload }),
    sessions: (id: string) => request<AgentSession[]>(`/agents/${id}/sessions`),
    createSession: (id: string) => request<AgentSession>(`/agents/${id}/sessions`, { method: 'POST' }),
    messages: (id: string, sessionId?: string) =>
      request<AgentMessage[]>(`/agents/${id}/messages${sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''}`),
    chat: (id: string, payload: { message: string; sessionId?: string }) =>
      request<ChatResponse>(`/agents/${id}/chat`, { method: 'POST', body: payload }),
    files: (id: string) => request<AgentFile[]>(`/agents/${id}/files`),
    file: (id: string, filename: string) => request<AgentFile>(`/agents/${id}/files/${encodeURIComponent(filename)}`),
    saveFile: (id: string, filename: string, content: string) =>
      request<AgentFile>(`/agents/${id}/files/${encodeURIComponent(filename)}`, {
        method: 'POST',
        body: { content },
      }),
    workspaces: (id: string) => request<AgentWorkspace[]>(`/agents/${id}/workspaces`),
    skills: (id: string) => request<AgentSkill[]>(`/agents/${id}/skills`),
    toggleSkill: (id: string, skillId: string, enabled: boolean) =>
      request<AgentSkill>(`/agents/${id}/skills/${skillId}`, {
        method: 'PATCH',
        body: { enabled },
      }),
    mcps: (id: string) => request<AgentMCP[]>(`/agents/${id}/mcps`),
    addMcp: (
      id: string,
      payload: {
        name: string
        transport?: string
        endpoint?: string
      },
    ) => request<AgentMCP>(`/agents/${id}/mcps`, { method: 'POST', body: payload }),
  },
  chat: {
    send: (payload: { agentId?: string; message: string; sessionId?: string }) =>
      request<AgentMessage>('/chat', { method: 'POST', body: payload }),
    stream: (payload: { agentId?: string; message?: string; sessionId?: string }) => {
      const params = new URLSearchParams()

      if (payload.agentId) params.set('agentId', payload.agentId)
      if (payload.message) params.set('message', payload.message)
      if (payload.sessionId) params.set('sessionId', payload.sessionId)

      return new EventSource(`/api/chat/stream?${params.toString()}`)
    },
  },
  workspaces: {
    list: () => request<Workspace[]>('/workspaces'),
    get: (id: string) => request<Workspace>(`/workspaces/${id}`),
    create: (payload: WorkspaceInput) => request<Workspace>('/workspaces', { method: 'POST', body: payload }),
    update: (id: string, payload: Partial<Workspace>) =>
      request<Workspace>(`/workspaces/${id}`, { method: 'PATCH', body: payload }),
    delete: (id: string) => request<void>(`/workspaces/${id}`, { method: 'DELETE' }),
    addAgent: (id: string, agentId: string, role?: string) =>
      request<Workspace>(`/workspaces/${id}/agents`, { method: 'POST', body: { agentId, role } }),
    removeAgent: (id: string, agentId: string) =>
      request<void>(`/workspaces/${id}/agents/${agentId}`, { method: 'DELETE' }),
    tasks: (id: string) => request<WorkspaceTask[]>(`/workspaces/${id}/tasks`),
    createTask: (
      id: string,
      payload: {
        title: string
        description?: string
        status?: WorkspaceTask['status']
        priority?: WorkspaceTask['priority']
        requiredSkills?: string[]
      },
    ) =>
      request<WorkspaceTask>(`/workspaces/${id}/tasks`, { method: 'POST', body: payload }),
    updateTask: (id: string, taskId: string, payload: Partial<WorkspaceTask>) =>
      request<WorkspaceTask>(`/workspaces/${id}/tasks/${taskId}`, { method: 'PATCH', body: payload }),
  },
  mcps: {
    list: () => request<MCPServer[]>('/mcps'),
    get: (id: string) => request<MCPServer>(`/mcps/${id}`),
    create: (payload: MCPInput) => request<MCPServer>('/mcps', { method: 'POST', body: payload }),
    update: (id: string, payload: Partial<MCPServer>) =>
      request<MCPServer>(`/mcps/${id}`, { method: 'PATCH', body: payload }),
    delete: (id: string) => request<void>(`/mcps/${id}`, { method: 'DELETE' }),
    test: (id: string) =>
      request<{ ok: boolean; message?: string; responseTimeMs?: number; tools?: string[] }>(`/mcps/${id}/test`, { method: 'POST' }),
  },
  skills: {
    list: () => request<Skill[]>('/skills'),
    get: (id: string) => request<Skill>(`/skills/${id}`),
    create: (payload: SkillInput) => request<Skill>('/skills', { method: 'POST', body: payload }),
    update: (id: string, payload: Partial<Skill>) =>
      request<Skill>(`/skills/${id}`, { method: 'PATCH', body: payload }),
    delete: (id: string) => request<void>(`/skills/${id}`, { method: 'DELETE' }),
    toggle: (id: string, enabled: boolean) =>
      request<Skill>(`/skills/${id}/toggle`, { method: 'POST', body: { enabled } }),
    previewImport: (url: string) =>
      request<{ name: string; content: string; sourceUrl: string }>('/skills/import/preview', { method: 'POST', body: { url } }),
    importFromUrl: (payload: {
      url: string
      name: string
      category: NonNullable<Skill['category']>
      tags: string[]
      content: string
      description?: string
    }) => request<Skill>('/skills/import', { method: 'POST', body: payload }),
  },
  cron: {
    list: () => request<CronJob[]>('/cron'),
    get: (id: string) => request<CronJob>(`/cron/${id}`),
    create: (payload: CronInput) => request<CronJob>('/cron', { method: 'POST', body: payload }),
    update: (id: string, payload: Partial<CronJob>) =>
      request<CronJob>(`/cron/${id}`, { method: 'PATCH', body: payload }),
    delete: (id: string) => request<void>(`/cron/${id}`, { method: 'DELETE' }),
    run: (id: string) => request<CronJob & { ok: boolean }>(`/cron/${id}/run`, { method: 'POST' }),
  },
  channels: {
    list: () => request<Channel[]>('/channels'),
    get: (id: string) => request<Channel>(`/channels/${id}`),
    update: (id: string, payload: ChannelInput) =>
      request<Channel>(`/channels/${id}`, { method: 'PATCH', body: payload }),
    test: (id: string, payload: { chatId?: string }) =>
      request<ChannelTestResponse>(`/channels/${id}/test`, { method: 'POST', body: payload }),
    whatsappQr: () => request<WhatsappQrResponse>('/channels/whatsapp/qr'),
  },
  instances: {
    list: () => request<Instance[]>('/instances'),
    stats: () => request<InstanceStats>('/instances/stats'),
    get: (id: string) => request<Instance>(`/instances/${id}`),
    logs: (id: string) => request<InstanceLog[]>(`/instances/${id}/logs`),
    stop: (id: string) => request<Instance>(`/instances/${id}/stop`, { method: 'POST' }),
  },
  settings: {
    get: () => request<AppSettings>('/settings'),
    update: (payload: SettingsInput) => request<AppSettings>('/settings', { method: 'PATCH', body: payload }),
    test: (provider: string) => request<{ ok: boolean; message?: string; error?: string }>(`/settings/test/${provider}`, { method: 'POST' }),
    restart: () => request<{ ok: boolean; message: string }>('/system/restart', { method: 'POST' }),
  },
  providers: {
    models: () => request<ProviderModelsResponse>('/providers/models'),
  },
  voice: {
    voices: () => request<VoiceOption[]>('/voice/voices'),
    tts: (text: string) => request<{ ok: boolean; text: string; audioUrl: string | null; message: string }>('/voice/tts', { method: 'POST', body: { text } }),
  },
  imports: {
    openClaw: (payload: Record<string, unknown>) =>
      request<{ id: string; status: string; imported?: Record<string, unknown>; message?: string }>('/import/openclaw', {
        method: 'POST',
        body: payload,
      }),
    exportAll: () => download('/export/all', { method: 'POST' }),
  },
  health: {
    get: () => request<HealthResponse>('/health'),
  },
}
