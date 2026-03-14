import { useEffect, useState } from 'react'
import { ArrowRight, Bot, MessageSquare, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { type Agent, api } from '../lib/api'
import { AgentAvatar, StatusBadge } from '../components/chat/shared'

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-paw-border bg-paw-surface p-4">
      <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-paw-raised" />
      <div className="mb-2 h-4 w-1/2 animate-pulse rounded bg-paw-raised" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-paw-raised" />
    </div>
  )
}

export function Chat() {
  const navigate = useNavigate()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.agents
      .list()
      .then(setAgents)
      .catch(() => setAgents([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="grid h-full min-h-0 grid-cols-1 bg-paw-bg xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col border-r border-paw-border bg-paw-surface">
        <div className="border-b border-paw-border px-5 py-5">
          <div className="mb-1 text-lg font-semibold text-paw-text">Choose an agent</div>
          <p className="text-sm leading-6 text-paw-muted">
            Pick an agent to open a focused workspace with session history and live chat.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : agents.length > 0 ? (
            <div className="space-y-3">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => navigate(`/chat/${agent.id}`)}
                  className="group w-full rounded-xl border border-paw-border bg-paw-bg p-4 text-left transition-all duration-200 hover:border-paw-border-strong hover:bg-paw-raised hover:shadow-glow"
                >
                  <div className="flex items-start gap-3">
                    <AgentAvatar name={agent.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="truncate text-sm font-semibold text-paw-text">{agent.name}</div>
                        <ArrowRight size={16} className="shrink-0 text-paw-faint transition-transform duration-200 group-hover:translate-x-0.5" />
                      </div>
                      <div className="mt-1 text-xs text-paw-muted">{agent.role ?? agent.description ?? 'General purpose agent'}</div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <StatusBadge status={agent.status} />
                        <span className="badge bg-paw-surface text-paw-muted">{agent.provider ?? 'Local'}</span>
                        <span className="truncate text-xs text-paw-faint">{agent.model ?? 'Model not configured'}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-paw-border bg-paw-bg px-6 text-center">
              <Bot size={42} className="mb-4 text-paw-faint opacity-20" />
              <h2 className="mb-2 text-lg font-semibold text-paw-text">No agents available</h2>
              <p className="mb-6 text-sm leading-6 text-paw-muted">
                Create an agent first, then return here to start chatting.
              </p>
              <button type="button" onClick={() => navigate('/agents')} className="btn-primary">
                Create an agent
              </button>
            </div>
          )}
        </div>
      </aside>

      <section className="relative hidden min-h-0 overflow-hidden xl:flex xl:flex-col xl:items-center xl:justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(124,58,237,0.18),transparent_32%),radial-gradient(circle_at_80%_30%,rgba(59,130,246,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />

        <div className="relative flex max-w-2xl flex-col items-center px-10 text-center">
          <div className="relative mb-10 flex h-52 w-52 items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-paw-border bg-paw-surface/60 shadow-xl" />
            <div className="absolute left-4 top-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-paw-border bg-paw-raised text-paw-accent shadow-lg">
              <Bot size={26} />
            </div>
            <div className="absolute right-4 top-12 flex h-14 w-14 items-center justify-center rounded-full border border-paw-border bg-paw-raised text-paw-info shadow-lg">
              <MessageSquare size={22} />
            </div>
            <div className="absolute bottom-6 right-10 flex h-12 w-12 items-center justify-center rounded-xl border border-paw-border bg-paw-raised text-paw-warning shadow-lg">
              <Sparkles size={20} />
            </div>
            <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-paw-accent-bg text-paw-accent shadow-glow">
              <MessageSquare size={34} />
            </div>
          </div>

          <h1 className="mb-3 text-3xl font-semibold tracking-tight text-paw-text">Select an agent to start chatting</h1>
          <p className="max-w-xl text-base leading-8 text-paw-muted">
            Open a dedicated chat workspace with session history, markdown-rich answers, and a faster path from idea to execution.
          </p>
        </div>
      </section>
    </div>
  )
}
