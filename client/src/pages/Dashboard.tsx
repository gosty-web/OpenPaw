import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Bot,
  CheckCircle2,
  Eye,
  MessageSquare,
  Plug,
  Settings,
  Sparkles,
  Zap,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api, type AgentMessage, type HealthResponse } from '../lib/api'

type StatusMeta = {
  label: string
  color: string
  dot: string
  pulse: boolean
}

type DashboardActivity = AgentMessage & {
  agentName: string
}

type StatCardProps = {
  icon: typeof Bot
  label: string
  value: number
  tone: string
  iconBg: string
}

type AgentCardProps = {
  agent: any
  onOpen: (id: string) => void
}

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let frame = 0
    let animationFrame = 0
    const steps = Math.max(18, Math.min(48, duration / 16))

    const run = () => {
      frame += 1
      const progress = Math.min(frame / steps, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(run)
      }
    }

    setValue(0)
    animationFrame = window.requestAnimationFrame(run)

    return () => window.cancelAnimationFrame(animationFrame)
  }, [duration, target])

  return value
}

function getGreeting() {
  const hour = new Date().getHours()

  if (hour < 12) {
    return 'Good morning'
  }

  if (hour < 18) {
    return 'Good afternoon'
  }

  return 'Good evening'
}

function normalizeStatus(status?: string): StatusMeta {
  const value = String(status ?? 'idle').toLowerCase()

  if (value.includes('think')) {
    return { label: 'Thinking', color: 'text-paw-warning', dot: 'bg-paw-warning', pulse: true }
  }

  if (value.includes('work') || value.includes('run') || value.includes('busy')) {
    return { label: 'Working', color: 'text-paw-info', dot: 'bg-paw-info', pulse: true }
  }

  if (value.includes('online') || value.includes('active') || value.includes('ready')) {
    return { label: 'Online', color: 'text-paw-success', dot: 'bg-paw-success', pulse: true }
  }

  if (value.includes('error') || value.includes('fail')) {
    return { label: 'Error', color: 'text-paw-danger', dot: 'bg-paw-danger', pulse: false }
  }

  if (value.includes('sleep')) {
    return { label: 'Sleeping', color: 'text-paw-faint', dot: 'bg-paw-faint', pulse: false }
  }

  return { label: 'Idle', color: 'text-paw-muted', dot: 'bg-paw-faint', pulse: false }
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'OP'
}

function truncateMessage(content: string, limit = 60) {
  if (content.length <= limit) {
    return content
  }

  return `${content.slice(0, limit).trimEnd()}...`
}

function extractNumber(source: any, keys: string[]) {
  for (const key of keys) {
    const value = source?.[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }

  return 0
}

function StatCard({ icon: Icon, label, value, tone, iconBg }: StatCardProps) {
  const displayValue = useCountUp(value)

  return (
    <div className="rounded-xl border border-paw-border bg-paw-surface p-5 transition-all duration-200 hover:border-paw-border-strong hover:shadow-lg">
      <div className={`mb-3 flex h-7 w-7 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon size={16} className={tone} />
      </div>
      <div className="text-2xl font-bold text-paw-text">{displayValue}</div>
      <div className="mt-1 text-xs font-medium text-paw-muted">{label}</div>
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
  cta,
  onClick,
}: {
  icon: typeof Bot
  title: string
  description: string
  cta: string
  onClick: () => void
}) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-paw-border bg-paw-surface px-6 py-10 text-center">
      <Icon size={42} className="mb-4 text-paw-faint opacity-20" />
      <h3 className="mb-2 text-lg font-semibold text-paw-text">{title}</h3>
      <p className="mb-6 max-w-md text-sm leading-6 text-paw-muted">{description}</p>
      <button type="button" onClick={onClick} className="btn-primary">
        {cta}
      </button>
    </div>
  )
}

function AgentRowCard({ agent, onOpen }: AgentCardProps) {
  const status = normalizeStatus(agent.status)
  const model = agent.model ?? 'Model not configured'

  return (
    <button
      type="button"
      onClick={() => onOpen(agent.id)}
      className="group flex w-full items-center gap-4 border-b border-paw-border-subtle bg-paw-surface px-4 py-3 text-left transition-colors hover:bg-paw-raised last:border-b-0"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-paw-accent to-violet-700 text-xs font-semibold text-white">
        {getInitials(agent.name ?? 'Agent')}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-paw-text">{agent.name ?? 'Unnamed Agent'}</div>
        <div className="mt-1 truncate text-xs text-paw-muted">{agent.role ?? 'General purpose agent'}</div>
      </div>

      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${status.color}`}>
        <span className={`h-2 w-2 rounded-full ${status.dot} ${status.pulse ? 'animate-pulse-soft' : ''}`} />
        {status.label}
      </span>
      <span className="rounded-md border border-paw-border bg-paw-raised px-1.5 py-0.5 text-[10px] font-mono text-paw-muted">
        {model}
      </span>
      <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        <MessageSquare size={16} className="text-paw-faint" />
        <Settings size={16} className="text-paw-faint" />
        <Eye size={16} className="text-paw-faint" />
      </div>
    </button>
  )
}

function SkeletonBar({ width = 'w-full' }: { width?: string }) {
  return <div className={`mb-2 h-4 rounded bg-paw-raised animate-pulse ${width}`} />
}

export function Dashboard() {
  const navigate = useNavigate()
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [healthError, setHealthError] = useState(false)
  const [recentActivity, setRecentActivity] = useState<DashboardActivity[]>([])
  const [activityLoading, setActivityLoading] = useState(true)

  useEffect(() => {
    let alive = true

    api.agents
      .list()
      .then((data) => {
        if (alive) {
          setAgents(Array.isArray(data) ? data : [])
        }
      })
      .catch(() => {
        if (alive) {
          setAgents([])
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false)
        }
      })

    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true

    api.health
      .get()
      .then((data) => {
        if (alive) {
          setHealth(data)
          setHealthError(false)
        }
      })
      .catch(() => {
        if (alive) {
          setHealth(null)
          setHealthError(true)
        }
      })

    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true

    if (!agents.length) {
      setRecentActivity([])
      setActivityLoading(false)
      return () => {
        alive = false
      }
    }

    setActivityLoading(true)

    Promise.all(
      agents.map(async (agent) => {
        try {
          const messages = await api.agents.messages(String(agent.id))
          return (messages ?? []).map((message) => ({
            ...message,
            agentName: agent.name ?? 'Agent',
            agentId: message.agentId ?? agent.id,
          }))
        } catch {
          return []
        }
      }),
    )
      .then((batches) => {
        if (!alive) {
          return
        }

        const nextActivity = batches
          .flat()
          .sort((left, right) => {
            const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0
            const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0
            return rightTime - leftTime
          })
          .slice(0, 10)

        setRecentActivity(nextActivity)
      })
      .finally(() => {
        if (alive) {
          setActivityLoading(false)
        }
      })

    return () => {
      alive = false
    }
  }, [agents])

  const stats = useMemo(() => {
    const activeStatuses = new Set(['online', 'active', 'thinking', 'working', 'running', 'busy', 'ready'])
    const activeConversations = agents.filter((agent) => {
      const status = String(agent.status ?? '').toLowerCase()
      return [...activeStatuses].some((value) => status.includes(value))
    }).length

    const completedTasks = agents.reduce((sum, agent) => {
      return (
        sum +
        extractNumber(agent, ['tasksCompleted', 'completedTasks', 'taskCompletions', 'completed_runs', 'completedRuns'])
      )
    }, 0)

    const skillsLoaded = agents.reduce((sum, agent) => {
      if (Array.isArray(agent.skills)) {
        return sum + agent.skills.length
      }

      return sum + extractNumber(agent, ['skillsLoaded', 'loadedSkills', 'skillCount'])
    }, 0)

    return {
      totalAgents: agents.length,
      activeConversations,
      completedTasks,
      skillsLoaded,
    }
  }, [agents])

  const greeting = getGreeting()
  const online = health?.status === 'ok' && !healthError

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto bg-paw-bg">
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-8 p-6 md:p-8 animate-fade-in">
        <section>
          <h1 className="text-2xl font-semibold text-paw-text">{greeting}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-paw-muted">
            <span className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-paw-success animate-pulse-soft' : 'bg-paw-danger'}`} />
            <span>
              {online ? 'OpenPaw is online' : 'OpenPaw is reconnecting'} · {agents.length} agents ready
            </span>
            {health?.timestamp && (
              <>
                <span className="text-paw-faint">·</span>
                <span>Last check {formatDistanceToNow(new Date(health.timestamp), { addSuffix: true })}</span>
              </>
            )}
            {healthError && <span className="text-paw-danger">Health unavailable</span>}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Bot}
            label="Total Agents"
            value={stats.totalAgents}
            tone="text-paw-accent-h"
            iconBg="bg-paw-accent/15"
          />
          <StatCard
            icon={MessageSquare}
            label="Active Conversations"
            value={stats.activeConversations}
            tone="text-blue-400"
            iconBg="bg-blue-500/15"
          />
          <StatCard
            icon={CheckCircle2}
            label="Tasks Completed"
            value={stats.completedTasks}
            tone="text-paw-success"
            iconBg="bg-paw-success/15"
          />
          <StatCard
            icon={Zap}
            label="Skills Loaded"
            value={stats.skillsLoaded}
            tone="text-amber-400"
            iconBg="bg-amber-500/15"
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px]">
          <div className="flex min-h-0 flex-col gap-6">
            <div className="rounded-2xl border border-paw-border bg-paw-surface p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-paw-text">Agents</h2>
                  <span className="badge bg-paw-raised text-paw-muted">{agents.length}</span>
                </div>
                <button type="button" onClick={() => navigate('/agents')} className="btn-primary">
                  New Agent
                </button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="rounded-xl border border-paw-border bg-paw-bg px-4 py-4">
                      <SkeletonBar width="w-3/4" />
                      <SkeletonBar width="w-1/2" />
                      <SkeletonBar width="w-2/3 !mb-0" />
                    </div>
                  ))}
                </div>
              ) : agents.length > 0 ? (
                <div className="rounded-xl border border-paw-border">
                  {agents.map((agent) => (
                    <AgentRowCard key={agent.id} agent={agent} onOpen={(id) => navigate(`/agents/${id}`)} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Bot}
                  title="No agents yet"
                  description="Create your first agent to start conversations, run tasks, and connect the rest of your local-first workflow."
                  cta="Create your first agent"
                  onClick={() => navigate('/agents')}
                />
              )}
            </div>

            <div className="rounded-2xl border border-paw-border bg-paw-surface p-5">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-paw-text">Quick Actions</h2>
                <p className="mt-1 text-sm text-paw-muted">Jump straight into the most common setup flows.</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <button
                  type="button"
                  onClick={() => navigate('/agents')}
                  className="group rounded-xl border border-paw-border bg-paw-surface p-4 text-left transition-all duration-200 hover:border-paw-border-strong hover:bg-paw-raised/50"
                >
                  <Bot size={20} className="mb-3 text-paw-accent" />
                  <div className="text-sm font-semibold text-paw-text">New Agent</div>
                  <div className="mt-1 text-xs text-paw-muted">Spin up a new local worker with tools and memory.</div>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/chat')}
                  className="group rounded-xl border border-paw-border bg-paw-surface p-4 text-left transition-all duration-200 hover:border-paw-border-strong hover:bg-paw-raised/50"
                >
                  <MessageSquare size={20} className="mb-3 text-blue-400" />
                  <div className="text-sm font-semibold text-paw-text">New Chat</div>
                  <div className="mt-1 text-xs text-paw-muted">Open a fresh conversation with your active agents.</div>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/mcps')}
                  className="group rounded-xl border border-paw-border bg-paw-surface p-4 text-left transition-all duration-200 hover:border-paw-border-strong hover:bg-paw-raised/50"
                >
                  <Plug size={20} className="mb-3 text-paw-success" />
                  <div className="text-sm font-semibold text-paw-text">Add MCP</div>
                  <div className="mt-1 text-xs text-paw-muted">Connect more tools and context through MCP servers.</div>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/import')}
                  className="group rounded-xl border border-paw-border bg-paw-surface p-4 text-left transition-all duration-200 hover:border-paw-border-strong hover:bg-paw-raised/50"
                >
                  <Sparkles size={20} className="mb-3 text-paw-warning" />
                  <div className="text-sm font-semibold text-paw-text">Import from OpenClaw</div>
                  <div className="mt-1 text-xs text-paw-muted">Bring over agents, prompts, and runtime config from an existing setup.</div>
                </button>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-paw-border bg-paw-surface p-5">
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-paw-text">Recent Activity</h2>
              <p className="mt-1 text-sm text-paw-muted">Latest message traffic across your agent network.</p>
            </div>

            {activityLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="rounded-xl border border-paw-border bg-paw-bg px-4 py-4">
                    <SkeletonBar width="w-1/2" />
                    <SkeletonBar width="w-3/4" />
                    <SkeletonBar width="w-1/3 !mb-0" />
                  </div>
                ))}
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 border-b border-paw-border-subtle py-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paw-accent-bg text-[10px] font-semibold text-paw-accent">
                      {getInitials(item.agentName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-xs font-medium text-paw-text">{item.agentName}</span>
                        <span className="shrink-0 text-xs text-paw-faint">
                          {item.createdAt
                            ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })
                            : 'Just now'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-paw-muted">
                        {truncateMessage(item.content ?? 'No message content available')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={MessageSquare}
                title="No recent messages"
                description="Once your agents start chatting, the latest activity will appear here with timestamps and previews."
                cta="Open chat"
                onClick={() => navigate('/chat')}
              />
            )}
          </aside>
        </section>
      </div>
    </div>
  )
}
