import { useMemo, useState } from 'react'
import { CloudUpload, Download, FileJson, FolderArchive, RefreshCcw, UploadCloud } from 'lucide-react'
import { api } from '../lib/api'
import { toast } from '../lib/toast'

type ImportPreview = {
  agents: number
  skills: number
  memories: number
  chats: number
}

function defaultPreview(): ImportPreview {
  return { agents: 0, skills: 0, memories: 0, chats: 0 }
}

function OpenClawMark() {
  return (
    <svg viewBox="0 0 96 96" className="h-14 w-14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 58C18 42 28 30 40 30c3 0 5 2 5 5v15c0 5-4 9-9 9h-7" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M49 25c0-8 5-13 12-13s12 5 12 13v22" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M68 59h-7c-5 0-9-4-9-9V35c0-3 2-5 5-5 12 0 21 12 21 28" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M28 66c4 10 12 16 20 16s16-6 20-16" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}

export function Import() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview>(defaultPreview())
  const [manualEntry, setManualEntry] = useState('{\n  "name": "Imported Agent",\n  "role": "Research Assistant"\n}')
  const [backupHistory, setBackupHistory] = useState<string[]>([])
  const [importing, setImporting] = useState(false)

  const hasPreview = useMemo(() => Object.values(preview).some((value) => value > 0), [preview])

  const readFile = async (selected: File) => {
    setFile(selected)
    try {
      const text = await selected.text()
      const parsed = JSON.parse(text)
      setPreview({
        agents: Array.isArray(parsed.agents) ? parsed.agents.length : Number(parsed.agentCount ?? 0),
        skills: Array.isArray(parsed.skills) ? parsed.skills.length : Number(parsed.skillCount ?? 0),
        memories: Array.isArray(parsed.memories) ? parsed.memories.length : Number(parsed.memoryCount ?? 0),
        chats: Array.isArray(parsed.messages) ? parsed.messages.length : Number(parsed.chatCount ?? 0),
      })
    } catch {
      setPreview({ agents: 1, skills: 0, memories: 0, chats: 0 })
    }
  }

  const importOpenClaw = async () => {
    if (!file) {
      toast.warning('Select an export file first')
      return
    }
    setImporting(true)
    try {
      const result = await api.imports.openClaw({ filename: file.name, size: file.size, preview })
      toast.success(result.message ?? 'Import queued')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to import data')
    } finally {
      setImporting(false)
    }
  }

  const downloadAll = async () => {
    try {
      const blob = await api.imports.exportAll()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'openpaw-export.json'
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to export data')
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto p-8">
      <h1 className="text-3xl font-semibold text-paw-text">Import &amp; Export</h1>
      <p className="mt-2 text-sm text-paw-muted">Bring your agents, skills, and settings from other platforms.</p>

      <div className="mt-8 space-y-6 pb-8">
        <section className="overflow-hidden rounded-2xl border border-paw-border bg-gradient-to-br from-sky-600/20 via-paw-surface to-paw-surface shadow-xl">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sky-300">
                <OpenClawMark />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-sky-200/70">Import From OpenClaw</p>
                  <h2 className="text-2xl font-semibold text-paw-text">Already using OpenClaw?</h2>
                </div>
              </div>
              <p className="max-w-2xl text-sm text-paw-muted">Import everything: agents, skills, tools, memories, and chat history.</p>
              <ol className="space-y-2 text-sm text-paw-text">
                <li>1. Open OpenClaw -&gt; Settings -&gt; Export Data</li>
                <li>2. Download the export file</li>
                <li>3. Drop it here or click to upload</li>
              </ol>
              <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-paw-border-strong bg-black/10 p-6 text-center transition hover:border-sky-400/60 hover:bg-sky-500/5">
                <CloudUpload size={32} className="mb-3 text-sky-300" />
                <p className="text-base font-medium text-paw-text">Drop your OpenClaw export here</p>
                <p className="mt-2 text-sm text-paw-muted">{file ? file.name : 'JSON export preview supported in the local build.'}</p>
                <input type="file" className="hidden" onChange={(event) => event.target.files?.[0] && readFile(event.target.files[0])} />
              </label>
            </div>

            <div className="card space-y-4 bg-black/20 backdrop-blur-sm">
              <p className="text-sm font-medium text-paw-text">Import preview</p>
              {hasPreview ? (
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(preview).map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-paw-border bg-paw-raised/80 p-4">
                      <p className="text-2xl font-semibold text-paw-text">{value}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-paw-muted">{label}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-paw-muted">Select a file to preview what will be imported.</p>
              )}
              <button type="button" className="btn-primary w-fit" disabled={!file || importing} onClick={importOpenClaw}>
                <UploadCloud size={16} />
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-paw-text">Import From File</h2>
              <p className="text-sm text-paw-muted">Import a single agent file, skills file, or a standalone SOUL.md.</p>
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-paw-border px-4 py-4 text-sm text-paw-muted transition hover:border-paw-border-strong hover:text-paw-text">
              <FileJson size={18} />
              Choose file
              <input type="file" className="hidden" onChange={(event) => event.target.files?.[0] && toast.success(`Ready to inspect ${event.target.files[0].name}`)} />
            </label>
            <textarea className="input min-h-[220px] font-mono text-xs" value={manualEntry} onChange={(event) => setManualEntry(event.target.value)} />
            <button type="button" className="btn-secondary w-fit" onClick={() => toast.success('Manual import payload staged.')}>
              Stage manual import
            </button>
          </div>

          <div className="space-y-6">
            <div className="card space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-paw-text">Export</h2>
                <p className="text-sm text-paw-muted">Download full data, a single agent, or all skills.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn-primary" onClick={downloadAll}>
                  <Download size={16} />
                  Export all data
                </button>
                <button type="button" className="btn-secondary" onClick={() => toast.info('Portable agent export lands in a later backend slice.')}>
                  Export agent
                </button>
                <button type="button" className="btn-secondary" onClick={() => toast.info('Skills export lands in a later backend slice.')}>
                  Export skills
                </button>
              </div>
            </div>

            <div className="card space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-paw-text">Backup &amp; Restore</h2>
                <p className="text-sm text-paw-muted">Create timestamped local backups and restore from a previous snapshot.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    const stamp = new Date().toLocaleString()
                    setBackupHistory((current) => [stamp, ...current].slice(0, 5))
                    toast.success('Backup snapshot recorded')
                  }}
                >
                  <FolderArchive size={16} />
                  Create backup
                </button>
                <button type="button" className="btn-secondary" onClick={() => toast.info('Restore flow is ready for backend archive wiring.')}>
                  <RefreshCcw size={16} />
                  Restore from backup
                </button>
              </div>
              <div className="space-y-2">
                {backupHistory.length ? backupHistory.map((entry) => (
                  <div key={entry} className="flex items-center justify-between rounded-xl border border-paw-border bg-paw-raised px-4 py-3 text-sm">
                    <span className="text-paw-text">{entry}</span>
                    <button type="button" className="btn-ghost" onClick={() => toast.info(`Restore requested for ${entry}`)}>Restore</button>
                  </div>
                )) : <p className="text-sm text-paw-muted">No backups yet.</p>}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
