import { useEffect, useState } from 'react'
import { MessageSquare, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { type Agent, api } from '../lib/api'
import { AgentAvatar, StatusBadge } from '../components/chat/shared'

function SkeletonRow() {
  return (
    <div className="border-b border-paw-border-subtle px-4 py-3">
      <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-paw-raised" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-paw-raised" />
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
    <div className="flex h-full min-h-0 bg-paw-bg">
      <aside className="flex w-[280px] flex-col border-r border-paw-border bg-paw-surface">
        <div className="flex items-center justify-between border-b border-paw-border px-4 py-4">
          <div className="text-sm font-semibold text-paw-text">Messages</div>
          <button type="button" className="btn-ghost h-8 w-8 justify-center p-0" onClick={() => navigate('/chat')}>
            <Plus size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, index) => (
                <SkeletonRow key={index} />
              ))}
            </div>
          ) : agents.length > 0 ? (
            agents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                onClick={() => navigate(`/chat/${agent.id}`)}
                className="flex w-full items-center gap-3 border-b border-paw-border-subtle px-4 py-3 text-left transition-colors hover:bg-paw-raised"
              >
                <AgentAvatar name={agent.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-medium text-paw-text">{agent.name}</div>
                    <StatusBadge status={agent.status} />
                  </div>
                  <div className="mt-1 truncate text-xs text-paw-muted">
                    {agent.role ?? agent.description ?? 'General purpose agent'}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="flex min-h-[240px] flex-col items-center justify-center px-6 text-center">
              <MessageSquare size={36} className="mb-3 text-paw-faint opacity-20" />
              <div className="text-sm font-medium text-paw-text">No agents yet</div>
              <div className="mt-1 text-xs text-paw-muted">Create an agent to start chatting.</div>
            </div>
          )}
        </div>
      </aside>

      <section className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
        <MessageSquare size={48} className="text-paw-faint/20" />
        <div className="text-sm text-paw-muted">Select an agent to start chatting</div>
        <div className="flex flex-wrap justify-center gap-2">
          {agents.slice(0, 6).map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => navigate(`/chat/${agent.id}`)}
              className="rounded-full border border-paw-border bg-paw-raised px-4 py-2 text-sm text-paw-muted transition-colors hover:border-paw-border-strong hover:text-paw-text"
            >
              {agent.name}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
