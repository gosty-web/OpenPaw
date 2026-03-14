import { useRef, useState } from 'react'
import { Download, History, Plus, RotateCcw, UploadCloud } from 'lucide-react'
import { clsx } from 'clsx'

const OpenClawIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
    <path d="M12 3v10" />
    <path d="M12 13 8 9" />
    <path d="M12 13l4-4" />
    <path d="M5 11c0 3.87 3.13 7 7 7s7-3.13 7-7" />
    <path d="M12 18v3" />
    <path d="M8 21h8" />
  </svg>
)

export function Import() {
  const [dragActive, setDragActive] = useState(false)
  const [importPreview, setImportPreview] = useState<null | { agents: number; skills: number; history: boolean }>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true)
    } else if (event.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      setImportPreview({ agents: 12, skills: 45, history: true })
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-8 animate-fade-in">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="relative overflow-hidden rounded-2xl border border-paw-border bg-paw-surface p-8 shadow-sm shadow-black/5">
          <div className="relative z-10 flex items-start gap-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-paw-accent/10 text-paw-accent">
              <History size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-paw-text">Data & Synchronization</h1>
              <p className="mt-2 text-sm leading-relaxed text-paw-muted text-pretty max-w-2xl">Seamlessly migrate your agents, skills, and session history between distinct OpenPaw instances. Manage automated cloud backups and architectural snapshots.</p>
            </div>
          </div>
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-paw-accent/5 blur-3xl" />
        </header>

        <section className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 to-violet-600/10 p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-paw-accent text-white">
              <OpenClawIcon />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-paw-text">Import from OpenClaw</h2>
              <p className="mt-2 text-sm text-paw-muted">Bring agents, skills, tools, memories, and chat history from OpenClaw.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {[
              'Export from legacy instance settings',
              'Download the structural payload (.zip)',
              'Synchronize by dropping here',
            ].map((step, index) => (
              <div key={step} className="group flex items-center gap-4 rounded-2xl border border-paw-border bg-paw-bg px-5 py-4 text-sm transition-all hover:border-paw-accent/30 hover:shadow-lg hover:shadow-black/5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-paw-accent text-[11px] font-black text-white group-hover:scale-110 transition-transform">
                  {index + 1}
                </span>
                <span className="font-medium text-paw-text">{step}</span>
              </div>
            ))}
          </div>

          <div
            className={clsx(
              'mt-6 cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-all',
              dragActive ? 'border-paw-accent bg-paw-accent-bg' : 'border-paw-border hover:border-paw-accent/50 hover:bg-paw-accent/5',
            )}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" className="hidden" accept=".zip" />
            <UploadCloud className="mx-auto h-8 w-8 text-paw-faint" />
            <p className="mt-3 text-sm text-paw-text">Drop your OpenClaw export here</p>
            <p className="mt-1 text-xs text-paw-faint">or click to choose file</p>

            {importPreview && (
              <div className="mt-6 rounded-xl border border-paw-border bg-paw-raised p-5 text-left">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-paw-faint">Agents</div>
                    <div className="mt-1 text-lg font-semibold text-paw-text">{importPreview.agents}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-paw-faint">Skills</div>
                    <div className="mt-1 text-lg font-semibold text-paw-text">{importPreview.skills}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-paw-faint">History</div>
                    <div className="mt-1 text-lg font-semibold text-paw-success">{importPreview.history ? 'Included' : 'None'}</div>
                  </div>
                </div>
                <button className="btn-primary mt-4 w-full justify-center">Import data</button>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="group relative rounded-3xl border border-paw-border bg-paw-surface p-6 overflow-hidden shadow-sm shadow-black/5 transition-all hover:border-paw-accent/20">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-paw-raised text-paw-accent">
                <Download size={18} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-paw-text leading-none">Export Payload</h3>
                <p className="mt-1.5 text-xs text-paw-muted">Snapshot your local configurations.</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Export All Instance Data', icon: Download },
                { label: 'Agents & Personalities Only', icon: Download },
                { label: 'Extracted Skills & Tools Library', icon: Download },
              ].map((item) => (
                <button key={item.label} className="btn-secondary h-12 w-full justify-between px-5 font-medium hover:border-paw-accent/30 hover:bg-paw-accent/5">
                  {item.label}
                  <item.icon size={16} className="text-paw-faint group-hover:text-paw-accent transition-colors" />
                </button>
              ))}
            </div>
          </div>

          <div className="group relative rounded-3xl border border-paw-border bg-paw-surface p-6 overflow-hidden shadow-sm shadow-black/5 transition-all hover:border-paw-accent/20">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-paw-raised text-paw-accent">
                  <History size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-paw-text leading-none">Backups</h3>
                  <p className="mt-1.5 text-xs text-paw-muted">Point-in-time recovery logs.</p>
                </div>
              </div>
              <button className="btn-primary h-10 px-4 shadow-lg shadow-paw-accent/20">
                <Plus size={16} />
                Create New
              </button>
            </div>
            <div className="space-y-2">
              {[
                { date: 'Mar 14, 2026', time: '10:45 AM', size: '12.4 MB' },
                { date: 'Mar 07, 2026', time: '09:12 PM', size: '11.8 MB' },
                { date: 'Feb 28, 2026', time: '02:30 PM', size: '10.2 MB' },
              ].map((backup) => (
                <div key={backup.date} className="group/item flex items-center justify-between rounded-xl border border-paw-border bg-paw-bg/60 p-3 transition-colors hover:bg-paw-raised/60">
                  <div>
                    <div className="text-xs font-semibold text-paw-text uppercase tracking-tight">{backup.date}</div>
                    <div className="text-[10px] text-paw-faint font-medium">{backup.time} • {backup.size}</div>
                  </div>
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg text-paw-faint transition-colors hover:bg-paw-accent/10 hover:text-paw-accent" title="Restore">
                    <RotateCcw size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
