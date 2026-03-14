import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Link2, Pencil, Play, Plus, PlugZap, Trash2, X, Zap } from 'lucide-react'
import { Modal } from '../components/Modal'
import { api, type MCPServer } from '../lib/api'
import { toast } from '../lib/toast'

type McpTab = 'stdio' | 'sse' | 'http'
type PairRow = { id: string; key: string; value: string }
type ArgRow = { id: string; value: string }
type TestResult = { ok: boolean; message?: string; responseTimeMs?: number; tools?: string[] } | null

const popularMcps = [
  {
    name: 'Filesystem',
    description: 'Read/write local files',
    packageName: '@modelcontextprotocol/server-filesystem',
    tab: 'stdio' as McpTab,
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/workspace'],
  },
  {
    name: 'GitHub',
    description: 'Manage repos and issues',
    packageName: '@modelcontextprotocol/server-github',
    tab: 'stdio' as McpTab,
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
  },
  {
    name: 'Brave Search',
    description: 'Web search',
    packageName: '@modelcontextprotocol/server-brave-search',
    tab: 'stdio' as McpTab,
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
  },
  {
    name: 'Postgres',
    description: 'Query databases',
    packageName: '@modelcontextprotocol/server-postgres',
    tab: 'stdio' as McpTab,
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
  },
  {
    name: 'Puppeteer',
    description: 'Browser automation',
    packageName: '@modelcontextprotocol/server-puppeteer',
    tab: 'stdio' as McpTab,
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
  },
  {
    name: 'Memory',
    description: 'Persistent memory store',
    packageName: '@modelcontextprotocol/server-memory',
    tab: 'stdio' as McpTab,
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
  },
]

const blankPair = (): PairRow => ({ id: crypto.randomUUID(), key: '', value: '' })
const blankArg = (): ArgRow => ({ id: crypto.randomUUID(), value: '' })

function pairsToRecord(rows: PairRow[]) {
  return rows.reduce<Record<string, string>>((accumulator, row) => {
    if (row.key.trim() && row.value.trim()) {
      accumulator[row.key.trim()] = row.value.trim()
    }
    return accumulator
  }, {})
}

function recordToPairs(record?: Record<string, string>) {
  const entries = Object.entries(record ?? {})
  return entries.length ? entries.map(([key, value]) => ({ id: crypto.randomUUID(), key, value })) : [blankPair()]
}

function argsToRows(args?: string[]) {
  return args?.length ? args.map((value) => ({ id: crypto.randomUUID(), value })) : [blankArg()]
}

function statusDot(status?: MCPServer['status']) {
  if (status === 'connected') return 'bg-paw-success'
  if (status === 'error') return 'bg-paw-danger'
  return 'bg-paw-faint'
}

function transportBadge(transport?: string) {
  if (transport === 'http') return 'bg-paw-info-bg text-paw-info'
  if (transport === 'sse') return 'bg-paw-warning-bg text-paw-warning'
  return 'bg-paw-success-bg text-paw-success'
}

function formatCount(count?: number) {
  const value = count ?? 0
  return `Used by ${value} agent${value === 1 ? '' : 's'}`
}

export function MCPs() {
  const [mcps, setMcps] = useState<MCPServer[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<MCPServer | null>(null)
  const [tab, setTab] = useState<McpTab>('stdio')
  const [name, setName] = useState('')
  const [command, setCommand] = useState('')
  const [url, setUrl] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [args, setArgs] = useState<ArgRow[]>([blankArg()])
  const [envRows, setEnvRows] = useState<PairRow[]>([blankPair()])
  const [headerRows, setHeaderRows] = useState<PairRow[]>([blankPair()])
  const [submitting, setSubmitting] = useState(false)
  const [testOpen, setTestOpen] = useState(false)
  const [testTarget, setTestTarget] = useState<MCPServer | null>(null)
  const [testResult, setTestResult] = useState<TestResult>(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    api.mcps
      .list()
      .then(setMcps)
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load MCPs'))
      .finally(() => setLoading(false))
  }, [])

  const connectedCount = useMemo(() => mcps.filter((mcp) => mcp.enabled !== false).length, [mcps])

  const resetForm = () => {
    setEditing(null)
    setTab('stdio')
    setName('')
    setCommand('')
    setUrl('')
    setAuthToken('')
    setArgs([blankArg()])
    setEnvRows([blankPair()])
    setHeaderRows([blankPair()])
  }

  const openCreate = () => {
    resetForm()
    setModalOpen(true)
  }

  const openEdit = (mcp: MCPServer) => {
    setEditing(mcp)
    setTab((mcp.transport as McpTab) || 'stdio')
    setName(mcp.name)
    setCommand(mcp.command ?? '')
    setUrl(mcp.url ?? '')
    setAuthToken(mcp.authToken ?? '')
    setArgs(argsToRows(mcp.args))
    setEnvRows(recordToPairs(mcp.env))
    setHeaderRows(recordToPairs(mcp.headers))
    setModalOpen(true)
  }

  const upsertMcp = (nextMcp: MCPServer) => {
    setMcps((current) => {
      const index = current.findIndex((entry) => entry.id === nextMcp.id)
      if (index === -1) return [nextMcp, ...current]
      const copy = [...current]
      copy[index] = nextMcp
      return copy
    })
  }

  const createFromTemplate = async (template: (typeof popularMcps)[number]) => {
    try {
      const created = await api.mcps.create({
        name: template.name,
        transport: template.tab,
        command: template.command,
        args: template.args,
        enabled: true,
      })
      upsertMcp(created)
      toast.success(`${template.name} added`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to add MCP')
    }
  }

  const submit = async () => {
    if (!name.trim()) {
      toast.warning('Name is required')
      return
    }
    if (tab === 'stdio' && !command.trim()) {
      toast.warning('Command is required for stdio MCPs')
      return
    }
    if ((tab === 'sse' || tab === 'http') && !url.trim()) {
      toast.warning('URL is required for network MCPs')
      return
    }

    setSubmitting(true)

    try {
      const payload: Partial<MCPServer> & { name: string } = {
        name: name.trim(),
        transport: tab,
        command: tab === 'stdio' ? command.trim() : undefined,
        url: tab === 'stdio' ? undefined : url.trim(),
        authToken: tab === 'sse' ? authToken.trim() || undefined : undefined,
        args: tab === 'stdio' ? args.map((row) => row.value.trim()).filter(Boolean) : [],
        env: tab === 'stdio' ? pairsToRecord(envRows) : {},
        headers: tab === 'http' ? pairsToRecord(headerRows) : tab === 'sse' && authToken.trim() ? { Authorization: `Bearer ${authToken.trim()}` } : {},
        enabled: true,
      }

      const result = editing ? await api.mcps.update(editing.id, payload) : await api.mcps.create(payload)
      upsertMcp(result)
      setModalOpen(false)
      toast.success(editing ? 'MCP updated' : 'MCP added')

      if (!editing && tab === 'stdio') {
        setTestTarget(result)
        setTestOpen(true)
        setTesting(true)
        const response = await api.mcps.test(result.id)
        setTestResult(response)
        setTesting(false)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save MCP')
      setTesting(false)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleEnabled = async (mcp: MCPServer) => {
    try {
      const updated = await api.mcps.update(mcp.id, { enabled: !(mcp.enabled !== false) })
      upsertMcp(updated)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update MCP')
    }
  }

  const runTest = async (mcp: MCPServer) => {
    setTestTarget(mcp)
    setTestOpen(true)
    setTesting(true)
    setTestResult(null)

    try {
      const response = await api.mcps.test(mcp.id)
      setTestResult(response)
      upsertMcp({ ...mcp, responseTimeMs: response.responseTimeMs, tools: response.tools })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to test MCP')
    } finally {
      setTesting(false)
    }
  }

  const removeMcp = async (mcp: MCPServer) => {
    try {
      await api.mcps.delete(mcp.id)
      setMcps((current) => current.filter((entry) => entry.id !== mcp.id))
      toast.success(`${mcp.name} removed`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete MCP')
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between sticky top-0 z-20 pt-2 pb-6 bg-paw-bg bg-opacity-90 backdrop-blur-sm -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-paw-text">MCP Protocol</h1>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-paw-raised border border-paw-border">
                <div className="w-1.5 h-1.5 rounded-full bg-paw-success animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-paw-muted">{connectedCount} Active Nodes</span>
              </div>
            </div>
            <p className="max-w-2xl text-sm text-paw-muted leading-relaxed">Connect specialized tool servers to grant agents capabilities like local filesystem manipulation, real-time search, and browser automation via Model Context Protocol.</p>
          </div>
          <button type="button" className="btn-primary h-11 px-6 shadow-glow self-start lg:self-auto group" onClick={openCreate}>
            <Plus size={18} className="group-hover:rotate-90 transition-transform" />
            Integrate New MCP
          </button>
        </header>

        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-paw-border-subtle pb-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-paw-faint">Operational Connections</h2>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-paw-faint">
                <span className="w-2 h-2 rounded-full bg-paw-success" /> Connected
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-paw-faint">
                <span className="w-2 h-2 rounded-full bg-paw-danger" /> Faulty
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="h-44 animate-pulse rounded-2xl bg-paw-surface border border-paw-border" />
              ))}
            </div>
          ) : mcps.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-paw-border bg-paw-surface/50 py-20 text-center animate-slide-up">
              <div className="relative mb-6">
                <PlugZap size={64} className="text-paw-faint opacity-10" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Plus size={24} className="text-paw-accent animate-bounce" />
                </div>
              </div>
              <h3 className="mb-2 text-xl font-bold text-paw-text">No active MCP nodes detected</h3>
              <p className="max-w-md text-sm leading-relaxed text-paw-muted px-8">Your ecosystem is currently sandboxed. Connect your first MCP server below to expand your agent's action space.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 animate-slide-up">
              {mcps.map((mcp) => {
                const targetText = mcp.transport === 'stdio' ? `${mcp.command ?? ''} ${(mcp.args ?? []).join(' ')}`.trim() : mcp.url ?? ''
                const isEnabled = mcp.enabled !== false
                return (
                  <div 
                    key={mcp.id} 
                    className={`group relative flex flex-col h-44 rounded-2xl border transition-all p-5 hover:shadow-lg ${isEnabled ? 'bg-paw-surface border-paw-border hover:border-paw-border-strong' : 'bg-paw-raised/20 border-paw-border-subtle opacity-60 grayscale hover:grayscale-0'}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${statusDot(mcp.status)}`} />
                        <div className="min-w-0">
                          <h3 className="font-bold text-paw-text truncate tracking-tight">{mcp.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded leading-none ${transportBadge(mcp.transport)}`}>
                              {mcp.transport ?? 'stdio'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => void toggleEnabled(mcp)} 
                        className={`h-6 px-2 rounded-full text-[10px] font-bold uppercase tracking-tighter transition-all ${isEnabled ? 'bg-paw-success-bg text-paw-success border border-paw-success/20' : 'bg-paw-raised text-paw-faint border border-paw-border'}`}
                      >
                        {isEnabled ? 'Live' : 'Dark'}
                      </button>
                    </div>

                    <div className="flex-1 min-w-0 mb-4">
                      <p className="text-[11px] font-mono text-paw-muted bg-paw-bg/50 p-2 rounded-lg border border-paw-border/50 truncate opacity-80" title={targetText}>
                        {targetText || 'Null endpoint reference'}
                      </p>
                    </div>

                    <div className="flex items-end justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-paw-faint uppercase tracking-widest">Visibility</span>
                        <span className="text-[10px] text-paw-muted font-medium">{formatCount(mcp.agentCount)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" className="w-9 h-9 flex items-center justify-center rounded-xl bg-paw-raised border border-paw-border hover:border-paw-accent hover:text-paw-accent transition-colors" onClick={() => openEdit(mcp)}>
                          <Pencil size={14} />
                        </button>
                        <button type="button" className="w-9 h-9 flex items-center justify-center rounded-xl bg-paw-raised border border-paw-border hover:border-paw-accent hover:text-paw-accent transition-colors" onClick={() => void runTest(mcp)}>
                          <Play size={14} />
                        </button>
                        <button type="button" className="w-9 h-9 flex items-center justify-center rounded-xl bg-paw-raised border border-paw-border hover:bg-paw-danger-bg hover:text-paw-danger hover:border-paw-danger/30 transition-colors" onClick={() => void removeMcp(mcp)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {!isEnabled && (
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-paw-faint/10 rounded-b-2xl overflow-hidden">
                        <div className="h-full bg-paw-accent/20 w-1/3" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="space-y-6 pt-4 border-t border-paw-border-subtle">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-paw-faint">Protocol Marketplace</h2>
            <div className="text-[10px] font-bold text-paw-accent bg-paw-accent-bg px-2 py-0.5 rounded border border-paw-accent/20">Official Templates</div>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {popularMcps.map((template) => (
              <article key={template.name} className="group relative rounded-2xl border border-paw-border bg-paw-surface p-5 hover:border-paw-accent/50 transition-all overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-paw-text tracking-tight group-hover:text-paw-accent transition-colors">{template.name}</h3>
                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-paw-faint bg-paw-raised px-1.5 py-0.5 rounded">stdio</span>
                  </div>
                  <p className="text-xs text-paw-muted leading-relaxed line-clamp-2 mb-4 h-8">{template.description}</p>
                  <div className="text-[10px] font-mono text-paw-faint opacity-50 mb-5 break-all line-clamp-1">{template.packageName}</div>
                  <button type="button" className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-paw-raised border border-paw-border font-bold text-xs uppercase tracking-widest text-paw-text hover:bg-paw-accent hover:text-white hover:border-paw-accent transition-all active:scale-95" onClick={() => void createFromTemplate(template)}>
                    <PlugZap size={14} />
                    Deploy Instance
                  </button>
                </div>
                <div className="absolute top-0 right-0 w-24 h-24 bg-paw-accent/5 rounded-full -translate-y-12 translate-x-12 group-hover:scale-150 transition-transform duration-700" />
              </article>
            ))}
          </div>
        </section>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Node Configuration' : 'Establish Connection'}>
        <div className="space-y-8 p-1">
          <div className="flex gap-4 p-1.5 bg-paw-raised rounded-2xl w-fit border border-paw-border">
            {(['stdio', 'sse', 'http'] as McpTab[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`flex items-center gap-2 px-5 h-10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${tab === value ? 'bg-paw-surface text-paw-accent shadow-sm ring-1 ring-paw-border' : 'text-paw-faint hover:text-paw-muted'}`}
              >
                {value === 'stdio' ? <Zap size={14} /> : <Link2 size={14} />}
                {value === 'stdio' ? 'STDIO' : value.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="grid gap-8">
            <div className="space-y-6">
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-paw-faint">Node Identity</span>
                <input className="input h-12 bg-paw-raised/30 border-paw-border focus:border-paw-accent" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Memory Forge, Vector Oracle..." />
              </label>

              {tab === 'stdio' && (
                <div className="space-y-6 animate-slide-up">
                  <label className="block space-y-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-paw-faint">Execution Authority (Command)</span>
                    <input className="input h-12 bg-paw-raised/30 font-mono text-sm" value={command} onChange={(event) => setCommand(event.target.value)} placeholder='npx -y @modelcontextprotocol/server-filesystem' />
                  </label>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-paw-border-subtle pb-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-paw-faint">Process Arguments</span>
                      <button type="button" className="text-[10px] font-bold text-paw-accent hover:underline flex items-center gap-1" onClick={() => setArgs((current) => [...current, blankArg()])}>
                        <Plus size={12} /> Add Argument
                      </button>
                    </div>
                    <div className="space-y-3">
                      {args.map((row, index) => (
                        <div key={row.id} className="flex items-center gap-3 animate-slide-in">
                          <input className="input h-11 bg-paw-raised/20 font-mono text-xs" value={row.value} onChange={(event) => setArgs((current) => current.map((entry) => entry.id === row.id ? { ...entry, value: event.target.value } : entry))} placeholder={`Argument ${index + 1}`} />
                          <button type="button" className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-paw-raised/30 border border-paw-border hover:bg-paw-danger-bg hover:text-paw-danger hover:border-paw-danger/30 transition-all" onClick={() => setArgs((current) => current.length === 1 ? [blankArg()] : current.filter((entry) => entry.id !== row.id))}>
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-paw-border-subtle pb-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-paw-faint">Environment Overrides</span>
                      <button type="button" className="text-[10px] font-bold text-paw-accent hover:underline flex items-center gap-1" onClick={() => setEnvRows((current) => [...current, blankPair()])}>
                        <Plus size={12} /> Add Variable
                      </button>
                    </div>
                    <div className="space-y-3">
                      {envRows.map((row) => (
                        <div key={row.id} className="grid gap-3 md:grid-cols-[1fr_1fr_44px] animate-slide-in">
                          <input className="input h-11 bg-paw-raised/20 font-mono text-xs uppercase" value={row.key} onChange={(event) => setEnvRows((current) => current.map((entry) => entry.id === row.id ? { ...entry, key: event.target.value } : entry))} placeholder="KEY" />
                          <input className="input h-11 bg-paw-raised/20 font-mono text-xs" value={row.value} onChange={(event) => setEnvRows((current) => current.map((entry) => entry.id === row.id ? { ...entry, value: event.target.value } : entry))} placeholder="Value" />
                          <button type="button" className="w-11 h-11 flex items-center justify-center rounded-xl bg-paw-raised/30 border border-paw-border hover:bg-paw-danger-bg hover:text-paw-danger hover:border-paw-danger/30 transition-all" onClick={() => setEnvRows((current) => current.length === 1 ? [blankPair()] : current.filter((entry) => entry.id !== row.id))}>
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'sse' && (
                <div className="space-y-6 animate-slide-up">
                  <label className="block space-y-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-paw-faint">SSE Stream Endpoint</span>
                    <input className="input h-12 bg-paw-raised/30" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://mcp.instance.io/sse" />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-paw-faint">Identity Token (Bearer)</span>
                    <input className="input h-12 bg-paw-raised/30" type="password" value={authToken} onChange={(event) => setAuthToken(event.target.value)} placeholder="Optional security token..." />
                  </label>
                </div>
              )}

              {tab === 'http' && (
                <div className="space-y-6 animate-slide-up">
                  <label className="block space-y-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-paw-faint">Remote Root URL</span>
                    <input className="input h-12 bg-paw-raised/30" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://api.mcp-provider.com" />
                  </label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-paw-border-subtle pb-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-paw-faint">Custom Negotiated Headers</span>
                      <button type="button" className="text-[10px] font-bold text-paw-accent hover:underline flex items-center gap-1" onClick={() => setHeaderRows((current) => [...current, blankPair()])}>
                        <Plus size={12} /> Add Header
                      </button>
                    </div>
                    <div className="space-y-3">
                      {headerRows.map((row) => (
                        <div key={row.id} className="grid gap-3 md:grid-cols-[1fr_1fr_44px] animate-slide-in">
                          <input className="input h-11 bg-paw-raised/20 font-mono text-xs" value={row.key} onChange={(event) => setHeaderRows((current) => current.map((entry) => entry.id === row.id ? { ...entry, key: event.target.value } : entry))} placeholder="Header-Key" />
                          <input className="input h-11 bg-paw-raised/20 font-mono text-xs" value={row.value} onChange={(event) => setHeaderRows((current) => current.map((entry) => entry.id === row.id ? { ...entry, value: event.target.value } : entry))} placeholder="X-Value" />
                          <button type="button" className="w-11 h-11 flex items-center justify-center rounded-xl bg-paw-raised/30 border border-paw-border hover:bg-paw-danger-bg hover:text-paw-danger hover:border-paw-danger/30 transition-all" onClick={() => setHeaderRows((current) => current.length === 1 ? [blankPair()] : current.filter((entry) => entry.id !== row.id))}>
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-paw-border-subtle mt-4">
            <button type="button" className="h-11 px-6 rounded-xl font-bold text-xs uppercase tracking-widest text-paw-faint hover:text-paw-muted transition-colors" onClick={() => setModalOpen(false)}>
              Discard
            </button>
            <button type="button" className="h-11 px-8 rounded-xl bg-paw-accent text-white font-bold text-xs uppercase tracking-widest shadow-glow hover:bg-paw-accent-h active:scale-95 transition-all disabled:opacity-50" onClick={() => void submit()} disabled={submitting}>
              {submitting ? 'Negotiating...' : editing ? 'Update Connection' : 'Establish Link'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={testOpen} onClose={() => setTestOpen(false)} title={testTarget ? `Probe: ${testTarget.name}` : 'Node Analysis'}>
        <div className="space-y-6">
          {testing ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border-2 border-paw-accent border-t-transparent animate-spin" />
                <span className="text-sm font-bold text-paw-text tracking-tight">Initiating protocol handshake...</span>
              </div>
              <div className="space-y-2 pl-7">
                <div className="h-2 w-full animate-pulse rounded bg-paw-raised" />
                <div className="h-2 w-4/5 animate-pulse rounded bg-paw-raised" />
                <div className="h-2 w-2/3 animate-pulse rounded bg-paw-raised" />
              </div>
            </div>
          ) : testResult ? (
            <div className="animate-slide-up space-y-6">
              <div className={`p-4 rounded-2xl border flex items-center gap-4 ${testResult.ok ? 'bg-paw-success-bg border-paw-success/20' : 'bg-paw-danger-bg border-paw-danger/20'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${testResult.ok ? 'bg-paw-success text-white' : 'bg-paw-danger text-white'}`}>
                  {testResult.ok ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                </div>
                <div>
                  <div className={`text-sm font-bold ${testResult.ok ? 'text-paw-success' : 'text-paw-danger'}`}>
                    {testResult.ok ? 'Handshake Successful' : 'Protocol Violation'}
                  </div>
                  <div className="text-xs text-paw-muted opacity-80 mt-0.5">{testResult.message ?? 'No additional diagnostics returned.'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-paw-raised/30 border border-paw-border rounded-2xl p-4">
                  <div className="text-[10px] font-bold text-paw-faint uppercase tracking-widest mb-1">Latency</div>
                  <div className="text-xl font-mono font-bold text-paw-text">{testResult.responseTimeMs ?? 0}<span className="text-xs ml-1 opacity-50">ms</span></div>
                </div>
                <div className="bg-paw-raised/30 border border-paw-border rounded-2xl p-4">
                  <div className="text-[10px] font-bold text-paw-faint uppercase tracking-widest mb-1">Capabilities</div>
                  <div className="text-xl font-mono font-bold text-paw-text">{(testResult.tools ?? []).length}</div>
                </div>
              </div>

              {testResult.ok && (testResult.tools ?? []).length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-paw-faint">Exposed Functions</div>
                  <div className="grid gap-2 grid-cols-2">
                    {(testResult.tools ?? []).map((tool) => (
                      <div key={tool} className="flex items-center gap-2 bg-paw-surface border border-paw-border px-3 py-2 rounded-xl">
                        <div className="w-1.5 h-1.5 rounded-full bg-paw-accent" />
                        <span className="text-xs font-mono font-medium text-paw-text truncate">{tool}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button type="button" className="btn-secondary w-full h-11 justify-center rounded-xl" onClick={() => setTestOpen(false)}>
                Close Probe
              </button>
            </div>
          ) : (
            <div className="text-center py-12 text-paw-faint">
              <AlertTriangle size={32} className="mx-auto mb-4 opacity-10" />
              <p className="text-sm font-bold uppercase tracking-widest">Diagnostic unavailable</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
