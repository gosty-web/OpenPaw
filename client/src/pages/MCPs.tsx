import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Pencil, Play, Plus, PlugZap, Trash2, X } from 'lucide-react'
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
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h1 className="text-[clamp(1.75rem,1.4rem+1vw,2.2rem)] font-semibold tracking-tight text-paw-text">MCP Connections</h1>
              <span className="badge bg-paw-raised text-paw-muted">{connectedCount} connected</span>
            </div>
            <p className="max-w-2xl text-sm text-paw-muted">Manage the tool servers your agents can reach for when they need filesystem access, search, browser automation, and more.</p>
          </div>
          <button type="button" className="btn-primary self-start lg:self-auto" onClick={openCreate}>
            <Plus size={16} />
            Add MCP
          </button>
        </header>

        <section className="rounded-2xl border border-paw-border bg-paw-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-paw-text">Connected MCPs</h2>
            <span className="text-xs uppercase tracking-[0.18em] text-paw-faint">Live connections</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="h-12 animate-pulse rounded-xl bg-paw-raised" />
              ))}
            </div>
          ) : mcps.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-paw-border bg-paw-bg px-6 text-center">
              <PlugZap size={42} className="mb-4 text-paw-faint opacity-20" />
              <h3 className="mb-2 text-lg font-semibold text-paw-text">No MCPs connected</h3>
              <p className="max-w-md text-sm leading-7 text-paw-muted">Add tools to give your agents superpowers.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {mcps.map((mcp) => {
                const targetText = mcp.transport === 'stdio' ? `${mcp.command ?? ''} ${(mcp.args ?? []).join(' ')}`.trim() : mcp.url ?? ''
                return (
                  <div key={mcp.id} className="grid min-h-12 items-center gap-3 rounded-xl border border-paw-border bg-paw-bg px-4 py-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]" title={targetText}>
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${statusDot(mcp.status)}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-paw-text">{mcp.name}</span>
                          <span className={`badge ${transportBadge(mcp.transport)}`}>{mcp.transport ?? 'stdio'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm text-paw-muted">{targetText || 'No target configured yet'}</div>
                      <div className="mt-1 text-xs text-paw-faint">{formatCount(mcp.agentCount)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => void toggleEnabled(mcp)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${mcp.enabled !== false ? 'bg-paw-success-bg text-paw-success' : 'bg-paw-raised text-paw-muted'}`}>
                        {mcp.enabled !== false ? 'Enabled' : 'Disabled'}
                      </button>
                      <button type="button" className="btn-ghost h-9 w-9 justify-center p-0" onClick={() => openEdit(mcp)} aria-label={`Edit ${mcp.name}`}>
                        <Pencil size={15} />
                      </button>
                      <button type="button" className="btn-ghost h-9 w-9 justify-center p-0" onClick={() => void runTest(mcp)} aria-label={`Test ${mcp.name}`}>
                        <Play size={15} />
                      </button>
                      <button type="button" className="btn-ghost h-9 w-9 justify-center p-0 text-paw-danger hover:bg-paw-danger-bg hover:text-paw-danger" onClick={() => void removeMcp(mcp)} aria-label={`Delete ${mcp.name}`}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-paw-border bg-paw-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-paw-text">Available to Add</h2>
            <span className="text-xs uppercase tracking-[0.18em] text-paw-faint">Popular starters</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {popularMcps.map((template) => (
              <article key={template.name} className="rounded-2xl border border-paw-border bg-paw-bg p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-paw-text">{template.name}</h3>
                    <p className="mt-1 text-sm text-paw-muted">{template.description}</p>
                  </div>
                  <span className="badge bg-paw-raised text-paw-muted">stdio</span>
                </div>
                <div className="mb-4 text-xs font-mono text-paw-faint">{template.packageName}</div>
                <button type="button" className="btn-secondary w-full justify-center" onClick={() => void createFromTemplate(template)}>
                  Add
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit MCP' : 'Add MCP'}>
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {(['stdio', 'sse', 'http'] as McpTab[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${tab === value ? 'bg-paw-accent-bg text-paw-accent' : 'bg-paw-raised text-paw-muted hover:text-paw-text'}`}
              >
                {value === 'stdio' ? 'stdio' : value.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="label">Name</span>
              <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Filesystem" />
            </label>

            {tab === 'stdio' && (
              <>
                <label className="block">
                  <span className="label">Command</span>
                  <input className="input" value={command} onChange={(event) => setCommand(event.target.value)} placeholder='e.g. npx -y @modelcontextprotocol/server-filesystem /path' />
                </label>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="label mb-0">Args</span>
                    <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => setArgs((current) => [...current, blankArg()])}>
                      <Plus size={12} />
                      Add arg
                    </button>
                  </div>
                  <div className="space-y-2">
                    {args.map((row, index) => (
                      <div key={row.id} className="flex items-center gap-2">
                        <input className="input" value={row.value} onChange={(event) => setArgs((current) => current.map((entry) => entry.id === row.id ? { ...entry, value: event.target.value } : entry))} placeholder={`Argument ${index + 1}`} />
                        <button type="button" className="btn-ghost h-11 w-11 justify-center p-0" onClick={() => setArgs((current) => current.length === 1 ? [blankArg()] : current.filter((entry) => entry.id !== row.id))}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="label mb-0">Env Vars</span>
                    <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => setEnvRows((current) => [...current, blankPair()])}>
                      <Plus size={12} />
                      Add env
                    </button>
                  </div>
                  <div className="space-y-2">
                    {envRows.map((row) => (
                      <div key={row.id} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px]">
                        <input className="input" value={row.key} onChange={(event) => setEnvRows((current) => current.map((entry) => entry.id === row.id ? { ...entry, key: event.target.value } : entry))} placeholder="KEY" />
                        <input className="input" value={row.value} onChange={(event) => setEnvRows((current) => current.map((entry) => entry.id === row.id ? { ...entry, value: event.target.value } : entry))} placeholder="value" />
                        <button type="button" className="btn-ghost h-11 w-11 justify-center p-0" onClick={() => setEnvRows((current) => current.length === 1 ? [blankPair()] : current.filter((entry) => entry.id !== row.id))}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {tab === 'sse' && (
              <>
                <label className="block">
                  <span className="label">URL</span>
                  <input className="input" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://mcp.example.com/sse" />
                </label>
                <label className="block">
                  <span className="label">Auth Token</span>
                  <input className="input" value={authToken} onChange={(event) => setAuthToken(event.target.value)} placeholder="Optional bearer token" />
                </label>
              </>
            )}

            {tab === 'http' && (
              <>
                <label className="block">
                  <span className="label">Base URL</span>
                  <input className="input" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://mcp.example.com" />
                </label>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="label mb-0">Headers</span>
                    <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => setHeaderRows((current) => [...current, blankPair()])}>
                      <Plus size={12} />
                      Add header
                    </button>
                  </div>
                  <div className="space-y-2">
                    {headerRows.map((row) => (
                      <div key={row.id} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px]">
                        <input className="input" value={row.key} onChange={(event) => setHeaderRows((current) => current.map((entry) => entry.id === row.id ? { ...entry, key: event.target.value } : entry))} placeholder="Header" />
                        <input className="input" value={row.value} onChange={(event) => setHeaderRows((current) => current.map((entry) => entry.id === row.id ? { ...entry, value: event.target.value } : entry))} placeholder="Value" />
                        <button type="button" className="btn-ghost h-11 w-11 justify-center p-0" onClick={() => setHeaderRows((current) => current.length === 1 ? [blankPair()] : current.filter((entry) => entry.id !== row.id))}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-paw-border bg-paw-bg p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-paw-faint">Popular MCPs</h3>
              <span className="text-xs text-paw-faint">Quick add</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {popularMcps.map((template) => (
                <div key={template.name} className="rounded-xl border border-paw-border bg-paw-surface p-3">
                  <div className="font-medium text-paw-text">{template.name}</div>
                  <div className="mt-1 text-xs text-paw-muted">{template.description}</div>
                  <button type="button" className="btn-ghost mt-3 px-2 py-1 text-xs text-paw-text" onClick={() => void createFromTemplate(template)}>
                    <Plus size={12} />
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={() => void submit()} disabled={submitting}>
              <Plus size={16} />
              {submitting ? 'Saving...' : tab === 'stdio' ? 'Install & Test' : editing ? 'Save MCP' : 'Add MCP'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={testOpen} onClose={() => setTestOpen(false)} title={testTarget ? `Test ${testTarget.name}` : 'Test MCP'}>
        <div className="space-y-4">
          {testing ? (
            <div className="space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-paw-raised" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-paw-raised" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-paw-raised" />
            </div>
          ) : testResult ? (
            <>
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${testResult.ok ? 'bg-paw-success-bg text-paw-success' : 'bg-paw-danger-bg text-paw-danger'}`}>
                {testResult.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                {testResult.ok ? 'Connection healthy' : 'Connection issue'}
              </div>
              <div className="rounded-xl border border-paw-border bg-paw-bg p-4 text-sm text-paw-muted">
                <div className="mb-2 text-paw-text">{testResult.message ?? 'No message returned'}</div>
                <div className="text-xs text-paw-faint">Response time: {testResult.responseTimeMs ?? 0}ms</div>
              </div>
              <div>
                <div className="mb-2 text-sm font-semibold text-paw-text">Available tools</div>
                <div className="flex flex-wrap gap-2">
                  {(testResult.tools ?? []).map((tool) => (
                    <span key={tool} className="badge bg-paw-raised text-paw-muted">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-paw-muted">No test result yet.</div>
          )}
        </div>
      </Modal>
    </div>
  )
}
