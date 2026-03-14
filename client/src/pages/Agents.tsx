import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bot,
  Eye,
  MessageSquare,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import { api, type Agent, type CreateAgentPayload } from '../lib/api'
import { toast } from '../lib/toast'
import { Modal } from '../components/Modal'
import { getInitials, getStatusMeta, StatusBadge } from '../components/chat/shared'

type StatusFilter = 'all' | 'idle' | 'active' | 'sleeping'
type SortOption = 'name-asc' | 'created-newest' | 'created-oldest'
type Provider = 'Anthropic' | 'OpenAI' | 'Groq' | 'Ollama' | 'OpenRouter'

type AgentFormState = {
  name: string
  role: string
  personality: string
  provider: Provider
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
}

const providerOptions: Provider[] = ['Anthropic', 'OpenAI', 'Groq', 'Ollama', 'OpenRouter']

const presetModels: Record<Exclude<Provider, 'Ollama' | 'OpenRouter'>, string[]> = {
  Anthropic: [
    'claude-opus-4-6',
    'claude-sonnet-4-6',
    'claude-opus-4-5',
    'claude-sonnet-4-5',
    'claude-haiku-4-5',
  ],
  OpenAI: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o1', 'o1-mini', 'o3', 'o3-mini'],
  Groq: ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
}

const ollamaModels = ['llama3.2', 'llama3.1', 'mistral', 'qwen2.5-coder', 'phi3', 'gemma2']

const statusFilters: Array<{ label: string; value: StatusFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Idle', value: 'idle' },
  { label: 'Active', value: 'active' },
  { label: 'Sleeping', value: 'sleeping' },
]

const sortOptions: Array<{ label: string; value: SortOption }> = [
  { label: 'Name A-Z', value: 'name-asc' },
  { label: 'Created (newest)', value: 'created-newest' },
  { label: 'Created (oldest)', value: 'created-oldest' },
]

const initialForm = (): AgentFormState => ({
  name: '',
  role: '',
  personality: '',
  provider: 'Anthropic',
  model: presetModels.Anthropic[1],
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: defaultSystemPrompt('', ''),
})

function defaultSystemPrompt(name: string, role: string) {
  const identity = name.trim() || 'OpenPaw'
  const focus = role.trim() || 'helpful AI teammate'
  return `You are ${identity}, a ${focus} working inside OpenPaw. Be clear, proactive, and collaborative. Prefer concrete next steps, ask concise clarifying questions only when necessary, and maintain a thoughtful, local-first workflow.`
}

function formatAgentCount(count: number) {
  return `${count} agent${count === 1 ? '' : 's'}`
}

function normalizeAgentStatus(status?: string): Exclude<StatusFilter, 'all'> {
  const value = String(status ?? '').toLowerCase()

  if (value.includes('sleep')) {
    return 'sleeping'
  }

  if (value.includes('work') || value.includes('run') || value.includes('busy') || value.includes('think') || value.includes('online') || value.includes('active') || value.includes('ready')) {
    return 'active'
  }

  return 'idle'
}

function vitalityFromAgent(agent: Agent) {
  const seed = Array.from(agent.id).reduce((total, char) => total + char.charCodeAt(0), 0)
  return {
    energy: 48 + (seed % 40),
    curiosity: 54 + ((seed * 3) % 36),
    satisfaction: 50 + ((seed * 5) % 38),
    motivation: 58 + ((seed * 7) % 32),
  }
}

function AgentCardSkeleton() {
  return (
    <div className="rounded-xl border border-paw-border bg-paw-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 animate-pulse rounded-2xl bg-paw-raised" />
          <div>
            <div className="mb-2 h-4 w-28 animate-pulse rounded bg-paw-raised" />
            <div className="h-3 w-20 animate-pulse rounded bg-paw-raised" />
          </div>
        </div>
        <div className="h-5 w-16 animate-pulse rounded-full bg-paw-raised" />
      </div>

      <div className="mb-5">
        <div className="h-4 w-3/4 animate-pulse rounded bg-paw-raised mb-2" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-paw-raised" />
      </div>

      <div className="space-y-2">
        <div className="h-[3px] w-full animate-pulse rounded-full bg-paw-raised" />
        <div className="h-[3px] w-full animate-pulse rounded-full bg-paw-raised" />
        <div className="h-[3px] w-full animate-pulse rounded-full bg-paw-raised" />
        <div className="h-[3px] w-full animate-pulse rounded-full bg-paw-raised" />
      </div>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-paw-border bg-paw-surface/70 px-6 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-paw-raised text-paw-faint">
        <Bot size={34} className="opacity-20" />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-paw-text">No agents yet</h2>
      <p className="mb-6 max-w-md text-sm text-paw-muted">Create your first agent to get started with conversations, tools, and custom local-first workflows.</p>
      <button type="button" className="btn-primary" onClick={onCreate}>
        <Plus size={16} />
        New Agent
      </button>
    </div>
  )
}

function CreateAgentModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (agent: Agent) => void
}) {
  const [form, setForm] = useState<AgentFormState>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [promptTouched, setPromptTouched] = useState(false)

  useEffect(() => {
    if (!open) {
      setForm(initialForm())
      setSubmitting(false)
      setPromptTouched(false)
    }
  }, [open])

  useEffect(() => {
    if (promptTouched) {
      return
    }

    setForm((current) => ({
      ...current,
      systemPrompt: defaultSystemPrompt(current.name, current.role),
    }))
  }, [form.name, form.role, promptTouched])

  const modelChoices = form.provider === 'Ollama' ? ollamaModels : form.provider === 'OpenRouter' ? [] : presetModels[form.provider]

  const canSubmit = form.name.trim() && form.role.trim() && form.provider && form.model.trim()

  const updateField = <K extends keyof AgentFormState>(key: K, value: AgentFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleProviderChange = (provider: Provider) => {
    setForm((current) => ({
      ...current,
      provider,
      model:
        provider === 'OpenRouter'
          ? ''
          : provider === 'Ollama'
            ? ollamaModels[0]
            : presetModels[provider][0],
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canSubmit || submitting) {
      return
    }

    setSubmitting(true)

    const payload: CreateAgentPayload = {
      name: form.name.trim(),
      role: form.role.trim(),
      personality: form.personality.trim(),
      provider: form.provider,
      model: form.model.trim(),
      temperature: form.temperature,
      maxTokens: Number(form.maxTokens) || 4096,
      systemPrompt: form.systemPrompt.trim(),
    }

    try {
      const createdAgent = await api.agents.create(payload)
      toast.success('Agent created!')
      onCreated(createdAgent)
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create agent')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Agent">
      <form className="space-y-8" onSubmit={handleSubmit}>
        <section>
          <div className="mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-paw-faint">Identity</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="label">Name</span>
              <input
                className="input"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="e.g. Nova Strategy"
                required
              />
            </label>

            <label className="block">
              <span className="label">Role</span>
              <input
                className="input"
                value={form.role}
                onChange={(event) => updateField('role', event.target.value)}
                placeholder="e.g. Frontend Developer, Research Assistant"
                required
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="label">Personality</span>
            <textarea
              className="input min-h-[74px] resize-none"
              rows={2}
              value={form.personality}
              onChange={(event) => updateField('personality', event.target.value)}
              placeholder="e.g. direct, curious, creative, uses humor naturally"
            />
          </label>
        </section>

        <section>
          <div className="mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-paw-faint">Model Configuration</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {providerOptions.map((provider) => {
              const selected = form.provider === provider
              return (
                <button
                  key={provider}
                  type="button"
                  onClick={() => handleProviderChange(provider)}
                  className={`rounded-xl border px-4 py-3 text-left transition-all ${
                    selected
                      ? 'border-paw-accent bg-paw-accent-bg shadow-glow'
                      : 'border-paw-border bg-paw-raised/55 text-paw-muted hover:border-paw-border-strong hover:text-paw-text'
                  }`}
                >
                  <div className="mb-1 text-sm font-semibold">{provider}</div>
                  <div className="text-xs text-paw-faint">{provider === 'OpenRouter' ? 'Paste any model slug' : provider === 'Ollama' ? 'Editable local model' : 'Preset model list'}</div>
                </button>
              )
            })}
          </div>

          <div className="mt-4">
            <span className="label">Model</span>
            {form.provider === 'OpenRouter' ? (
              <input
                className="input"
                value={form.model}
                onChange={(event) => updateField('model', event.target.value)}
                placeholder="e.g. anthropic/claude-sonnet-4"
              />
            ) : form.provider === 'Ollama' ? (
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
                <input
                  className="input"
                  value={form.model}
                  onChange={(event) => updateField('model', event.target.value)}
                  placeholder="Enter any local model name"
                />
                <select className="input" value={form.model} onChange={(event) => updateField('model', event.target.value)}>
                  {modelChoices.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <select className="input" value={form.model} onChange={(event) => updateField('model', event.target.value)}>
                {modelChoices.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            )}
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-paw-faint">Advanced</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="rounded-xl border border-paw-border bg-paw-raised/45 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="label mb-0">Temperature</span>
                <span className="text-sm font-medium text-paw-text">{form.temperature.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={form.temperature}
                onChange={(event) => updateField('temperature', Number(event.target.value))}
                className="w-full accent-paw-accent"
              />
            </div>

            <label className="block rounded-xl border border-paw-border bg-paw-raised/45 p-4">
              <span className="label">Max Tokens</span>
              <input
                className="input"
                type="number"
                min="256"
                step="256"
                value={form.maxTokens}
                onChange={(event) => updateField('maxTokens', Number(event.target.value))}
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="label">System Prompt</span>
            <textarea
              className="input min-h-[140px] resize-y"
              value={form.systemPrompt}
              onChange={(event) => {
                setPromptTouched(true)
                updateField('systemPrompt', event.target.value)
              }}
            />
          </label>
        </section>

        <div className="flex flex-col-reverse justify-end gap-3 border-t border-paw-border pt-5 sm:flex-row">
          <button type="button" className="btn-secondary justify-center" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary justify-center" disabled={!canSubmit || submitting}>
            <Plus size={16} />
            {submitting ? 'Creating…' : 'Create Agent'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function Agents() {
  const navigate = useNavigate()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('created-newest')
  const [modalOpen, setModalOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const deferredQuery = useDeferredValue(searchQuery)

  useEffect(() => {
    api.agents
      .list()
      .then(setAgents)
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Unable to load agents')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!pendingDeleteId) {
      return
    }

    const timeout = window.setTimeout(() => setPendingDeleteId(null), 4200)
    return () => window.clearTimeout(timeout)
  }, [pendingDeleteId])

  const filteredAgents = useMemo(() => {
    const query = deferredQuery.trim().toLowerCase()

    return [...agents]
      .filter((agent) => {
        if (statusFilter !== 'all' && normalizeAgentStatus(agent.status) !== statusFilter) {
          return false
        }

        if (!query) {
          return true
        }

        const haystack = `${agent.name} ${agent.role ?? ''}`.toLowerCase()
        return haystack.includes(query)
      })
      .sort((left, right) => {
        if (sortBy === 'name-asc') {
          return left.name.localeCompare(right.name)
        }

        const leftTime = new Date(left.createdAt ?? 0).getTime()
        const rightTime = new Date(right.createdAt ?? 0).getTime()

        return sortBy === 'created-oldest' ? leftTime - rightTime : rightTime - leftTime
      })
  }, [agents, deferredQuery, sortBy, statusFilter])

  const handleCreated = (agent: Agent) => {
    setAgents((current) => [agent, ...current])
  }

  const handleDelete = async (agent: Agent) => {
    if (pendingDeleteId !== agent.id) {
      setPendingDeleteId(agent.id)
      toast.warning(`Click delete again to remove ${agent.name}`)
      return
    }

    try {
      await api.agents.delete(agent.id)
      setAgents((current) => current.filter((entry) => entry.id !== agent.id))
      setPendingDeleteId(null)
      toast.success(`${agent.name} deleted`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete agent')
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h1 className="text-[clamp(1.75rem,1.4rem+1vw,2.2rem)] font-semibold tracking-tight text-paw-text">Agents</h1>
              <span className="badge bg-paw-raised text-paw-muted">{formatAgentCount(agents.length)}</span>
            </div>
            <p className="max-w-2xl text-sm text-paw-muted">Manage your AI team, tune provider settings, and jump straight into the right conversation or configuration view.</p>
          </div>

          <button type="button" className="btn-primary self-start lg:self-auto" onClick={() => setModalOpen(true)}>
            <Plus size={16} />
            New Agent
          </button>
        </header>

        <section className="rounded-2xl border border-paw-border bg-paw-surface/80 p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_220px]">
            <label className="relative block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paw-faint" />
              <input
                className="input pl-10"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by agent name or role"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              {statusFilters.map((option) => {
                const selected = statusFilter === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatusFilter(option.value)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      selected
                        ? 'bg-paw-accent-bg text-paw-accent'
                        : 'bg-paw-raised/60 text-paw-muted hover:bg-paw-raised hover:text-paw-text'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>

            <label className="flex items-center gap-2 rounded-lg border border-paw-border bg-paw-raised/45 px-3">
              <SlidersHorizontal size={15} className="text-paw-faint" />
              <select className="h-11 w-full bg-transparent text-sm text-paw-text outline-none" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}>
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-paw-surface">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <AgentCardSkeleton key={index} />
            ))}
          </div>
        ) : filteredAgents.length === 0 ? (
          <EmptyState onCreate={() => setModalOpen(true)} />
        ) : (
          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {filteredAgents.map((agent) => {
              const statusMeta = getStatusMeta(agent.status)
              const vitality = vitalityFromAgent(agent)
              const deleteArmed = pendingDeleteId === agent.id

              return (
                <article
                  key={agent.id}
                  className="group relative overflow-hidden rounded-xl border border-paw-border bg-paw-surface p-5 transition-all hover:border-paw-border-strong hover:shadow-glow"
                >
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-paw-accent-bg/50 to-transparent opacity-70" />

                  <div className="relative">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paw-accent-bg text-sm font-semibold text-paw-accent">
                          {getInitials(agent.name)}
                        </div>

                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => navigate(`/agents/${agent.id}`)}
                            className="truncate text-left text-base font-semibold text-paw-text transition-colors hover:text-paw-accent"
                          >
                            {agent.name}
                          </button>
                          <p className="mt-1 text-sm text-paw-muted">{agent.role || 'Generalist agent'}</p>
                        </div>
                      </div>

                      <div className="shrink-0 rounded-full bg-paw-raised/70 px-2.5 py-1">
                        <StatusBadge status={agent.status} />
                      </div>
                    </div>

                    <div className="mb-5 rounded-xl border border-paw-border bg-paw-raised/40 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="badge bg-paw-info-bg text-paw-info">{agent.provider || 'Provider'}</span>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusMeta.color}`}>
                          <span className={`h-2 w-2 rounded-full ${statusMeta.dot} ${statusMeta.pulse ? 'animate-pulse-soft' : ''}`} />
                          {statusMeta.label}
                        </span>
                      </div>
                      <p className="truncate font-mono text-xs text-paw-muted">{agent.model || 'No model selected'}</p>
                    </div>

                    <div className="mb-5 space-y-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-paw-faint">
                          <span>Energy</span>
                          <span>{vitality.energy}%</span>
                        </div>
                        <div className="h-[3px] rounded-full bg-paw-overlay">
                          <div className="h-[3px] rounded-full bg-paw-warning" style={{ width: `${vitality.energy}%` }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-paw-faint">
                          <span>Curiosity</span>
                          <span>{vitality.curiosity}%</span>
                        </div>
                        <div className="h-[3px] rounded-full bg-paw-overlay">
                          <div className="h-[3px] rounded-full bg-paw-info" style={{ width: `${vitality.curiosity}%` }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-paw-faint">
                          <span>Satisfaction</span>
                          <span>{vitality.satisfaction}%</span>
                        </div>
                        <div className="h-[3px] rounded-full bg-paw-overlay">
                          <div className="h-[3px] rounded-full bg-paw-success" style={{ width: `${vitality.satisfaction}%` }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-paw-faint">
                          <span>Motivation</span>
                          <span>{vitality.motivation}%</span>
                        </div>
                        <div className="h-[3px] rounded-full bg-paw-overlay">
                          <div className="h-[3px] rounded-full bg-paw-accent" style={{ width: `${vitality.motivation}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                      <Link to={`/chat/${agent.id}`} className="btn-ghost px-3 py-2 text-xs text-paw-text">
                        <MessageSquare size={14} />
                        Chat
                      </Link>
                      <Link to={`/agents/${agent.id}/config`} className="btn-ghost px-3 py-2 text-xs text-paw-text">
                        <Settings size={14} />
                        Config
                      </Link>
                      <Link to={`/agents/${agent.id}`} className="btn-ghost px-3 py-2 text-xs text-paw-text">
                        <Eye size={14} />
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleDelete(agent)}
                        className={`btn-ghost px-3 py-2 text-xs ${deleteArmed ? 'text-paw-danger hover:bg-paw-danger-bg hover:text-paw-danger' : 'text-paw-text'}`}
                      >
                        <Trash2 size={14} />
                        {deleteArmed ? 'Confirm' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>

      <CreateAgentModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={handleCreated} />
    </div>
  )
}
