import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Clock3, Pause, Pencil, Play, Plus, Search, Trash2 } from 'lucide-react'
import { Modal } from '../components/Modal'
import { AgentAvatar } from '../components/chat/shared'
import { api, type Agent, type Channel, type CronJob } from '../lib/api'
import { toast } from '../lib/toast'

type Preset = '15m' | 'hourly' | 'daily' | 'weekly' | 'custom'

const timezones = ['Africa/Lagos', 'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Tokyo']
const weekdays = [
  { label: 'Sunday', value: '0' },
  { label: 'Monday', value: '1' },
  { label: 'Tuesday', value: '2' },
  { label: 'Wednesday', value: '3' },
  { label: 'Thursday', value: '4' },
  { label: 'Friday', value: '5' },
  { label: 'Saturday', value: '6' },
]

const relative = (value?: string) => (value ? formatDistanceToNow(new Date(value), { addSuffix: true }) : 'Never')

function formatSchedule(expr: string) {
  if (expr === '*/15 * * * *') return 'Every 15 minutes'
  if (expr === '0 * * * *') return 'Every hour'
  if (/^\d{1,2} \d{1,2} \* \* \*$/.test(expr)) {
    const [minute, hour] = expr.split(' ')
    return `Daily at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }
  if (/^\d{1,2} \d{1,2} \* \* [0-6]$/.test(expr)) {
    const [minute, hour, , , weekday] = expr.split(' ')
    const label = weekdays.find((entry) => entry.value === weekday)?.label ?? 'Weekly'
    return `Every ${label} at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }
  if (expr === '0 9 * * 1-5') return 'Every weekday at 09:00'
  return `Custom: ${expr}`
}

function scheduleFromPreset(preset: Preset, dailyTime: string, weeklyTime: string, weeklyDay: string, customCron: string) {
  if (preset === '15m') return '*/15 * * * *'
  if (preset === 'hourly') return '0 * * * *'
  if (preset === 'daily') {
    const [hour, minute] = dailyTime.split(':')
    return `${Number(minute)} ${Number(hour)} * * *`
  }
  if (preset === 'weekly') {
    const [hour, minute] = weeklyTime.split(':')
    return `${Number(minute)} ${Number(hour)} * * ${weeklyDay}`
  }
  return customCron.trim()
}

export function CronJobs() {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CronJob | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsJob, setDetailsJob] = useState<CronJob | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [agentId, setAgentId] = useState('')
  const [agentSearch, setAgentSearch] = useState('')
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [preset, setPreset] = useState<Preset>('15m')
  const [dailyTime, setDailyTime] = useState('09:00')
  const [weeklyTime, setWeeklyTime] = useState('09:00')
  const [weeklyDay, setWeeklyDay] = useState('1')
  const [customCron, setCustomCron] = useState('0 9 * * 1-5')
  const [timezone, setTimezone] = useState('Africa/Lagos')
  const [maxRetries, setMaxRetries] = useState(2)
  const [timeoutMinutes, setTimeoutMinutes] = useState(10)
  const [notifyOnFailure, setNotifyOnFailure] = useState(false)
  const [failureChannelId, setFailureChannelId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([api.cron.list(), api.agents.list(), api.channels.list()])
      .then(([cronData, agentData, channelData]) => {
        setJobs(cronData)
        setAgents(agentData)
        setChannels(channelData)
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load cron jobs'))
      .finally(() => setLoading(false))
  }, [])

  const filteredAgents = useMemo(() => {
    const query = agentSearch.trim().toLowerCase()
    return agents.filter((agent) => !query || `${agent.name} ${agent.role ?? ''}`.toLowerCase().includes(query))
  }, [agentSearch, agents])

  const currentSchedule = scheduleFromPreset(preset, dailyTime, weeklyTime, weeklyDay, customCron)

  const resetForm = () => {
    setEditing(null)
    setName('')
    setDescription('')
    setAgentId('')
    setAgentSearch('')
    setPrompt('')
    setPreset('15m')
    setDailyTime('09:00')
    setWeeklyTime('09:00')
    setWeeklyDay('1')
    setCustomCron('0 9 * * 1-5')
    setTimezone('Africa/Lagos')
    setMaxRetries(2)
    setTimeoutMinutes(10)
    setNotifyOnFailure(false)
    setFailureChannelId('')
  }

  const openCreate = () => {
    resetForm()
    setModalOpen(true)
  }

  const openEdit = (job: CronJob) => {
    setEditing(job)
    setName(job.name)
    setDescription(job.description ?? '')
    setAgentId(job.agentId ?? '')
    setAgentSearch(job.agentName ?? '')
    setPrompt(job.prompt ?? '')
    setTimezone(job.timezone ?? 'Africa/Lagos')
    setMaxRetries(job.maxRetries ?? 2)
    setTimeoutMinutes(job.timeoutMinutes ?? 10)
    setNotifyOnFailure(Boolean(job.notifyOnFailure))
    setFailureChannelId(job.failureChannelId ?? '')
    if (job.schedule === '*/15 * * * *') setPreset('15m')
    else if (job.schedule === '0 * * * *') setPreset('hourly')
    else if (job.schedule && /^\d{1,2} \d{1,2} \* \* \*$/.test(job.schedule)) {
      const [minute, hour] = job.schedule.split(' ')
      setPreset('daily')
      setDailyTime(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
    } else if (job.schedule && /^\d{1,2} \d{1,2} \* \* [0-6]$/.test(job.schedule)) {
      const [minute, hour, , , day] = job.schedule.split(' ')
      setPreset('weekly')
      setWeeklyTime(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
      setWeeklyDay(day)
    } else {
      setPreset('custom')
      setCustomCron(job.schedule ?? '0 9 * * 1-5')
    }
    setModalOpen(true)
  }

  const submit = async () => {
    if (!name.trim() || !agentId || !prompt.trim() || !currentSchedule) {
      toast.warning('Name, agent, task prompt, and schedule are required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        agentId,
        prompt: prompt.trim(),
        schedule: currentSchedule,
        timezone,
        maxRetries,
        timeoutMinutes,
        notifyOnFailure,
        failureChannelId: notifyOnFailure ? failureChannelId : undefined,
      }
      const result = editing ? await api.cron.update(editing.id, payload) : await api.cron.create(payload)
      setJobs((current) => {
        const index = current.findIndex((entry) => entry.id === result.id)
        if (index === -1) return [result, ...current]
        const copy = [...current]
        copy[index] = result
        return copy
      })
      setModalOpen(false)
      toast.success(editing ? 'Cron job updated' : 'Cron job created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save cron job')
    } finally {
      setSaving(false)
    }
  }

  const runNow = async (job: CronJob) => {
    try {
      const result = await api.cron.run(job.id)
      setJobs((current) => current.map((entry) => entry.id === job.id ? result : entry))
      toast.success(`${job.name} ran successfully`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to run job')
    }
  }

  const toggleStatus = async (job: CronJob) => {
    try {
      const updated = await api.cron.update(job.id, { enabled: !job.enabled })
      setJobs((current) => current.map((entry) => entry.id === job.id ? updated : entry))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update job')
    }
  }

  const removeJob = async (job: CronJob) => {
    try {
      await api.cron.delete(job.id)
      setJobs((current) => current.filter((entry) => entry.id !== job.id))
      toast.success(`${job.name} deleted`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete job')
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h1 className="text-[clamp(1.75rem,1.4rem+1vw,2.2rem)] font-semibold tracking-tight text-paw-text">Cron Jobs</h1>
              <span className="badge bg-paw-raised text-paw-muted">{jobs.length} jobs</span>
            </div>
            <p className="max-w-2xl text-sm text-paw-muted">Keep agents running useful work in the background with a clear schedule and observable run history.</p>
          </div>
          <button type="button" className="btn-primary self-start lg:self-auto" onClick={openCreate}>
            <Plus size={16} />
            Create Job
          </button>
        </header>

        <div className="rounded-2xl border border-paw-border bg-gradient-to-br from-paw-surface via-paw-surface to-paw-raised/70 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paw-accent-bg text-paw-accent">
              <Clock3 size={20} />
            </div>
            <p className="max-w-4xl text-sm leading-7 text-paw-muted">Cron jobs let your agents do things on a schedule - check emails, send reports, monitor feeds, run maintenance tasks - without you having to ask.</p>
          </div>
        </div>

        <section className="rounded-2xl border border-paw-border bg-paw-surface p-5">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-paw-raised" />)}
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-paw-border bg-paw-bg px-6 text-center">
              <Clock3 size={42} className="mb-4 text-paw-faint opacity-20" />
              <h3 className="mb-2 text-lg font-semibold text-paw-text">No scheduled tasks</h3>
              <p className="max-w-md text-sm leading-7 text-paw-muted">Create your first cron job to put routine monitoring, reports, and maintenance on autopilot.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-paw-border">
              <div className="grid gap-4 border-b border-paw-border bg-paw-bg px-4 py-3 text-xs uppercase tracking-[0.16em] text-paw-faint lg:grid-cols-[minmax(0,1.5fr)_220px_220px_260px]">
                <div>Job</div>
                <div>Schedule</div>
                <div>Agent</div>
                <div>Status</div>
              </div>
              <div className="divide-y divide-paw-border">
                {jobs.map((job) => (
                  <div key={job.id} className="group grid gap-4 bg-paw-surface px-4 py-4 transition-colors hover:bg-paw-raised/40 lg:grid-cols-[minmax(0,1.5fr)_220px_220px_260px]">
                    <div className="min-w-0">
                      <div className="font-medium text-paw-text">{job.name}</div>
                      <div className="mt-1 truncate text-sm text-paw-muted">{job.description || 'No description provided'}</div>
                    </div>
                    <div className="text-sm text-paw-muted">{formatSchedule(job.schedule ?? '')}</div>
                    <div className="flex items-center gap-3">
                      <AgentAvatar name={job.agentName ?? 'Agent'} size="sm" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-paw-text">{job.agentName ?? 'Unknown agent'}</div>
                        <div className="truncate text-xs text-paw-faint">{job.timezone ?? 'Africa/Lagos'}</div>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className={`text-sm font-medium ${job.enabled ? 'text-paw-success' : 'text-paw-warning'}`}>{job.enabled ? 'Active' : 'Paused'}</div>
                          <div className="mt-1 text-xs text-paw-faint">Next run {relative(job.nextRunAt)}</div>
                          <button type="button" className={`mt-1 text-xs ${job.lastRunStatus === 'failure' ? 'text-paw-danger' : 'text-paw-muted'}`} onClick={() => { setDetailsJob(job); setDetailsOpen(true) }}>
                            Last run {job.lastRunStatus === 'never' ? 'not yet run' : job.lastRunStatus} {job.lastRunAt ? `- ${relative(job.lastRunAt)}` : ''}
                          </button>
                        </div>
                        <div className="flex gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                          <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => openEdit(job)}>Edit</button>
                          <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => void runNow(job)}>Run Now</button>
                          <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => void toggleStatus(job)}>{job.enabled ? 'Pause' : 'Resume'}</button>
                          <button type="button" className="btn-ghost px-2 py-1 text-xs text-paw-danger hover:bg-paw-danger-bg hover:text-paw-danger" onClick={() => void removeJob(job)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Cron Job' : 'Create Job'}>
        <div className="space-y-6">
          <section className="space-y-4">
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-paw-faint">What</div>
            <label className="block"><span className="label">Job Name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label className="block"><span className="label">Description</span><textarea className="input min-h-[88px] resize-y" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
            <div className="rounded-xl border border-paw-border bg-paw-bg p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-paw-faint">Assign to agent</div>
              <button type="button" className="input flex items-center justify-between" onClick={() => setAgentDropdownOpen((current) => !current)}>
                <span>{agents.find((agent) => agent.id === agentId)?.name ?? 'Select an agent'}</span>
                <Search size={14} className="text-paw-faint" />
              </button>
              {agentDropdownOpen && (
                <div className="mt-3 rounded-xl border border-paw-border bg-paw-surface p-3">
                  <input className="input mb-3" value={agentSearch} onChange={(event) => setAgentSearch(event.target.value)} placeholder="Search agents" />
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {filteredAgents.map((agent) => (
                      <button key={agent.id} type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-paw-raised" onClick={() => { setAgentId(agent.id); setAgentSearch(agent.name); setAgentDropdownOpen(false) }}>
                        <AgentAvatar name={agent.name} size="sm" />
                        <div><div className="text-sm font-medium text-paw-text">{agent.name}</div><div className="text-xs text-paw-faint">{agent.role}</div></div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <label className="block"><span className="label">Task Prompt</span><textarea className="input min-h-[120px] resize-y" value={prompt} onChange={(event) => setPrompt(event.target.value)} /></label>
          </section>

          <section className="space-y-4">
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-paw-faint">When</div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: '15m', label: 'Every 15 min' },
                { id: 'hourly', label: 'Every hour' },
                { id: 'daily', label: 'Daily' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'custom', label: 'Custom' },
              ].map((option) => (
                <button key={option.id} type="button" onClick={() => setPreset(option.id as Preset)} className={`rounded-full px-4 py-2 text-sm transition-colors ${preset === option.id ? 'bg-paw-accent-bg text-paw-accent' : 'bg-paw-raised text-paw-muted hover:text-paw-text'}`}>
                  {option.label}
                </button>
              ))}
            </div>

            {preset === 'daily' && <label className="block max-w-[220px]"><span className="label">Time</span><input className="input" type="time" value={dailyTime} onChange={(event) => setDailyTime(event.target.value)} /></label>}
            {preset === 'weekly' && <div className="grid gap-4 md:grid-cols-2"><label className="block"><span className="label">Day</span><select className="input" value={weeklyDay} onChange={(event) => setWeeklyDay(event.target.value)}>{weekdays.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}</select></label><label className="block"><span className="label">Time</span><input className="input" type="time" value={weeklyTime} onChange={(event) => setWeeklyTime(event.target.value)} /></label></div>}
            {preset === 'custom' && (
              <div className="space-y-3 rounded-xl border border-paw-border bg-paw-bg p-4">
                <label className="block"><span className="label">Cron Expression</span><input className="input font-mono" value={customCron} onChange={(event) => setCustomCron(event.target.value)} placeholder="0 9 * * 1-5" /></label>
                <div className="text-sm text-paw-text">{formatSchedule(customCron)}</div>
                <div className="text-xs uppercase tracking-[0.16em] text-paw-faint">min | hour | day | month | weekday</div>
              </div>
            )}

            <label className="block max-w-sm"><span className="label">Timezone</span><select className="input" value={timezone} onChange={(event) => setTimezone(event.target.value)}>{timezones.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label>
          </section>

          <section className="space-y-4">
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-paw-faint">Options</div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block"><span className="label">Max retries on failure</span><input className="input" type="number" min="0" max="5" value={maxRetries} onChange={(event) => setMaxRetries(Number(event.target.value))} /></label>
              <label className="block"><span className="label">Timeout minutes</span><input className="input" type="number" min="1" value={timeoutMinutes} onChange={(event) => setTimeoutMinutes(Number(event.target.value))} /></label>
            </div>
            <div className="rounded-xl border border-paw-border bg-paw-bg p-4">
              <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setNotifyOnFailure((current) => !current)}>
                <div><div className="font-medium text-paw-text">Notify on failure</div><div className="mt-1 text-sm text-paw-muted">Send the result to a channel when the job fails.</div></div>
                <span className={`rounded-full px-3 py-1 text-sm ${notifyOnFailure ? 'bg-paw-success-bg text-paw-success' : 'bg-paw-raised text-paw-muted'}`}>{notifyOnFailure ? 'On' : 'Off'}</span>
              </button>
              {notifyOnFailure && (
                <label className="mt-4 block max-w-sm"><span className="label">Channel</span><select className="input" value={failureChannelId} onChange={(event) => setFailureChannelId(event.target.value)}>{channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name}</option>)}</select></label>
              )}
            </div>
          </section>

          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={() => void submit()} disabled={saving}><Plus size={16} />{saving ? 'Saving...' : editing ? 'Save Job' : 'Create Job'}</button>
          </div>
        </div>
      </Modal>

      <Modal open={detailsOpen} onClose={() => setDetailsOpen(false)} title={detailsJob ? `Last Run - ${detailsJob.name}` : 'Last Run'}>
        {detailsJob ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-paw-border bg-paw-bg p-4"><div className="mb-1 text-xs uppercase tracking-[0.16em] text-paw-faint">Status</div><div className={detailsJob.lastRunStatus === 'failure' ? 'text-paw-danger' : 'text-paw-success'}>{detailsJob.lastRunStatus}</div></div>
              <div className="rounded-xl border border-paw-border bg-paw-bg p-4"><div className="mb-1 text-xs uppercase tracking-[0.16em] text-paw-faint">Timestamp</div><div className="text-sm text-paw-text">{detailsJob.lastRunAt ? relative(detailsJob.lastRunAt) : 'Not run yet'}</div></div>
              <div className="rounded-xl border border-paw-border bg-paw-bg p-4"><div className="mb-1 text-xs uppercase tracking-[0.16em] text-paw-faint">Duration</div><div className="text-sm text-paw-text">{detailsJob.lastRunDurationMs ? `${Math.round(detailsJob.lastRunDurationMs / 1000)}s` : 'n/a'}</div></div>
            </div>
            <div className="rounded-xl border border-paw-border bg-paw-bg p-4">
              <div className="mb-2 text-xs uppercase tracking-[0.16em] text-paw-faint">Output</div>
              <pre className="whitespace-pre-wrap text-sm leading-7 text-paw-muted">{detailsJob.lastRunOutput ?? 'No run output recorded yet.'}</pre>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
