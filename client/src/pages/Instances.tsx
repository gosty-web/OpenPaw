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

function levelPillClass(level: LogLevelFilter, active: boolean) {
  if (!active) return 'bg-paw-raised text-paw-muted hover:text-paw-text border border-paw-border'
  if (level === 'error') return 'bg-paw-danger/15 text-paw-danger border border-paw-danger/30'
  if (level === 'warning') return 'bg-paw-warning/15 text-paw-warning border border-paw-warning/30'
  if (level === 'debug') return 'bg-paw-faint/15 text-paw-faint border border-paw-faint/30'
  if (level === 'info') return 'bg-paw-info/15 text-paw-info border border-paw-info/30'
  return 'bg-paw-accent-bg text-paw-accent border border-paw-accent/30'
}

function levelLabelClass(level?: InstanceLog['level']) {
  if (level === 'error') return 'text-red-400'
  if (level === 'warning') return 'text-amber-400'
  if (level === 'debug') return 'text-gray-500'
  return 'text-blue-400'
}

function levelMessageClass(level?: InstanceLog['level']) {
  if (level === 'error') return 'text-red-300'
  if (level === 'warning') return 'text-amber-300'
  if (level === 'debug') return 'text-gray-400'
  return 'text-green-400'
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
        <header className="relative overflow-hidden rounded-2xl border border-paw-border bg-paw-surface p-6 shadow-sm shadow-black/5">
          <div className="relative z-10 flex items-start gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-paw-accent/10 text-paw-accent">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-paw-text">Runtime Instances</h1>
              <p className="mt-1 max-w-4xl text-sm leading-relaxed text-paw-muted">Live monitoring of agent sessions, channel bots, and background task executions. Real-time telemetry and resource oversight.</p>
            </div>
          </div>
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-paw-accent/5 blur-3xl" />
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Active Sessions', value: stats.activeSessions, icon: Bot, trend: 'Live' },
            { label: 'Msgs / 24h', value: stats.messagesToday, icon: TerminalSquare, trend: '+12%' },
            { label: 'Cron Cycles', value: stats.cronExecutionsToday, icon: Clock3, trend: '100% stable' },
            { label: 'API Throttling', value: stats.apiCallsToday, icon: Database, trend: 'Optimized' },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="group relative rounded-2xl border border-paw-border bg-paw-surface p-5 transition-all hover:border-paw-accent/30 hover:shadow-lg hover:shadow-black/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-paw-raised/50 text-paw-accent group-hover:bg-paw-accent/10 transition-colors">
                    <Icon size={18} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-paw-faint">{stat.trend}</span>
                </div>
                <div className="text-3xl font-semibold tracking-tight text-paw-text">{stat.value}</div>
                <div className="mt-1 text-xs font-medium text-paw-muted">{stat.label}</div>
              </div>
            )
          })}
        </section>

        <section className="rounded-2xl border border-paw-border bg-paw-surface shadow-sm shadow-black/10">
          <div className="border-b border-paw-border px-5 py-5 bg-paw-raised/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-paw-faint">Live Runtime Table</h3>
                <p className="mt-1 text-xs text-paw-muted">Click to view session details or manage life cycles.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select className="input h-9 !py-0 text-xs w-[140px]" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
                  <option value="all">All statuses</option>
                  <option value="running">Running</option>
                  <option value="idle">Idle</option>
                  <option value="error">Error</option>
                </select>
                <select className="input h-9 !py-0 text-xs w-[140px]" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}>
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type === 'all' ? 'All types' : type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-12 animate-pulse rounded-xl bg-paw-raised/50" />)}
            </div>
          ) : filteredInstances.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-12 text-center">
              <Activity size={42} className="mb-4 text-paw-faint opacity-20" />
              <h2 className="text-lg font-semibold text-paw-text">No active instances found</h2>
              <p className="max-w-xs mt-1 text-sm leading-relaxed text-paw-muted">Initiate an agent session or wait for a scheduled cron job trigger.</p>
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-paw-raised/50 text-[10px] font-bold uppercase tracking-widest text-paw-faint">
                  <tr>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Lifecycle</th>
                    <th className="px-6 py-4">Agent Entity</th>
                    <th className="px-6 py-4">Runtime</th>
                    <th className="px-6 py-4">Usage</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paw-border/50">
                  {filteredInstances.map((instance) => (
                    <tr key={instance.id} className="group hover:bg-paw-raised/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className={`h-2 w-2 rounded-full shadow-[0_0_8px] ${
                            instance.status === 'running' ? 'bg-paw-success shadow-paw-success/50' :
                            instance.status === 'error' ? 'bg-paw-danger shadow-paw-danger/50' : 'bg-paw-faint shadow-transparent'
                          }`} />
                          <span className="capitalize font-medium text-paw-text">{instance.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-md border border-current/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ${typeBadgeTone(instance.type)}`}>
                          {instance.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 group-hover:text-paw-accent transition-colors">
                        <span className="font-medium text-paw-text">{instance.agentName ?? 'System Kernel'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-paw-muted">{durationLabel(instance.durationSeconds)} elapsed</span>
                          <span className="text-[10px] text-paw-faint">Started {relative(instance.startedAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-paw-muted tabular-nums">
                        {instance.memoryMb ? `${instance.memoryMb}MB RAM` : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {instance.status === 'running' && (
                          <button 
                            type="button" 
                            className="btn-ghost h-8 w-8 !p-0 text-paw-danger hover:bg-paw-danger/10" 
                            onClick={() => void stopInstance(instance)} 
                            disabled={stoppingId === instance.id}
                            title="Kill Process"
                          >
                            <Power size={14} />
                          </button>
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
                  <button
                    key={level}
                    type="button"
                    className={`rounded-full px-3 py-1.5 text-xs transition ${levelPillClass(level, logLevelFilter === level)}`}
                    onClick={() => setLogLevelFilter(level)}
                  >
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

          <div className="h-1 bg-paw-border cursor-row-resize hover:bg-paw-accent/50 transition-colors" />
          <div className="resize-y overflow-hidden bg-black" style={{ minHeight: 260, maxHeight: '60vh', height: 320 }}>
            <div ref={logViewportRef} className="h-full overflow-y-auto px-4 py-4 font-mono text-xs">
              {filteredLogs.length === 0 ? (
                <div className="text-paw-faint">Waiting for logs...</div>
              ) : (
                <div className="space-y-1.5">
                  {filteredLogs.map((entry) => (
                    <div key={entry.id} className="break-words">
                      <span className="text-paw-faint/60">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>{' '}
                      <span className={levelLabelClass(entry.level)}>[{String(entry.level).toUpperCase()}]</span>{' '}
                      <span className="text-paw-muted/70">[{entry.agentName ?? entry.type ?? 'system'}]</span>{' '}
                      <span className={levelMessageClass(entry.level)}>{entry.message}</span>
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
