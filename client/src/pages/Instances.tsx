import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Activity, Bot, Clock3, Database, Power, TerminalSquare } from 'lucide-react'
import { api, type Agent, type Instance, type InstanceLog, type InstanceStats } from '../lib/api'
import { socket } from '../lib/socket'
import { toast } from '../lib/toast'

type StatusFilter = 'all' | NonNullable<Instance['status']>
type TypeFilter = 'all' | NonNullable<Instance['type']>
type LogLevelFilter = 'all' | NonNullable<InstanceLog['level']>

const typeOptions: TypeFilter[] = ['all', 'chat-session', 'telegram-bot', 'discord-bot', 'cron-job', 'webhook']

function durationLabel(seconds?: number) {
  const value = seconds ?? 0
  if (value >= 3600) return `${Math.floor(value / 3600)}h`
  if (value >= 60) return `${Math.floor(value / 60)}m`
  return `${value}s`
}

function relative(value?: string) {
  return value ? formatDistanceToNow(new Date(value), { addSuffix: true }) : 'Unknown'
}

function statusDot(status?: Instance['status']) {
  if (status === 'running') return 'bg-paw-success'
  if (status === 'idle') return 'bg-paw-warning'
  if (status === 'error') return 'bg-paw-danger'
  return 'bg-paw-faint'
}

function typeBadgeTone(type?: Instance['type']) {
  if (type === 'cron-job') return 'bg-paw-warning-bg text-paw-warning'
  if (type === 'telegram-bot' || type === 'discord-bot') return 'bg-paw-info-bg text-paw-info'
  if (type === 'webhook') return 'bg-paw-success-bg text-paw-success'
  return 'bg-paw-accent-bg text-paw-accent'
}

function levelTone(level?: InstanceLog['level']) {
  if (level === 'error') return 'text-paw-danger'
  if (level === 'warning') return 'text-paw-warning'
  if (level === 'debug') return 'text-paw-faint'
  return 'text-[#4ade80]'
}

export function Instances() {
  const logViewportRef = useRef<HTMLDivElement | null>(null)
  const [instances, setInstances] = useState<Instance[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [logs, setLogs] = useState<InstanceLog[]>([])
  const [stats, setStats] = useState<InstanceStats>({
    activeSessions: 0,
    messagesToday: 0,
    cronExecutionsToday: 0,
    apiCallsToday: 0,
  })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [agentFilter, setAgentFilter] = useState('all')
  const [logLevelFilter, setLogLevelFilter] = useState<LogLevelFilter>('all')
  const [logAgentFilter, setLogAgentFilter] = useState('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const [stoppingId, setStoppingId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.instances.list(), api.instances.stats(), api.instances.logs('stream'), api.agents.list()])
      .then(([instanceData, statsData, logData, agentData]) => {
        setInstances(instanceData)
        setStats(statsData)
        setLogs(logData)
        setAgents(agentData)
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load instances'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handleStats = (nextStats: InstanceStats) => setStats(nextStats)
    const handleLog = (entry: InstanceLog) => setLogs((current) => [...current.slice(-199), entry])

    socket.on('instance:update', handleStats)
    socket.on('instance:log', handleLog)

    return () => {
      socket.off('instance:update', handleStats)
      socket.off('instance:log', handleLog)
    }
  }, [])

  useEffect(() => {
    if (!autoScroll || !logViewportRef.current) return
    logViewportRef.current.scrollTop = logViewportRef.current.scrollHeight
  }, [autoScroll, logs])

  const filteredInstances = useMemo(
    () =>
      instances.filter((instance) => {
        if (statusFilter !== 'all' && instance.status !== statusFilter) return false
        if (typeFilter !== 'all' && instance.type !== typeFilter) return false
        if (agentFilter !== 'all' && instance.agentId !== agentFilter) return false
        return true
      }),
    [agentFilter, instances, statusFilter, typeFilter],
  )

  const filteredLogs = useMemo(
    () =>
      logs.filter((entry) => {
        if (logLevelFilter !== 'all' && entry.level !== logLevelFilter) return false
        if (logAgentFilter !== 'all' && entry.agentName !== logAgentFilter) return false
        return true
      }),
    [logAgentFilter, logLevelFilter, logs],
  )

  const stopInstance = async (instance: Instance) => {
    setStoppingId(instance.id)
    try {
      const updated = await api.instances.stop(instance.id)
      setInstances((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)))
      toast.success(`${instance.name} stopped`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to stop instance')
    } finally {
      setStoppingId(null)
    }
  }

  return (
    <div className="min-h-0 flex h-full flex-1 flex-col overflow-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-2xl border border-paw-border bg-gradient-to-br from-paw-surface via-paw-surface to-paw-raised/70 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-paw-accent-bg text-paw-accent">
              <Activity size={20} />
            </div>
            <div>
              <h1 className="mb-2 text-[clamp(1.75rem,1.4rem+1vw,2.2rem)] font-semibold tracking-tight text-paw-text">Instances</h1>
              <p className="max-w-4xl text-sm leading-7 text-paw-muted">Every active agent session, channel bot, and cron execution is an instance. Monitor them here in real time.</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Active Sessions', value: stats.activeSessions, icon: Bot },
            { label: 'Messages Today', value: stats.messagesToday, icon: TerminalSquare },
            { label: 'Cron Executions Today', value: stats.cronExecutionsToday, icon: Clock3 },
            { label: 'API Calls Today', value: stats.apiCallsToday, icon: Database },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="rounded-2xl border border-paw-border bg-paw-surface p-4">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-paw-accent-bg text-paw-accent">
                  <Icon size={16} />
                </div>
                <div className="text-2xl font-semibold text-paw-text">{stat.value}</div>
                <div className="mt-1 text-sm text-paw-muted">{stat.label}</div>
              </div>
            )
          })}
        </section>

        <section className="rounded-2xl border border-paw-border bg-paw-surface">
          <div className="border-b border-paw-border px-5 py-4">
            <div className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-paw-faint">Instances</div>
            <div className="grid gap-3 md:grid-cols-3">
              <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
                <option value="all">All statuses</option>
                <option value="running">Running</option>
                <option value="idle">Idle</option>
                <option value="error">Error</option>
                <option value="stopped">Stopped</option>
              </select>
              <select className="input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All types' : type}
                  </option>
                ))}
              </select>
              <select className="input" value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)}>
                <option value="all">All agents</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-12 animate-pulse rounded-xl bg-paw-raised" />)}
            </div>
          ) : filteredInstances.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-10 text-center">
              <Activity size={42} className="mb-4 text-paw-faint opacity-20" />
              <h2 className="mb-2 text-lg font-semibold text-paw-text">No active instances</h2>
              <p className="max-w-md text-sm leading-7 text-paw-muted">Start chatting with an agent or configure a channel.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-paw-border bg-paw-bg text-xs uppercase tracking-[0.16em] text-paw-faint">
                  <tr>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Agent</th>
                    <th className="px-5 py-3">Started</th>
                    <th className="px-5 py-3">Duration</th>
                    <th className="px-5 py-3">Memory</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paw-border">
                  {filteredInstances.map((instance) => (
                    <tr key={instance.id} className="bg-paw-surface">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${statusDot(instance.status)}`} />
                          <span className="capitalize text-paw-text">{instance.status}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs ${typeBadgeTone(instance.type)}`}>{instance.type}</span>
                      </td>
                      <td className="px-5 py-4 text-paw-text">{instance.agentName ?? '-'}</td>
                      <td className="px-5 py-4 text-paw-muted">{relative(instance.startedAt)}</td>
                      <td className="px-5 py-4 text-paw-muted">{durationLabel(instance.durationSeconds)}</td>
                      <td className="px-5 py-4 text-paw-muted">{instance.memoryMb ? `${instance.memoryMb} MB` : '-'}</td>
                      <td className="px-5 py-4">
                        {instance.status === 'running' ? (
                          <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => void stopInstance(instance)} disabled={stoppingId === instance.id}>
                            <Power size={14} />
                            {stoppingId === instance.id ? 'Stopping...' : 'Stop'}
                          </button>
                        ) : (
                          <span className="text-xs text-paw-faint">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-paw-border bg-paw-surface overflow-hidden">
          <div className="border-b border-paw-border px-5 py-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-paw-faint">Live Log Stream</div>
              <div className="flex gap-2">
                <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setAutoScroll((current) => !current)}>
                  {autoScroll ? 'Pause scroll' : 'Resume scroll'}
                </button>
                <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setLogs([])}>
                  Clear logs
                </button>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-[auto_auto_auto_180px]">
              <div className="flex flex-wrap gap-2">
                {(['all', 'info', 'warning', 'error', 'debug'] as const).map((level) => (
                  <button key={level} type="button" className={`rounded-full px-3 py-1.5 text-xs transition ${logLevelFilter === level ? 'bg-paw-accent-bg text-paw-accent' : 'bg-paw-raised text-paw-muted hover:text-paw-text'}`} onClick={() => setLogLevelFilter(level)}>
                    {level === 'all' ? 'All' : level.toUpperCase()}
                  </button>
                ))}
              </div>
              <select className="input lg:col-start-4" value={logAgentFilter} onChange={(event) => setLogAgentFilter(event.target.value)}>
                <option value="all">All agents</option>
                {Array.from(new Set(logs.map((entry) => entry.agentName).filter(Boolean) as string[])).map((agentName) => (
                  <option key={agentName} value={agentName}>
                    {agentName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="resize-y overflow-hidden bg-black" style={{ minHeight: 260, maxHeight: '60vh', height: 320 }}>
            <div ref={logViewportRef} className="h-full overflow-y-auto px-4 py-4 font-mono text-xs">
              {filteredLogs.length === 0 ? (
                <div className="text-paw-faint">Waiting for logs...</div>
              ) : (
                <div className="space-y-1.5">
                  {filteredLogs.map((entry) => (
                    <div key={entry.id} className={`${levelTone(entry.level)} break-words`}>
                      <span className="text-paw-faint">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>{' '}
                      <span className="text-white/70">[{String(entry.level).toUpperCase()}]</span>{' '}
                      <span className="text-white/70">[{entry.agentName ?? entry.type ?? 'system'}]</span>{' '}
                      <span>{entry.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
