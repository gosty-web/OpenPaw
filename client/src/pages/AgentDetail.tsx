import { useEffect, useMemo, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import { Bot, FileText, Link2, MessageSquare, Plus, Save, Sparkles, Zap } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Modal } from '../components/Modal'
import { AgentAvatar, StatusBadge } from '../components/chat/shared'
import {
  api,
  type Agent,
  type AgentFile,
  type AgentMCP,
  type AgentMemory,
  type AgentMessage,
  type AgentSession,
  type AgentSkill,
  type AgentWorkspace,
} from '../lib/api'
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
    ])
      .then(([a, fl, soul, mem, sk, mp, ws, ss, ms]) => {
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
      })
      .catch((error) => {
        if (alive) {
          toast.error(error instanceof Error ? error.message : 'Unable to load agent')
          setAgent(null)
        }
      })
      .finally(() => { if (alive) setLoading(false) })
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

  if (loading) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-8">
        <div className="rounded-2xl border border-paw-border bg-paw-surface p-6">
          <div className="mb-3 h-7 w-48 animate-pulse rounded bg-paw-raised" />
          <div className="h-4 w-80 animate-pulse rounded bg-paw-raised" />
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="rounded-2xl border border-dashed border-paw-border bg-paw-surface px-10 py-12 text-center">
          <Bot size={42} className="mx-auto mb-4 text-paw-faint opacity-20" />
          <h1 className="mb-2 text-xl font-semibold text-paw-text">Agent not found</h1>
          <button type="button" className="btn-primary" onClick={() => navigate('/agents')}>
            Back to agents
          </button>
        </div>
      </div>
    )
  }

  const fileGroups: Array<{ label: string; files: string[] }> = [
    { label: 'Identity', files: ['AGENTS.md', 'SOUL.md', 'USER.md', 'IDENTITY.md'] },
    { label: 'Behavior', files: ['MEMORY.md', 'HEARTBEAT.md', 'GROWTH.md', 'BONDS.md'] },
  ]

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-8 animate-fade-in">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <AgentAvatar name={agent.name} size="lg" />
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold text-paw-text">{agent.name}</h1>
                  <StatusBadge status={agent.status} />
                </div>
                <p className="text-sm text-paw-muted">{agent.role}</p>
                <p className="mt-1 text-xs text-paw-faint">Created {agent.createdAt ? format(new Date(agent.createdAt), 'MMM d, yyyy') : 'recently'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={`/chat/${agent.id}`} className="btn-secondary">
                <MessageSquare size={15} />
                Chat
              </Link>
              <Link to={`/agents/${agent.id}/config`} className="btn-secondary">
                <FileText size={15} />
                Edit Config
              </Link>
            </div>
          </div>
          <div className="border-b border-paw-border">
            <div className="flex flex-wrap gap-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-1 pb-3 text-sm transition-colors ${activeTab === tab.id ? 'border-b-2 border-paw-accent text-paw-text -mb-px font-medium' : 'text-paw-muted hover:text-paw-text'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {activeTab === 'overview' && vitality && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_320px]">
            <div className="space-y-6">
              <section className="bg-paw-surface border border-paw-border rounded-xl p-5 hover:border-paw-border-strong hover:shadow-lg transition-all duration-200">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <AgentAvatar name={agent.name} size="lg" />
                      <div className="absolute -bottom-1 -right-1">
                        <StatusBadge status={agent.status} />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-paw-text">{agent.name}</h2>
                      <p className="text-sm text-paw-muted">{agent.role}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-paw-faint">Last Pulse</span>
                    <span className="text-xs font-mono text-paw-muted">{relative(agent.updatedAt)}</span>
                  </div>
                </div>

                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  {[
                    { label: 'Energy', value: vitality.energy, color: 'bg-amber-400' },
                    { label: 'Curiosity', value: vitality.curiosity, color: 'bg-blue-400' },
                    { label: 'Satisfaction', value: vitality.satisfaction, color: 'bg-paw-success' },
                    { label: 'Motivation', value: vitality.motivation, color: 'bg-paw-accent' },
                  ].map((item) => (
                    <div key={item.label} className="group">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-paw-muted group-hover:text-paw-text transition-colors">{item.label}</span>
                        <span className="font-mono text-xs text-paw-text">{item.value}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-paw-raised overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${item.color} shadow-[0_0_8px_rgba(255,255,255,0.1)] transition-all duration-1000 ease-out`} 
                          style={{ width: `${item.value}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-paw-border-subtle grid gap-6 md:grid-cols-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-paw-faint mb-2">Provider</div>
                    <div className="inline-flex bg-paw-raised border border-paw-border px-2 py-1 rounded text-[10px] font-mono text-paw-muted">
                      {agent.provider}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-paw-faint mb-2">Model</div>
                    <div className="text-xs font-mono text-paw-text truncate" title={agent.model}>{agent.model}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-paw-faint mb-2">Temp</div>
                    <div className="text-xs font-mono text-paw-text">{agent.temperature?.toFixed(1) ?? '0.7'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-paw-faint mb-2">Max Tokens</div>
                    <div className="text-xs font-mono text-paw-text">{agent.maxTokens ?? 4096}</div>
                  </div>
                </div>
              </section>

              <section className="bg-paw-surface border border-paw-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={16} className="text-paw-accent" />
                  <h3 className="text-sm font-semibold text-paw-text">Soul Summary</h3>
                </div>
                <p className="text-sm leading-7 text-paw-muted selection:bg-paw-accent-bg selection:text-paw-accent">
                  {soulSummary || "Establishing internal latent space..."}
                </p>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="bg-paw-surface border border-paw-border rounded-xl p-5">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-paw-faint mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <Link to={`/chat/${agent.id}`} className="btn-primary w-full justify-center group">
                    <MessageSquare size={16} className="group-hover:scale-110 transition-transform" />
                    Chat with {agent.name.split(' ')[0]}
                  </Link>
                  <Link to={`/agents/${agent.id}/config`} className="btn-secondary w-full justify-center">
                    <FileText size={16} />
                    Edit Config
                  </Link>
                  <button 
                    type="button" 
                    onClick={() => toast.info('Sub-agent spawning is coming soon')} 
                    className="btn-ghost w-full justify-center border border-transparent hover:border-paw-border"
                  >
                    <Sparkles size={16} />
                    Spawn Sub-Agent
                  </button>
                </div>
              </section>

              <section className="bg-paw-surface border border-paw-border rounded-xl p-5">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-paw-faint mb-4">Workspaces</h3>
                <div className="flex flex-wrap gap-2">
                  {workspaces.length === 0 ? (
                    <div className="py-4 text-center w-full">
                      <p className="text-xs text-paw-faint italic">No assigned workspaces</p>
                    </div>
                  ) : (
                    workspaces.map((workspace) => (
                      <span key={workspace.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-paw-raised border border-paw-border text-xs text-paw-muted hover:text-paw-text hover:border-paw-border-strong transition-all cursor-default">
                        <div className="w-1.5 h-1.5 rounded-full bg-paw-accent-h" />
                        {workspace.name}
                      </span>
                    ))
                  )}
                </div>
              </section>
            </aside>
          </div>
        )}

        {activeTab === 'files' && (
          <section className="grid gap-0 rounded-xl border border-paw-border bg-paw-surface overflow-hidden lg:grid-cols-[200px_minmax(0,1fr)] min-h-[600px]">
            <aside className="bg-paw-surface border-b border-paw-border lg:border-b-0 lg:border-r lg:border-paw-border-subtle flex flex-col">
              <div className="p-4 border-b border-paw-border-subtle bg-paw-raised/20">
                <h3 className="text-[10px] uppercase tracking-widest text-paw-faint font-semibold">FileSystem</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {fileGroups.map((group) => (
                  <div key={group.label} className="mb-6">
                    <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-paw-faint/60">{group.label}</div>
                    <div className="space-y-0.5">
                      {group.files.filter((filename) => (agentFileNames as string[]).includes(filename)).map((filename) => {
                        const dirty = (fileMap[filename]?.content ?? savedContent[filename] ?? '') !== (savedContent[filename] ?? '')
                        const active = selectedFile === filename
                        return (
                          <button
                            key={filename}
                            type="button"
                            onClick={() => void loadFile(filename)}
                            className={`group flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs font-mono transition-all ${active ? 'bg-paw-accent-bg text-paw-accent shadow-sm' : 'text-paw-muted hover:bg-paw-raised hover:text-paw-text'}`}
                          >
                            <div className={`relative flex-shrink-0 w-2 h-2 rounded-full transition-all ${dirty ? 'bg-paw-warning scale-110' : active ? 'bg-paw-accent' : 'bg-paw-faint opacity-30 group-hover:opacity-60'}`} />
                            <span className="truncate">{filename}</span>
                            {active && <div className="ml-auto w-1 h-3 bg-paw-accent rounded-full" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            <div className="flex flex-col min-w-0 bg-paw-bg">
              <div className="flex items-center justify-between px-6 py-4 border-b border-paw-border-subtle bg-paw-surface/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-paw-raised rounded-lg border border-paw-border">
                    <FileText size={14} className="text-paw-accent" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-mono text-sm text-paw-text font-medium">{selectedFile}</span>
                    <span className="text-[10px] text-paw-faint">{currentFile?.updatedAt ? `Saved ${relative(currentFile.updatedAt)}` : 'Draft'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isDirty && <span className="text-xs text-paw-warning font-medium hidden sm:inline">Unsaved changes</span>}
                  <button 
                    type="button" 
                    onClick={() => void saveFile()} 
                    className="btn-primary py-1.5 h-9" 
                    disabled={!isDirty || savingFile || filesLoading}
                  >
                    <Save size={14} />
                    {savingFile ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
              <div className="flex-1 relative">
                {filesLoading && !currentFile ? (
                  <div className="absolute inset-0 p-8 space-y-4">
                    <div className="h-4 bg-paw-raised rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-paw-raised rounded w-full animate-pulse" />
                    <div className="h-4 bg-paw-raised rounded w-5/6 animate-pulse" />
                  </div>
                ) : (
                  <CodeMirror
                    value={currentText}
                    height="100%"
                    minHeight="560px"
                    extensions={[markdown()]}
                    theme={editorTheme}
                    onChange={(value) => setFileMap((current) => ({ ...current, [selectedFile]: { ...(current[selectedFile] ?? { name: selectedFile }), content: value, updatedAt: current[selectedFile]?.updatedAt } }))}
                    basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }}
                    className="text-sm border-none"
                  />
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'memory' && (
          <section className="bg-paw-surface border border-paw-border rounded-xl p-5 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Bot size={18} className="text-paw-accent" />
                  <h2 className="text-lg font-semibold text-paw-text">Latent Memory</h2>
                </div>
                <p className="text-sm text-paw-muted max-w-xl">Deep exploration of agent's experiences, learned behaviors, and semantic associations.</p>
              </div>
              <button type="button" onClick={() => setMemoryModalOpen(true)} className="btn-primary shadow-glow">
                <Plus size={16} />
                Add Record
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="relative flex-1 group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-paw-faint group-focus-within:text-paw-accent transition-colors">
                  <Bot size={14} />
                </div>
                <input 
                  className="input pl-10 h-10 border-paw-border focus:border-paw-accent/50" 
                  value={memorySearch} 
                  onChange={(event) => setMemorySearch(event.target.value)} 
                  placeholder="Search across consciousness..." 
                />
              </div>
              <div className="flex gap-1.5 p-1 bg-paw-raised border border-paw-border rounded-lg">
                {(['all', 'hot', 'episodic', 'semantic'] as MemoryFilter[]).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setMemoryFilter(filter)}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${memoryFilter === filter ? 'bg-paw-surface text-paw-text shadow-sm ring-1 ring-paw-border' : 'text-paw-faint hover:text-paw-muted hover:bg-paw-surface/50'}`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {memoryItems.length > 0 ? (
                memoryItems.map((memory) => (
                  <article key={memory.id} className="group bg-paw-surface border border-paw-border rounded-xl p-5 hover:border-paw-border-strong hover:shadow-lg transition-all duration-200 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          memory.tier === 'hot' ? 'bg-paw-warning-bg text-paw-warning border-paw-warning/20' : 
                          memory.tier === 'semantic' ? 'bg-paw-success-bg text-paw-success border-paw-success/20' : 
                          'bg-paw-info-bg text-paw-info border-paw-info/20'
                        }`}>
                          {memory.tier}
                        </span>
                        <span className="text-[10px] text-paw-faint font-mono">{relative(memory.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={`w-2.5 h-2.5 rounded-full ${(memory.importance ?? 0) > 70 ? 'bg-paw-danger' : (memory.importance ?? 0) > 40 ? 'bg-paw-warning' : 'bg-paw-success'} animate-pulse-soft shadow-[0_0_8px_rgba(0,0,0,0.2)]`} />
                        <span className="text-[10px] text-paw-muted font-mono">{(memory.importance ?? 0)}%</span>
                      </div>
                    </div>
                    <p className="text-sm text-paw-text leading-relaxed flex-1 line-clamp-4 group-hover:line-clamp-none transition-all duration-300">
                      {memory.content}
                    </p>
                    {memory.tags && memory.tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {memory.tags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 rounded-md bg-paw-raised border border-paw-border-subtle text-[10px] text-paw-faint hover:text-paw-text transition-colors">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                ))
              ) : (
                <div className="col-span-full py-20 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-paw-raised flex items-center justify-center border border-paw-border opacity-50">
                    <Sparkles size={24} className="text-paw-faint" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-paw-text">No memories found</h3>
                    <p className="text-xs text-paw-muted mt-1">Refine your search or add a new record.</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'skills' && (
          <section className="bg-paw-surface border border-paw-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={20} className="text-paw-accent" />
                  <h2 className="text-lg font-semibold text-paw-text">Skill Toolkit</h2>
                </div>
                <p className="text-sm text-paw-muted">Manage the procedural capabilities and toolkits available to this agent.</p>
              </div>
              <button type="button" onClick={() => setSkillModalOpen(true)} className="btn-primary">
                <Plus size={16} />
                Attach Skill
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {skills.map((skill) => (
                <div key={skill.id} className="relative group bg-paw-surface border border-paw-border rounded-xl p-5 hover:border-paw-border-strong hover:bg-paw-raised/20 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-lg border ${skill.enabled ? 'bg-paw-accent-bg border-paw-accent/20 text-paw-accent' : 'bg-paw-raised border-paw-border text-paw-faint'}`}>
                      <Zap size={18} />
                    </div>
                    <button
                      type="button"
                      onClick={() => void api.agents.toggleSkill(agent.id, skill.id, !skill.enabled).then((next) => setSkills((current) => current.map((item) => item.id === skill.id ? next : item))).catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to update skill'))}
                      className={`relative w-10 h-6 rounded-full transition-all duration-200 border ${skill.enabled ? 'bg-paw-accent border-paw-accent' : 'bg-paw-raised border-paw-border'}`}
                    >
                      <div className={`absolute top-1 w-3.5 h-3.5 bg-white rounded-full transition-all shadow-sm ${skill.enabled ? 'left-5' : 'left-1'}`} />
                    </button>
                  </div>
                  <h4 className="text-sm font-semibold text-paw-text group-hover:text-paw-accent transition-colors">{skill.name}</h4>
                  <p className="mt-2 text-xs text-paw-muted leading-relaxed line-clamp-2">{skill.description}</p>
                </div>
              ))}
              {skills.length === 0 && (
                <div className="col-span-full py-16 text-center border-2 border-dashed border-paw-border rounded-2xl bg-paw-raised/10">
                  <Zap size={32} className="mx-auto mb-4 text-paw-faint opacity-20" />
                  <h3 className="text-sm font-semibold text-paw-text">No skills attached</h3>
                  <button type="button" onClick={() => setSkillModalOpen(true)} className="btn-secondary mt-4">Browse Skills</button>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'mcps' && (
          <section className="bg-paw-surface border border-paw-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Link2 size={20} className="text-paw-accent" />
                  <h2 className="text-lg font-semibold text-paw-text">MCP Context Providers</h2>
                </div>
                <p className="text-sm text-paw-muted">Model Context Protocol servers providing external tools and data.</p>
              </div>
              <button type="button" onClick={() => setMcpModalOpen(true)} className="btn-primary">
                <Plus size={16} />
                Connect Server
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {mcps.map((mcp) => (
                <div key={mcp.id} className="bg-paw-surface border border-paw-border rounded-xl p-5 hover:border-paw-border-strong hover:shadow-lg transition-all group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-paw-raised rounded-lg border border-paw-border text-paw-muted group-hover:text-paw-accent group-hover:border-paw-accent/30 transition-all">
                      <Link2 size={18} />
                    </div>
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                      mcp.status === 'connected' ? 'bg-paw-success-bg text-paw-success border-paw-success/20' : 
                      mcp.status === 'error' ? 'bg-paw-danger-bg text-paw-danger border-paw-danger/20' : 
                      'bg-paw-raised text-paw-faint border-paw-border'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${mcp.status === 'connected' ? 'bg-paw-success animate-pulse-soft' : 'bg-current'}`} />
                      {mcp.status}
                    </div>
                  </div>
                  <h4 className="text-sm font-semibold text-paw-text truncate">{mcp.name}</h4>
                  <div className="mt-2 flex flex-col gap-1">
                    <span className="text-[10px] text-paw-faint font-mono uppercase tracking-widest">{mcp.transport || 'stdio'}</span>
                    <span className="text-[10px] text-paw-muted truncate font-mono bg-paw-raised/50 px-1.5 py-0.5 rounded border border-paw-border-subtle" title={mcp.endpoint}>
                      {mcp.endpoint || 'Internal'}
                    </span>
                  </div>
                </div>
              ))}
              {mcps.length === 0 && (
                <div className="col-span-full py-16 text-center border-2 border-dashed border-paw-border rounded-2xl bg-paw-raised/10">
                  <Link2 size={32} className="mx-auto mb-4 text-paw-faint opacity-20" />
                  <h3 className="text-sm font-semibold text-paw-text">No active MCP servers</h3>
                  <button type="button" onClick={() => setMcpModalOpen(true)} className="btn-secondary mt-4">Connect Server</button>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'sessions' && (
          <section className="bg-paw-surface border border-paw-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-paw-border bg-paw-surface/50">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare size={18} className="text-paw-accent" />
                <h2 className="text-lg font-semibold text-paw-text">Conversation History</h2>
              </div>
              <p className="text-sm text-paw-muted">Audit the session logs and interactive history for this entity.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-paw-raised border-b border-paw-border">
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-paw-faint">Session Identity</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-paw-faint">Density</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-paw-faint w-2/5">Latest Exchange</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-paw-faint">Persistence</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-paw-faint text-right">Interaction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paw-border-subtle">
                  {sessions.length > 0 ? (
                    sessions.map((session) => (
                      <tr key={session.id} className="group hover:bg-paw-raised/40 transition-colors">
                        <td className="px-6 py-4">
                          <code className="text-[11px] bg-paw-raised border border-paw-border-subtle px-1.5 py-0.5 rounded text-paw-accent group-hover:border-paw-accent/30 transition-colors">
                            {session.id.split('-')[0]}
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center justify-center min-w-[24px] px-1.5 h-5 rounded-full bg-paw-accent/10 border border-paw-accent/20 text-[10px] font-bold text-paw-accent">
                            {session.messageCount ?? 0}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-paw-muted truncate italic font-serif">
                            "{truncate(sessionPreview[session.id]?.preview ?? 'Initialization...', 60)}"
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-paw-faint tabular-nums whitespace-nowrap">
                            {relative(sessionPreview[session.id]?.lastActive)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            className="btn-ghost h-8 px-4 opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-paw-border translate-x-2 group-hover:translate-x-0"
                            onClick={() => navigate(`/chat/${agent.id}?sessionId=${encodeURIComponent(session.id)}`)}
                          >
                            Resurrect
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-paw-faint italic text-sm">
                        No active session streams detected in latent space.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      <Modal open={memoryModalOpen} onClose={() => setMemoryModalOpen(false)} title="Add Memory">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!id || !memoryForm.content.trim()) return
            void api.agents
              .addMemory(id, {
                content: memoryForm.content.trim(),
                tier: memoryForm.tier,
                importance: memoryForm.importance,
                tags: memoryForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
              })
              .then((next) => {
                setMemories((current) => [next, ...current])
                setMemoryModalOpen(false)
                setMemoryForm({ content: '', tier: 'episodic', importance: 70, tags: '' })
                toast.success('Memory added')
              })
              .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to add memory'))
          }}
        >
          <label className="block">
            <span className="label">Content</span>
            <textarea className="input min-h-[120px] resize-y" value={memoryForm.content} onChange={(event) => setMemoryForm((current) => ({ ...current, content: event.target.value }))} />
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="label">Tier</span>
              <select className="input" value={memoryForm.tier} onChange={(event) => setMemoryForm((current) => ({ ...current, tier: event.target.value as 'hot' | 'episodic' | 'semantic' }))}>
                <option value="hot">Hot</option>
                <option value="episodic">Episodic</option>
                <option value="semantic">Semantic</option>
              </select>
            </label>
            <label className="block">
              <span className="label">Importance</span>
              <input className="input" type="number" min="0" max="100" value={memoryForm.importance} onChange={(event) => setMemoryForm((current) => ({ ...current, importance: Number(event.target.value) }))} />
            </label>
            <label className="block">
              <span className="label">Tags</span>
              <input className="input" value={memoryForm.tags} onChange={(event) => setMemoryForm((current) => ({ ...current, tags: event.target.value }))} placeholder="comma, separated, tags" />
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setMemoryModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">
              <Plus size={16} />
              Add Memory
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={skillModalOpen} onClose={() => setSkillModalOpen(false)} title="Add Skill">
        <div className="space-y-4">
          <p className="text-sm leading-7 text-paw-muted">Skill attachment is managed from the dedicated Skills page. Open it now to browse, import, or enable more capabilities for this agent.</p>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setSkillModalOpen(false)}>Close</button>
            <button type="button" className="btn-primary" onClick={() => { setSkillModalOpen(false); navigate('/skills') }}>
              <Zap size={16} />
              Open Skills
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={mcpModalOpen} onClose={() => setMcpModalOpen(false)} title="Add MCP">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!id || !mcpForm.name.trim()) return
            void api.agents
              .addMcp(id, { name: mcpForm.name.trim(), transport: mcpForm.transport.trim(), endpoint: mcpForm.endpoint.trim() })
              .then((next) => {
                setMcps((current) => [next, ...current])
                setMcpModalOpen(false)
                setMcpForm({ name: '', transport: 'stdio', endpoint: '' })
                toast.success('MCP connected')
              })
              .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to add MCP'))
          }}
        >
          <label className="block">
            <span className="label">Name</span>
            <input className="input" value={mcpForm.name} onChange={(event) => setMcpForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Postgres, Browser, Notion" />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="label">Transport</span>
              <input className="input" value={mcpForm.transport} onChange={(event) => setMcpForm((current) => ({ ...current, transport: event.target.value }))} />
            </label>
            <label className="block">
              <span className="label">Endpoint</span>
              <input className="input" value={mcpForm.endpoint} onChange={(event) => setMcpForm((current) => ({ ...current, endpoint: event.target.value }))} placeholder="local://server or ws://..." />
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setMcpModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">
              <Plus size={16} />
              Connect MCP
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
