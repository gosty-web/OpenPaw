import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  ArrowUp,
  MessageSquare,
  Mic,
  Paperclip,
  Plus,
  Settings2,
} from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { MarkdownMessage } from '../components/chat/MarkdownMessage'
import { AgentAvatar, StatusBadge, getInitials } from '../components/chat/shared'
import { toast } from '../lib/toast'
import { api, type Agent, type AgentMessage, type AgentSession } from '../lib/api'

type ChatMessage = AgentMessage & {
  optimistic?: boolean
}

const suggestedPrompts = ['Who are you?', 'What can you help me with?', 'What tools do you have?']

function formatSessionTime(timestamp?: string) {
  if (!timestamp) {
    return 'Just now'
  }

  return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
}

function truncateId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}...` : id
}

function SessionSkeleton() {
  return (
    <div className="rounded-xl border border-paw-border bg-paw-bg p-4">
      <div className="mb-2 h-4 w-2/3 animate-pulse rounded bg-paw-raised" />
      <div className="mb-2 h-4 w-1/2 animate-pulse rounded bg-paw-raised" />
      <div className="h-4 w-1/3 animate-pulse rounded bg-paw-raised" />
    </div>
  )
}

function MessageBubble({ message, agentName }: { message: ChatMessage; agentName: string }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-3xl items-end gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isUser && <AgentAvatar name={agentName} size="sm" />}

        <div
          className={`max-w-xl rounded-2xl px-4 py-2.5 ${
            isUser
              ? 'rounded-tr-sm bg-paw-accent text-white'
              : 'rounded-tl-sm border border-paw-border bg-paw-surface text-paw-text'
          }`}
        >
          <div className={isUser ? 'whitespace-pre-wrap text-sm leading-relaxed text-white' : 'text-sm leading-relaxed'}>
            {isUser ? message.content : <MarkdownMessage content={message.content} />}
          </div>
          <div className={`mt-1 text-[10px] ${isUser ? 'text-white/70 text-right' : 'text-paw-faint'}`}>
            {message.createdAt ? formatSessionTime(message.createdAt) : 'Just now'}
          </div>
        </div>
      </div>
    </div>
  )
}

function TypingIndicator({ agentName }: { agentName: string }) {
  return (
    <div className="flex justify-start">
      <div className="flex items-end gap-3">
        <AgentAvatar name={agentName} size="sm" />
        <div className="rounded-2xl rounded-tl-sm border border-paw-border bg-paw-surface px-4 py-2.5">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-paw-muted animate-bounce-dots [animation-delay:-0.32s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-paw-muted animate-bounce-dots [animation-delay:-0.16s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-paw-muted animate-bounce-dots" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function ChatDetail() {
  const navigate = useNavigate()
  const { agentId } = useParams()
  const [searchParams] = useSearchParams()
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [sessions, setSessions] = useState<AgentSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loadingAgent, setLoadingAgent] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [selectedModel, setSelectedModel] = useState('')
  const requestedSessionId = searchParams.get('sessionId')
  const canSend = Boolean(draft.trim()) && !sending

  const loadSessions = async (preferredSessionId?: string | null) => {
    if (!agentId) {
      return
    }

    setLoadingSessions(true)

    try {
      const nextSessions = await api.agents.sessions(agentId)
      setSessions(nextSessions)

      if (preferredSessionId && nextSessions.some((session) => session.id === preferredSessionId)) {
        setActiveSessionId(preferredSessionId)
      } else if (!preferredSessionId) {
        setActiveSessionId((current) => {
          if (current && nextSessions.some((session) => session.id === current)) {
            return current
          }

          return nextSessions[0]?.id ?? null
        })
      }
    } catch {
      setSessions([])
      if (!preferredSessionId) {
        setActiveSessionId(null)
      }
    } finally {
      setLoadingSessions(false)
    }
  }

  useEffect(() => {
    if (!agentId) {
      return
    }

    setLoadingAgent(true)
    setMessages([])
    setActiveSessionId(null)

    api.agents
      .get(agentId)
      .then((nextAgent) => {
        setAgent(nextAgent)
        setSelectedModel(nextAgent.model ?? '')
      })
      .catch(() => {
        setAgent(null)
      })
      .finally(() => setLoadingAgent(false))

    void loadSessions(requestedSessionId)
  }, [agentId, requestedSessionId])

  useEffect(() => {
    if (!agentId || !activeSessionId) {
      setMessages([])
      return
    }

    setLoadingMessages(true)

    api.agents
      .messages(agentId, activeSessionId)
      .then((nextMessages) => setMessages(nextMessages))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false))
  }, [activeSessionId, agentId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  useEffect(() => {
    const element = textareaRef.current
    if (!element) {
      return
    }

    element.style.height = '0px'
    const nextHeight = Math.min(element.scrollHeight, 136)
    element.style.height = `${nextHeight}px`
    element.style.overflowY = element.scrollHeight > 136 ? 'auto' : 'hidden'
  }, [draft])

  const modelOptions = useMemo(() => {
    const options = [agent?.model, 'claude-3-7-sonnet', 'gpt-4.1', 'llama-3.3-70b']
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index)

    return options as string[]
  }, [agent?.model])

  const startSession = async () => {
    if (!agentId) {
      return
    }

    try {
      const nextSession = await api.agents.createSession(agentId)
      setSessions((current) => [nextSession, ...current])
      setActiveSessionId(nextSession.id)
      setMessages([])
    } catch {
      toast.error('Could not create a new session')
    }
  }

  const sendMessage = async (messageText?: string) => {
    if (!agentId || sending) {
      return
    }

    const content = (messageText ?? draft).trim()
    if (!content) {
      return
    }

    const optimisticMessage: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      agentId,
      sessionId: activeSessionId ?? 'pending',
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      optimistic: true,
    }

    setMessages((current) => [...current, optimisticMessage])
    setDraft('')
    setSending(true)

    try {
      const response = await api.agents.chat(agentId, {
        message: content,
        sessionId: activeSessionId ?? undefined,
      })

      setActiveSessionId(response.sessionId)

      if (activeSessionId === response.sessionId) {
        setMessages((current) =>
          current.map((message) =>
            message.id === optimisticMessage.id ? { ...message, optimistic: false, sessionId: response.sessionId } : message,
          ).concat(response.message),
        )
      } else {
        const persistedMessages = await api.agents.messages(agentId, response.sessionId)
        setMessages(persistedMessages)
      }

      await loadSessions(response.sessionId)
    } catch {
      setMessages((current) => current.filter((message) => message.id !== optimisticMessage.id))
      toast.error('Message could not be sent')
    } finally {
      setSending(false)
    }
  }

  if (loadingAgent) {
    return (
      <div className="flex h-full min-h-0 bg-paw-bg">
        <aside className="w-[280px] border-r border-paw-border bg-paw-surface p-4">
          <SessionSkeleton />
          <div className="mt-3 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <SessionSkeleton key={index} />
            ))}
          </div>
        </aside>
        <div className="flex flex-1 flex-col p-6">
          <div className="mb-4 h-12 w-1/3 animate-pulse rounded bg-paw-raised" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-paw-raised" />
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="flex h-full items-center justify-center bg-paw-bg p-8">
        <div className="rounded-2xl border border-dashed border-paw-border bg-paw-surface px-10 py-12 text-center">
          <MessageSquare size={42} className="mx-auto mb-4 text-paw-faint opacity-20" />
          <h1 className="mb-2 text-xl font-semibold text-paw-text">Agent not found</h1>
          <p className="mb-6 text-sm text-paw-muted">The requested chat agent could not be loaded.</p>
          <button type="button" onClick={() => navigate('/chat')} className="btn-primary">
            Back to chat
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 bg-paw-bg">
      <aside className="flex w-[280px] min-h-0 flex-col border-r border-paw-border bg-paw-surface">
        <div className="border-b border-paw-border p-4">
          <div className="rounded-2xl border border-paw-border bg-paw-bg p-4">
            <div className="flex items-start gap-3">
              <AgentAvatar name={agent.name} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold text-paw-text">{agent.name}</div>
                <div className="mt-1 text-sm text-paw-muted">{agent.role ?? agent.description ?? 'General purpose agent'}</div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={agent.status} />
                  <span className="badge bg-paw-surface text-paw-muted">{agent.provider ?? 'Local'}</span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-paw-faint">
                  <Settings2 size={12} />
                  <span>{agent.model ?? 'Model not configured'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <div className="text-xs uppercase tracking-wide text-paw-faint">Sessions</div>
          <button type="button" onClick={startSession} className="btn-ghost h-7 w-7 justify-center p-0">
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loadingSessions ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <SessionSkeleton key={index} />
              ))}
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setActiveSessionId(session.id)}
                  className={`mx-2 rounded-lg px-3 py-2 text-left transition-colors ${
                    activeSessionId === session.id
                      ? 'border border-paw-border bg-paw-raised'
                      : 'border border-transparent hover:bg-paw-raised'
                  }`}
                >
                  <div className="truncate text-sm text-paw-text">{truncateId(session.id)}</div>
                  <div className="mt-1 text-xs text-paw-faint">
                    {session.messageCount ?? 0} message{(session.messageCount ?? 0) === 1 ? '' : 's'} ·{' '}
                    {formatSessionTime(session.lastMessageAt ?? session.startedAt)}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-paw-border bg-paw-bg px-6 text-center">
              <MessageSquare size={40} className="mb-4 text-paw-faint opacity-20" />
              <h2 className="mb-2 text-lg font-semibold text-paw-text">No sessions yet</h2>
              <p className="mb-6 text-sm leading-6 text-paw-muted">Start your first conversation to create reusable context for this agent.</p>
              <button type="button" onClick={startSession} className="btn-primary">
                Start a conversation
              </button>
            </div>
          )}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col">
        <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-paw-border bg-paw-bg/95 px-6 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <AgentAvatar name={agent.name} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-paw-text">{agent.name}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-paw-muted">
                <span>{agent.role ?? agent.description ?? 'General purpose agent'}</span>
                <StatusBadge status={agent.status} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to={`/agents/${agent.id}`} className="btn-secondary">
              View agent
            </Link>
            <select
              value={selectedModel}
              onChange={(event) => setSelectedModel(event.target.value)}
              className="rounded-lg border border-paw-border bg-paw-surface px-3 py-2 text-xs text-paw-muted outline-none transition-colors focus:border-paw-accent"
            >
              {modelOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {loadingMessages ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="max-w-xl rounded-2xl border border-paw-border bg-paw-raised px-4 py-4">
                  <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-paw-overlay" />
                  <div className="mb-2 h-4 w-1/2 animate-pulse rounded bg-paw-overlay" />
                  <div className="h-4 w-1/3 animate-pulse rounded bg-paw-overlay" />
                </div>
              ))}
            </div>
          ) : messages.length > 0 ? (
            <div className="space-y-5">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} agentName={agent.name} />
              ))}
              {sending && <TypingIndicator agentName={agent.name} />}
              <div ref={bottomRef} />
            </div>
          ) : (
            <div className="mt-16 flex flex-col items-center justify-center px-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-paw-raised text-sm font-semibold text-paw-accent">
                {getInitials(agent.name)}
              </div>
              <div className="mt-4 text-xl font-semibold text-paw-text">{agent.name}</div>
              <div className="mt-2 text-sm text-paw-muted">Start a conversation</div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    className="rounded-full border border-paw-border bg-paw-raised px-4 py-2 text-sm text-paw-muted transition-colors hover:border-paw-border-strong hover:text-paw-text"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-paw-border bg-paw-bg/95 px-4 pb-4 pt-2 backdrop-blur">
          <div className="rounded-2xl border border-paw-border bg-paw-raised transition-colors focus-within:border-paw-accent/60">
            <div className="flex items-center gap-2 px-4 pb-1 pt-3">
              <button
                type="button"
                onClick={() => toast.info('Attachments are coming soon')}
                className="text-paw-faint transition-colors hover:text-paw-muted"
                title="Attach file"
              >
                <Paperclip size={16} />
              </button>
              <button
                type="button"
                onClick={() => toast.info('Voice input is coming soon')}
                className="text-paw-faint transition-colors hover:text-paw-muted"
                title="Voice input"
              >
                <Mic size={16} />
              </button>
            </div>

            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void sendMessage()
                }
              }}
              placeholder={`Message ${agent.name}...`}
              rows={1}
              className="min-h-[40px] max-h-[120px] w-full resize-none bg-transparent px-4 py-2 text-sm text-paw-text outline-none placeholder:text-paw-faint"
            />

            <div className="flex items-center justify-between px-3 pb-3">
              <div className="text-xs text-paw-faint">{draft.length > 800 ? `${draft.length}/2000` : ''}</div>
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={!canSend}
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                  canSend
                    ? 'bg-paw-accent text-white hover:bg-paw-accent-h'
                    : 'cursor-not-allowed bg-transparent text-paw-faint opacity-40'
                }`}
                title="Send message"
              >
                <ArrowUp size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
