import { useEffect, useMemo, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import { Bot, Brain, ChevronRight, FileText, Link2, MessageSquare, Plus, Save, Sparkles, Wrench, Zap } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Modal } from '../components/Modal'
import { AgentAvatar, StatusBadge } from '../components/chat/shared'
import { api, type Agent, type AgentFile, type AgentMCP, type AgentMemory, type AgentMessage, type AgentSession, type AgentSkill, type AgentWorkspace } from '../lib/api'
import { agentFileNames, extractSoulSummary, vitalityFromAgent } from '../lib/agentMeta'
import { toast } from '../lib/toast'

type DetailTab = 'overview' | 'files' | 'memory' | 'skills' | 'mcps' | 'sessions'
type MemoryFilter = 'all' | 'hot' | 'episodic' | 'semantic'

const tabs: Array<{ id: DetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'files', label: 'Files' },
  { id: 'memory', label: 'Memory' },
  { id: 'skills', label: 'Skills' },
  { id: 'mcps', label: 'MCPs' },
  { id: 'sessions', label: 'Sessions' },
]

const editorTheme = EditorView.theme({
  '&': { backgroundColor: 'transparent', color: '#fafafa', fontFamily: '"JetBrains Mono", monospace' },
  '.cm-content': { caretColor: '#8b5cf6' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#8b5cf6' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: 'rgba(124,58,237,0.24)' },
  '.cm-lineNumbers .cm-gutterElement': { color: '#71717a' },
})

const relative = (value?: string) => (!value ? 'Just now' : formatDistanceToNow(new Date(value), { addSuffix: true }))
const truncate = (value: string, limit: number) => (value.length <= limit ? value : `${value.slice(0, limit).trimEnd()}...`)
const mcpTone = (status: AgentMCP['status']) => (status === 'connected' ? 'text-paw-success' : status === 'error' ? 'text-paw-danger' : 'text-paw-muted')
const mcpDot = (status: AgentMCP['status']) => (status === 'connected' ? 'bg-paw-success' : status === 'error' ? 'bg-paw-danger' : 'bg-paw-faint')

export function AgentDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState('AGENTS.md')
  const [fileList, setFileList] = useState<AgentFile[]>([])
  const [fileMap, setFileMap] = useState<Record<string, AgentFile>>({})
  const [savedContent, setSavedContent] = useState<Record<string, string>>({})
  const [filesLoading, setFilesLoading] = useState(false)
  const [savingFile, setSavingFile] = useState(false)
  const [memories, setMemories] = useState<AgentMemory[]>([])
  const [memoryFilter, setMemoryFilter] = useState<MemoryFilter>('all')
  const [memorySearch, setMemorySearch] = useState('')
  const [memoryModalOpen, setMemoryModalOpen] = useState(false)
  const [memoryForm, setMemoryForm] = useState({ content: '', tier: 'episodic' as 'hot' | 'episodic' | 'semantic', importance: 70, tags: '' })
  const [skills, setSkills] = useState<AgentSkill[]>([])
  const [skillModalOpen, setSkillModalOpen] = useState(false)
  const [mcps, setMcps] = useState<AgentMCP[]>([])
  const [mcpModalOpen, setMcpModalOpen] = useState(false)
  const [mcpForm, setMcpForm] = useState({ name: '', transport: 'stdio', endpoint: '' })
  const [workspaces, setWorkspaces] = useState<AgentWorkspace[]>([])
  const [sessions, setSessions] = useState<AgentSession[]>([])
  const [messages, setMessages] = useState<AgentMessage[]>([])

  useEffect(() => {
    if (!id) return
    let alive = true
    setLoading(true)
    Promise.all([
      api.agents.get(id),
      api.agents.files(id),
      api.agents.file(id, 'SOUL.md'),
      api.agents.memory(id),
      api.agents.skills(id),
      api.agents.mcps(id),
      api.agents.workspaces(id),
      api.agents.sessions(id),
      api.agents.messages(id),
    ]).then(([a, fl, soul, mem, sk, mp, ws, ss, ms]) => {
      if (!alive) return
      setAgent(a)
      setFileList(fl)
      setFileMap({ 'SOUL.md': soul })
      setSavedContent({ 'SOUL.md': soul.content ?? '' })
      setMemories(mem)
      setSkills(sk)
      setMcps(mp)
      setWorkspaces(ws)
      setSessions(ss)
      setMessages(ms)
    }).catch((error) => {
      if (alive) {
        toast.error(error instanceof Error ? error.message : 'Unable to load agent')
        setAgent(null)
      }
    }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id])

  const loadFile = async (filename: string) => {
    if (!id) return
    setSelectedFile(filename)
    if (fileMap[filename]?.content !== undefined) return
    setFilesLoading(true)
    try {
      const file = await api.agents.file(id, filename)
      setFileMap((current) => ({ ...current, [filename]: file }))
      setSavedContent((current) => ({ ...current, [filename]: file.content ?? '' }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load file')
    } finally {
      setFilesLoading(false)
    }
  }

  useEffect(() => { if (activeTab === 'files') void loadFile(selectedFile) }, [activeTab])

  const currentFile = fileMap[selectedFile]
  const currentText = currentFile?.content ?? ''
  const isDirty = currentText !== (savedContent[selectedFile] ?? '')
  const soulSummary = extractSoulSummary(fileMap['SOUL.md']?.content)
  const vitality = useMemo(() => (agent ? vitalityFromAgent(agent) : null), [agent])
  const memoryItems = useMemo(() => memories.filter((memory) => {
    if (memoryFilter !== 'all' && memory.tier !== memoryFilter) return false
    if (!memorySearch.trim()) return true
    return `${memory.content} ${(memory.tags ?? []).join(' ')}`.toLowerCase().includes(memorySearch.trim().toLowerCase())
  }), [memories, memoryFilter, memorySearch])
  const sessionPreview = useMemo(() => sessions.reduce<Record<string, { preview: string; lastActive?: string }>>((acc, session) => {
    const sessionMessages = messages.filter((message) => message.sessionId === session.id)
    const lastMessage = sessionMessages[sessionMessages.length - 1]
    acc[session.id] = { preview: sessionMessages[0]?.content ?? 'No messages yet', lastActive: lastMessage?.createdAt ?? session.lastMessageAt ?? session.startedAt }
    return acc
  }, {}), [messages, sessions])

  const saveFile = async () => {
    if (!id || !currentFile) return
    setSavingFile(true)
    try {
      const saved = await api.agents.saveFile(id, selectedFile, currentText)
      setFileMap((current) => ({ ...current, [selectedFile]: saved }))
      setSavedContent((current) => ({ ...current, [selectedFile]: saved.content ?? '' }))
      setFileList((current) => current.map((file) => file.name === selectedFile ? { ...file, size: saved.size, updatedAt: saved.updatedAt } : file))
      toast.success(`${selectedFile} saved`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save file')
    } finally {
      setSavingFile(false)
    }
  }

  if (loading) return <div className="min-h-0 flex-1 overflow-y-auto p-8"><div className="rounded-2xl border border-paw-border bg-paw-surface p-6"><div className="mb-3 h-7 w-48 animate-pulse rounded bg-paw-raised" /><div className="h-4 w-80 animate-pulse rounded bg-paw-raised" /></div></div>
  if (!agent) return <div className="flex h-full items-center justify-center p-8"><div className="rounded-2xl border border-dashed border-paw-border bg-paw-surface px-10 py-12 text-center"><Bot size={42} className="mx-auto mb-4 text-paw-faint opacity-20" /><h1 className="mb-2 text-xl font-semibold text-paw-text">Agent not found</h1><button type="button" className="btn-primary" onClick={() => navigate('/agents')}>Back to agents</button></div></div>

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-2xl border border-paw-border bg-paw-surface p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <AgentAvatar name={agent.name} size="lg" />
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <h1 className="text-[clamp(1.6rem,1.3rem+1vw,2.2rem)] font-semibold tracking-tight text-paw-text">{agent.name}</h1>
                  <StatusBadge status={agent.status} />
                </div>
                <p className="text-sm text-paw-muted">{agent.role}</p>
                <p className="mt-2 text-xs text-paw-faint">Created {agent.createdAt ? format(new Date(agent.createdAt), 'MMM d, yyyy') : 'recently'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-paw-accent-bg text-paw-accent' : 'bg-paw-raised/60 text-paw-muted hover:bg-paw-raised hover:text-paw-text'}`}>{tab.label}</button>
              ))}
            </div>
          </div>
        </header>

        {activeTab === 'overview' && vitality && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_320px]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-paw-border bg-paw-surface p-6">
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-4">
                    <AgentAvatar name={agent.name} size="lg" />
                    <div>
                      <h2 className="text-2xl font-semibold text-paw-text">{agent.name}</h2>
                      <p className="mt-1 text-sm text-paw-muted">{agent.role}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-paw-border bg-paw-raised/45 px-4 py-3 text-sm text-paw-muted">Updated {relative(agent.updatedAt)}</div>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-paw-border bg-paw-raised/40 p-5">
                    <div className="mb-5 flex items-center gap-2"><Sparkles size={16} className="text-paw-accent" /><h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-paw-faint">Vitality</h3></div>
                    <div className="space-y-4">
                      {[{ label: 'Energy', value: vitality.energy, color: 'bg-paw-warning' }, { label: 'Curiosity', value: vitality.curiosity, color: 'bg-paw-info' }, { label: 'Satisfaction', value: vitality.satisfaction, color: 'bg-paw-success' }, { label: 'Motivation', value: vitality.motivation, color: 'bg-paw-accent' }].map((item) => (
                        <div key={item.label}>
                          <div className="mb-1 flex items-center justify-between text-xs text-paw-muted"><span>{item.label}</span><span>{item.value}%</span></div>
                          <div className="h-2 rounded-full bg-paw-overlay"><div className={`h-2 rounded-full ${item.color}`} style={{ width: `${item.value}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-paw-border bg-paw-raised/40 p-5">
                    <div className="mb-5 flex items-center gap-2"><Wrench size={16} className="text-paw-info" /><h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-paw-faint">Model Profile</h3></div>
                    <div className="space-y-4 text-sm text-paw-muted">
                      <div><div className="mb-1 text-xs uppercase tracking-[0.14em] text-paw-faint">Provider</div><span className="badge bg-paw-info-bg text-paw-info">{agent.provider}</span></div>
                      <div><div className="mb-1 text-xs uppercase tracking-[0.14em] text-paw-faint">Model</div><div className="font-mono text-xs text-paw-text">{agent.model}</div></div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-paw-border bg-paw-surface px-4 py-3"><div className="text-xs uppercase tracking-[0.14em] text-paw-faint">Temperature</div><div className="mt-1 text-lg font-semibold text-paw-text">{agent.temperature?.toFixed(1) ?? '0.7'}</div></div>
                        <div className="rounded-xl border border-paw-border bg-paw-surface px-4 py-3"><div className="text-xs uppercase tracking-[0.14em] text-paw-faint">Max Tokens</div><div className="mt-1 text-lg font-semibold text-paw-text">{agent.maxTokens ?? 4096}</div></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 rounded-2xl border border-paw-border bg-paw-raised/35 p-5">
                  <div className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-paw-faint">Soul Summary</div>
                  <p className="max-w-3xl leading-7 text-paw-muted">{soulSummary}</p>
                </div>
              </section>
            </div>
            <aside className="space-y-6">
              <section className="rounded-2xl border border-paw-border bg-paw-surface p-5">
                <div className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-paw-faint">Quick Actions</div>
                <div className="space-y-2">
                  <Link to={`/chat/${agent.id}`} className="btn-secondary w-full justify-between"><span className="inline-flex items-center gap-2"><MessageSquare size={15} />Chat</span><ChevronRight size={14} /></Link>
                  <Link to={`/agents/${agent.id}/config`} className="btn-secondary w-full justify-between"><span className="inline-flex items-center gap-2"><FileText size={15} />Edit Config</span><ChevronRight size={14} /></Link>
                  <button type="button" onClick={() => toast.info('Sub-agent spawning is coming soon')} className="btn-secondary w-full justify-between"><span className="inline-flex items-center gap-2"><Sparkles size={15} />Spawn Sub-Agent</span><ChevronRight size={14} /></button>
                </div>
              </section>
              <section className="rounded-2xl border border-paw-border bg-paw-surface p-5">
                <div className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-paw-faint">Workspace Memberships</div>
                <div className="space-y-3">{workspaces.map((workspace) => <div key={workspace.id} className="rounded-xl border border-paw-border bg-paw-raised/40 px-4 py-3"><div className="font-medium text-paw-text">{workspace.name}</div><div className="mt-1 text-xs text-paw-faint">{workspace.role ?? 'Member'}</div></div>)}</div>
              </section>
              <section className="rounded-2xl border border-paw-border bg-paw-surface p-5">
                <div className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-paw-faint">Recent Sessions</div>
                <div className="space-y-3">{sessions.slice(0, 5).map((session) => <button key={session.id} type="button" onClick={() => navigate(`/chat/${agent.id}?sessionId=${encodeURIComponent(session.id)}`)} className="w-full rounded-xl border border-paw-border bg-paw-raised/35 px-4 py-3 text-left transition-colors hover:border-paw-border-strong hover:bg-paw-raised"><div className="truncate text-sm font-medium text-paw-text">{session.title || session.id}</div><div className="mt-1 text-xs text-paw-muted">{session.messageCount ?? 0} messages</div><div className="mt-1 text-xs text-paw-faint">{relative(session.lastMessageAt ?? session.startedAt)}</div></button>)}</div>
              </section>
            </aside>
          </div>
        )}

        {activeTab === 'files' && (
          <section className="grid gap-6 lg:grid-cols-[170px_minmax(0,1fr)]">
            <aside className="rounded-2xl border border-paw-border bg-paw-surface p-3">
              <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.16em] text-paw-faint">Files</div>
              <div className="space-y-1">
                {agentFileNames.map((filename) => {
                  const dirty = (fileMap[filename]?.content ?? savedContent[filename] ?? '') !== (savedContent[filename] ?? '')
                  return <button key={filename} type="button" onClick={() => void loadFile(filename)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${selectedFile === filename ? 'bg-paw-accent-bg text-paw-accent' : 'text-paw-muted hover:bg-paw-raised hover:text-paw-text'}`}><span className={`h-2 w-2 rounded-full ${dirty ? 'bg-paw-warning' : 'border border-paw-border bg-transparent'}`} /><span className="truncate">{filename}</span></button>
                })}
              </div>
            </aside>
            <div className="min-w-0 rounded-2xl border border-paw-border bg-paw-surface">
              <div className="flex flex-col gap-3 border-b border-paw-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2"><FileText size={16} className="text-paw-faint" /><span className="font-medium text-paw-text">{selectedFile}</span>{isDirty && <span className="h-2 w-2 rounded-full bg-paw-warning" />}<span className="text-xs text-paw-faint">{currentFile?.updatedAt ? `Updated ${relative(currentFile.updatedAt)}` : 'Not loaded yet'}</span></div>
                <button type="button" onClick={() => void saveFile()} className="btn-primary" disabled={!isDirty || savingFile || filesLoading}><Save size={15} />{savingFile ? 'Saving…' : 'Save'}</button>
              </div>
              <div className="min-h-[560px]">
                {filesLoading && !currentFile ? <div className="p-5"><div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-paw-raised" /><div className="mb-2 h-4 w-full animate-pulse rounded bg-paw-raised" /><div className="mb-2 h-4 w-5/6 animate-pulse rounded bg-paw-raised" /></div> : <CodeMirror value={currentText} height="560px" extensions={[markdown()]} theme={editorTheme} onChange={(value) => setFileMap((current) => ({ ...current, [selectedFile]: { ...(current[selectedFile] ?? { name: selectedFile }), content: value, updatedAt: current[selectedFile]?.updatedAt } }))} basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false }} />}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'memory' && (
          <section className="rounded-2xl border border-paw-border bg-paw-surface p-5">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div><h2 className="text-xl font-semibold text-paw-text">Memory</h2><p className="mt-1 text-sm text-paw-muted">Browse and add hot, episodic, and semantic memory entries for this agent.</p></div>
              <button type="button" onClick={() => setMemoryModalOpen(true)} className="btn-primary"><Plus size={16} />Add Memory</button>
            </div>
            <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <input className="input" value={memorySearch} onChange={(event) => setMemorySearch(event.target.value)} placeholder="Search memory content or tags" />
              <div className="flex flex-wrap gap-2">{(['all', 'hot', 'episodic', 'semantic'] as MemoryFilter[]).map((filter) => <button key={filter} type="button" onClick={() => setMemoryFilter(filter)} className={`rounded-lg px-3 py-2 text-sm transition-colors ${memoryFilter === filter ? 'bg-paw-accent-bg text-paw-accent' : 'bg-paw-raised/60 text-paw-muted hover:bg-paw-raised hover:text-paw-text'}`}>{filter[0].toUpperCase() + filter.slice(1)}</button>)}</div>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {memoryItems.map((memory) => <article key={memory.id} className="rounded-2xl border border-paw-border bg-paw-raised/35 p-4"><div className="mb-3 flex items-center justify-between gap-3"><span className={`badge ${memory.tier === 'hot' ? 'bg-paw-warning-bg text-paw-warning' : memory.tier === 'semantic' ? 'bg-paw-success-bg text-paw-success' : 'bg-paw-info-bg text-paw-info'}`}>{(memory.tier ?? 'episodic').toUpperCase()}</span><span className="text-xs text-paw-faint">{relative(memory.createdAt)}</span></div><p className="text-sm leading-7 text-paw-muted">{truncate(memory.content, 100)}</p><div className="mt-4"><div className="mb-1 flex items-center justify-between text-xs text-paw-faint"><span>Importance</span><span>{memory.importance ?? 0}%</span></div><div className="h-2 rounded-full bg-paw-overlay"><div className="h-2 rounded-full bg-paw-accent" style={{ width: `${memory.importance ?? 0}%` }} /></div></div>{(memory.tags ?? []).length > 0 && <div className="mt-4 flex flex-wrap gap-2">{memory.tags?.map((tag) => <span key={tag} className="badge bg-paw-surface text-paw-muted">{tag}</span>)}</div>}</article>)}
            </div>
          </section>
        )}

        {activeTab === 'skills' && (
          <section className="rounded-2xl border border-paw-border bg-paw-surface p-5">
            <div className="mb-5 flex items-center justify-between gap-4"><div><h2 className="text-xl font-semibold text-paw-text">Skills</h2><p className="mt-1 text-sm text-paw-muted">Toggle the skill set this agent can reach for during execution.</p></div><button type="button" onClick={() => setSkillModalOpen(true)} className="btn-primary"><Plus size={16} />Add Skill</button></div>
            <div className="space-y-3">{skills.map((skill) => <div key={skill.id} className="flex flex-col gap-4 rounded-2xl border border-paw-border bg-paw-raised/35 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-medium text-paw-text">{skill.name}</div><div className="mt-1 text-sm text-paw-muted">{skill.description}</div></div><button type="button" onClick={() => void api.agents.toggleSkill(agent.id, skill.id, !skill.enabled).then((next) => setSkills((current) => current.map((item) => item.id === skill.id ? next : item))).catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to update skill'))} className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${skill.enabled ? 'bg-paw-success-bg text-paw-success' : 'bg-paw-raised text-paw-muted hover:text-paw-text'}`}>{skill.enabled ? 'Enabled' : 'Disabled'}</button></div>)}</div>
          </section>
        )}

        {activeTab === 'mcps' && (
          <section className="rounded-2xl border border-paw-border bg-paw-surface p-5">
            <div className="mb-5 flex items-center justify-between gap-4"><div><h2 className="text-xl font-semibold text-paw-text">MCP Servers</h2><p className="mt-1 text-sm text-paw-muted">Inspect the MCP servers currently connected to this agent and add new ones.</p></div><button type="button" onClick={() => setMcpModalOpen(true)} className="btn-primary"><Plus size={16} />Add MCP</button></div>
            <div className="space-y-3">{mcps.map((mcp) => <div key={mcp.id} className="flex flex-col gap-3 rounded-2xl border border-paw-border bg-paw-raised/35 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><Link2 size={15} className="text-paw-faint" /><span className="font-medium text-paw-text">{mcp.name}</span></div><div className="mt-1 text-sm text-paw-muted">{mcp.transport || 'stdio'}{mcp.endpoint ? ` · ${mcp.endpoint}` : ''}</div></div><div className={`inline-flex items-center gap-2 text-sm font-medium ${mcpTone(mcp.status)}`}><span className={`h-2 w-2 rounded-full ${mcpDot(mcp.status)} ${mcp.status === 'connected' ? 'animate-pulse-soft' : ''}`} />{mcp.status}</div></div>)}</div>
          </section>
        )}

        {activeTab === 'sessions' && (
          <section className="rounded-2xl border border-paw-border bg-paw-surface p-5">
            <div className="mb-5"><h2 className="text-xl font-semibold text-paw-text">Sessions</h2><p className="mt-1 text-sm text-paw-muted">Review conversation history and jump directly back into a specific session.</p></div>
            <div className="space-y-3">{sessions.map((session) => <button key={session.id} type="button" onClick={() => navigate(`/chat/${agent.id}?sessionId=${encodeURIComponent(session.id)}`)} className="grid w-full gap-3 rounded-2xl border border-paw-border bg-paw-raised/35 px-4 py-4 text-left transition-colors hover:border-paw-border-strong hover:bg-paw-raised lg:grid-cols-[minmax(0,1.2fr)_120px_1.4fr_140px]"><div className="min-w-0"><div className="truncate font-medium text-paw-text">{session.id}</div><div className="mt-1 text-xs text-paw-faint">{session.title || 'Conversation session'}</div></div><div className="text-sm text-paw-muted">{session.messageCount ?? 0} msgs</div><div className="truncate text-sm text-paw-muted">{truncate(sessionPreview[session.id]?.preview ?? 'No messages yet', 60)}</div><div className="text-sm text-paw-faint">{relative(sessionPreview[session.id]?.lastActive)}</div></button>)}</div>
          </section>
        )}
      </div>

      <Modal open={memoryModalOpen} onClose={() => setMemoryModalOpen(false)} title="Add Memory">
        <form className="space-y-4" onSubmit={(event) => {
          event.preventDefault()
          if (!id || !memoryForm.content.trim()) return
          void api.agents.addMemory(id, { content: memoryForm.content.trim(), tier: memoryForm.tier, importance: memoryForm.importance, tags: memoryForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean) }).then((next) => {
            setMemories((current) => [next, ...current])
            setMemoryModalOpen(false)
            setMemoryForm({ content: '', tier: 'episodic', importance: 70, tags: '' })
            toast.success('Memory added')
          }).catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to add memory'))
        }}>
          <label className="block"><span className="label">Content</span><textarea className="input min-h-[120px] resize-y" value={memoryForm.content} onChange={(event) => setMemoryForm((current) => ({ ...current, content: event.target.value }))} /></label>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block"><span className="label">Tier</span><select className="input" value={memoryForm.tier} onChange={(event) => setMemoryForm((current) => ({ ...current, tier: event.target.value as 'hot' | 'episodic' | 'semantic' }))}><option value="hot">Hot</option><option value="episodic">Episodic</option><option value="semantic">Semantic</option></select></label>
            <label className="block"><span className="label">Importance</span><input className="input" type="number" min="0" max="100" value={memoryForm.importance} onChange={(event) => setMemoryForm((current) => ({ ...current, importance: Number(event.target.value) }))} /></label>
            <label className="block"><span className="label">Tags</span><input className="input" value={memoryForm.tags} onChange={(event) => setMemoryForm((current) => ({ ...current, tags: event.target.value }))} placeholder="comma, separated, tags" /></label>
          </div>
          <div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setMemoryModalOpen(false)}>Cancel</button><button type="submit" className="btn-primary"><Plus size={16} />Add Memory</button></div>
        </form>
      </Modal>

      <Modal open={skillModalOpen} onClose={() => setSkillModalOpen(false)} title="Add Skill">
        <div className="space-y-4"><p className="text-sm leading-7 text-paw-muted">Skill attachment is managed from the dedicated Skills page. Open it now to browse, import, or enable more capabilities for this agent.</p><div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setSkillModalOpen(false)}>Close</button><button type="button" className="btn-primary" onClick={() => { setSkillModalOpen(false); navigate('/skills') }}><Zap size={16} />Open Skills</button></div></div>
      </Modal>

      <Modal open={mcpModalOpen} onClose={() => setMcpModalOpen(false)} title="Add MCP">
        <form className="space-y-4" onSubmit={(event) => {
          event.preventDefault()
          if (!id || !mcpForm.name.trim()) return
          void api.agents.addMcp(id, { name: mcpForm.name.trim(), transport: mcpForm.transport.trim(), endpoint: mcpForm.endpoint.trim() }).then((next) => {
            setMcps((current) => [next, ...current])
            setMcpModalOpen(false)
            setMcpForm({ name: '', transport: 'stdio', endpoint: '' })
            toast.success('MCP connected')
          }).catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to add MCP'))
        }}>
          <label className="block"><span className="label">Name</span><input className="input" value={mcpForm.name} onChange={(event) => setMcpForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Postgres, Browser, Notion" /></label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block"><span className="label">Transport</span><input className="input" value={mcpForm.transport} onChange={(event) => setMcpForm((current) => ({ ...current, transport: event.target.value }))} /></label>
            <label className="block"><span className="label">Endpoint</span><input className="input" value={mcpForm.endpoint} onChange={(event) => setMcpForm((current) => ({ ...current, endpoint: event.target.value }))} placeholder="local://server or ws://..." /></label>
          </div>
          <div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setMcpModalOpen(false)}>Cancel</button><button type="submit" className="btn-primary"><Plus size={16} />Connect MCP</button></div>
        </form>
      </Modal>
    </div>
  )
}
