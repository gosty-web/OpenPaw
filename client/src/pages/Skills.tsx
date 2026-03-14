import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import { BookText, Download, Eye, FilePlus2, Search, Trash2, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Modal } from '../components/Modal'
import { api, type Skill } from '../lib/api'
import { toast } from '../lib/toast'

type SkillCategory = 'All' | 'Coding' | 'Writing' | 'Research' | 'Productivity' | 'Custom'

type SkillForm = {
  name: string
  category: Exclude<SkillCategory, 'All'>
  description: string
  tags: string
  content: string
}

const editorTheme = EditorView.theme({
  '&': { backgroundColor: 'transparent', color: '#fafafa', fontFamily: '"JetBrains Mono", monospace' },
  '.cm-content': { caretColor: '#8b5cf6' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#8b5cf6' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: 'rgba(124,58,237,0.24)' },
  '.cm-lineNumbers .cm-gutterElement': { color: '#71717a' },
})

const categories: SkillCategory[] = ['All', 'Coding', 'Writing', 'Research', 'Productivity', 'Custom']

const blankForm = (): SkillForm => ({
  name: '',
  category: 'Custom',
  description: '',
  tags: '',
  content: '# New Skill\n\nDescribe the workflow, context, and step-by-step instructions your agents should follow.\n',
})

function formatBytes(size?: number) {
  const value = size ?? 0
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function relative(value?: string) {
  return value ? formatDistanceToNow(new Date(value), { addSuffix: true }) : 'Just now'
}

function previewLine(content?: string) {
  return content?.replace(/^#.*$/gm, '').replace(/\s+/g, ' ').trim() ?? ''
}

export function Skills() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<SkillCategory>('All')
  const [viewing, setViewing] = useState<Skill | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Skill | null>(null)
  const [form, setForm] = useState<SkillForm>(blankForm)
  const [saving, setSaving] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importName, setImportName] = useState('')
  const [importCategory, setImportCategory] = useState<Exclude<SkillCategory, 'All'>>('Research')
  const [importTags, setImportTags] = useState('')
  const [importPreview, setImportPreview] = useState('')
  const [importSourceUrl, setImportSourceUrl] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    api.skills
      .list()
      .then(setSkills)
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load skills'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const trimmed = importUrl.trim()
    if (!importOpen || !/^https?:\/\//i.test(trimmed)) {
      return
    }

    const timeout = window.setTimeout(() => {
      setPreviewLoading(true)
      api.skills
        .previewImport(trimmed)
        .then((preview) => {
          setImportPreview(preview.content)
          setImportName((current) => current || preview.name)
          setImportSourceUrl(preview.sourceUrl)
        })
        .catch((error) => {
          setImportPreview('')
          toast.error(error instanceof Error ? error.message : 'Unable to fetch preview')
        })
        .finally(() => setPreviewLoading(false))
    }, 450)

    return () => window.clearTimeout(timeout)
  }, [importOpen, importUrl])

  const filteredSkills = useMemo(() => {
    const query = search.trim().toLowerCase()
    return skills.filter((skill) => {
      if (category !== 'All' && skill.category !== category) return false
      if (!query) return true
      const haystack = `${skill.name} ${skill.description ?? ''} ${(skill.tags ?? []).join(' ')}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [category, search, skills])

  const openCreate = () => {
    setEditing(null)
    setForm(blankForm())
    setCreateOpen(true)
  }

  const openEdit = (skill: Skill) => {
    setEditing(skill)
    setForm({
      name: skill.name,
      category: skill.category ?? 'Custom',
      description: skill.description ?? '',
      tags: (skill.tags ?? []).join(', '),
      content: skill.content ?? '',
    })
    setCreateOpen(true)
    setViewing(null)
  }

  const upsertSkill = (nextSkill: Skill) => {
    setSkills((current) => {
      const index = current.findIndex((entry) => entry.id === nextSkill.id)
      if (index === -1) return [nextSkill, ...current]
      const copy = [...current]
      copy[index] = nextSkill
      return copy
    })
  }

  const submitCustomSkill = async () => {
    if (!form.name.trim() || !form.content.trim()) {
      toast.warning('Name and content are required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim(),
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        content: form.content,
      }
      const result = editing ? await api.skills.update(editing.id, payload) : await api.skills.create(payload)
      upsertSkill(result)
      setCreateOpen(false)
      toast.success(editing ? 'Skill updated' : 'Skill created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save skill')
    } finally {
      setSaving(false)
    }
  }

  const submitImport = async () => {
    if (!importUrl.trim() || !importName.trim() || !importPreview.trim()) {
      toast.warning('URL, name, and preview content are required')
      return
    }

    setImporting(true)
    try {
      const created = await api.skills.importFromUrl({
        url: importUrl.trim(),
        name: importName.trim(),
        category: importCategory,
        tags: importTags.split(',').map((tag) => tag.trim()).filter(Boolean),
        content: importPreview,
        description: previewLine(importPreview).slice(0, 140),
      })
      upsertSkill(created)
      setImportOpen(false)
      setImportUrl('')
      setImportName('')
      setImportTags('')
      setImportPreview('')
      setImportSourceUrl('')
      toast.success('Skill imported')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to import skill')
    } finally {
      setImporting(false)
    }
  }

  const toggleSkill = async (skill: Skill) => {
    try {
      const updated = await api.skills.toggle(skill.id, !(skill.enabled ?? true))
      upsertSkill(updated)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to toggle skill')
    }
  }

  const deleteSkill = async (skill: Skill) => {
    try {
      await api.skills.delete(skill.id)
      setSkills((current) => current.filter((entry) => entry.id !== skill.id))
      if (viewing?.id === skill.id) {
        setViewing(null)
      }
      toast.success(`${skill.name} deleted`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete skill')
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="relative overflow-hidden rounded-2xl border border-paw-border bg-paw-surface p-6 shadow-sm shadow-black/5">
          <div className="relative z-10 flex items-start gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-paw-accent/10 text-paw-accent">
              <BookText size={24} />
            </div>
            <div>
              <h2 className="text-base font-medium text-paw-text">Instructional Intelligence</h2>
              <p className="mt-1 text-sm leading-relaxed text-paw-muted">Skills are persistent instruction layers that define your agent's domain expertise, behavioral patterns, and multi-step workflows.</p>
            </div>
          </div>
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-paw-accent/5 blur-3xl" />
        </div>

        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h1 className="text-[clamp(1.75rem,1.4rem+1vw,2.2rem)] font-semibold tracking-tight text-paw-text">Skills</h1>
              <span className="badge bg-paw-raised text-paw-muted">{skills.length} total</span>
            </div>
            <p className="max-w-2xl text-sm text-paw-muted">Build a reusable skill library your agents can load for coding, writing, research, and custom workflows.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => setImportOpen(true)}>
              <Download size={16} />
              Import from GitHub
            </button>
            <button type="button" className="btn-primary" onClick={openCreate}>
              <FilePlus2 size={16} />
              Create Skill
            </button>
          </div>
        </header>

        <section className="flex flex-col gap-4 rounded-2xl border border-paw-border bg-paw-surface/50 p-2 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paw-faint" />
            <input 
              className="input w-full border-none bg-transparent pl-10 shadow-none focus:ring-0" 
              value={search} 
              onChange={(event) => setSearch(event.target.value)} 
              placeholder="Search library..." 
            />
          </label>
          <div className="flex flex-wrap gap-1 p-1 sm:border-l sm:border-paw-border sm:pl-4">
            {categories.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  category === value 
                    ? 'bg-paw-accent-bg text-paw-accent' 
                    : 'text-paw-muted hover:bg-paw-raised hover:text-paw-text'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="rounded-xl border border-paw-border bg-paw-surface p-5">
                <div className="mb-3 h-5 w-2/3 animate-pulse rounded bg-paw-raised" />
                <div className="mb-2 h-4 w-full animate-pulse rounded bg-paw-raised" />
                <div className="mb-4 h-4 w-5/6 animate-pulse rounded bg-paw-raised" />
                <div className="h-10 animate-pulse rounded bg-paw-raised" />
              </div>
            ))}
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-paw-border bg-paw-surface px-6 text-center">
            <BookText size={42} className="mb-4 text-paw-faint opacity-20" />
            <h3 className="mb-2 text-lg font-semibold text-paw-text">No skills yet</h3>
            <p className="max-w-md text-sm leading-7 text-paw-muted">Create your first skill or import one from GitHub to start building a reusable instruction library for your agents.</p>
          </div>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSkills.map((skill) => (
              <article key={skill.id} className="group relative flex flex-col rounded-2xl border border-paw-border bg-paw-surface p-5 transition-all hover:border-paw-accent/30 hover:shadow-lg hover:shadow-black/10">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-paw-text">{skill.name}</h3>
                    <div className="mt-1 flex items-center gap-2">
                       <span className="inline-flex items-center rounded-md bg-paw-accent/10 px-2 py-0.5 text-xs font-medium text-paw-accent">
                        {skill.category ?? 'Custom'}
                      </span>
                      {skill.sourceType === 'github' && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-paw-faint">
                          <Download size={10} /> GitHub
                        </span>
                      )}
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => void toggleSkill(skill)} 
                    className={`h-6 w-11 shrink-0 rounded-full p-1 transition-colors ${
                      skill.enabled !== false ? 'bg-paw-success' : 'bg-paw-raised'
                    }`}
                  >
                    <div className={`h-4 w-4 transform rounded-full bg-white transition-transform ${
                      skill.enabled !== false ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                <p className="mb-4 line-clamp-3 min-h-[4.5rem] text-sm leading-relaxed text-paw-muted">
                  {skill.description || previewLine(skill.content) || 'Define clear instructions for specialized agent tasks.'}
                </p>

                <div className="flex flex-wrap gap-2">
                  {(skill.tags ?? []).slice(0, 3).map((tag) => (
                    <span key={tag} className="text-[10px] font-medium uppercase tracking-wider text-paw-faint">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-paw-border pt-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-tighter text-paw-faint">Updated</span>
                    <span className="text-xs text-paw-muted">{relative(skill.updatedAt)}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button 
                      type="button" 
                      className="btn-secondary h-8 w-8 !p-0" 
                      onClick={() => setViewing(skill)}
                      title="View Details"
                    >
                      <Eye size={14} />
                    </button>
                    <button 
                      type="button" 
                      className="btn-ghost h-8 w-8 !p-0 text-paw-danger hover:bg-paw-danger-bg hover:text-paw-danger" 
                      onClick={() => void deleteSkill(skill)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>

      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing?.name ?? 'View Skill'}>
        {viewing && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge bg-paw-accent-bg text-paw-accent">{viewing.category ?? 'Custom'}</span>
              <span className="badge bg-paw-raised text-paw-muted">{viewing.sourceType === 'github' ? 'GitHub' : 'Custom'}</span>
              <span className="text-xs text-paw-faint">Updated {relative(viewing.updatedAt)}</span>
            </div>
            {(viewing.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {viewing.tags?.map((tag) => (
                  <span key={tag} className="badge bg-paw-raised text-paw-muted">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="rounded-2xl border border-paw-border bg-paw-bg p-5">
              <div className="prose prose-invert max-w-none prose-p:text-paw-muted prose-headings:text-paw-text prose-strong:text-paw-text prose-code:text-paw-accent prose-pre:bg-paw-surface prose-pre:border prose-pre:border-paw-border">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewing.content ?? ''}</ReactMarkdown>
              </div>
            </div>
            <div className="grid gap-3 rounded-2xl border border-paw-border bg-paw-bg p-4 text-sm text-paw-muted md:grid-cols-3">
              <div><div className="mb-1 text-xs uppercase tracking-[0.16em] text-paw-faint">Source</div><div className="truncate">{viewing.sourceType === 'github' ? viewing.sourceUrl : 'Custom'}</div></div>
              <div><div className="mb-1 text-xs uppercase tracking-[0.16em] text-paw-faint">Created</div><div>{relative(viewing.createdAt)}</div></div>
              <div><div className="mb-1 text-xs uppercase tracking-[0.16em] text-paw-faint">Size</div><div>{formatBytes(viewing.size)}</div></div>
            </div>
            {viewing.sourceType === 'custom' && (
              <div className="flex justify-end">
                <button type="button" className="btn-primary" onClick={() => openEdit(viewing)}>
                  <FilePlus2 size={16} />
                  Edit
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Import from GitHub">
        <div className="space-y-4">
          <label className="block">
            <span className="label">URL</span>
            <input className="input" value={importUrl} onChange={(event) => { setImportUrl(event.target.value); setImportName(''); }} placeholder="https://github.com/.../blob/main/CLAUDE.md" />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="label">Name</span>
              <input className="input" value={importName} onChange={(event) => setImportName(event.target.value)} />
            </label>
            <label className="block">
              <span className="label">Category</span>
              <select className="input" value={importCategory} onChange={(event) => setImportCategory(event.target.value as Exclude<SkillCategory, 'All'>)}>
                {categories.filter((value) => value !== 'All').map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="label">Tags</span>
            <input className="input" value={importTags} onChange={(event) => setImportTags(event.target.value)} placeholder="github, workflow, coding" />
          </label>
          <div className="rounded-2xl border border-paw-border bg-paw-bg p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-paw-text">Preview</div>
              {previewLoading && <div className="text-xs text-paw-faint">Fetching from GitHub...</div>}
            </div>
            {importSourceUrl && <div className="mb-3 truncate text-xs text-paw-faint">{importSourceUrl}</div>}
            {previewLoading ? (
              <div className="space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-paw-raised" />
                <div className="h-4 w-full animate-pulse rounded bg-paw-raised" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-paw-raised" />
              </div>
            ) : importPreview ? (
              <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap rounded-xl border border-paw-border bg-paw-surface p-4 text-xs leading-6 text-paw-muted">{importPreview}</pre>
            ) : (
              <div className="text-sm text-paw-faint">Paste a GitHub file URL or raw URL to load a preview.</div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setImportOpen(false)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={() => void submitImport()} disabled={importing || !importPreview.trim()}>
              <Download size={16} />
              {importing ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={editing ? 'Edit Skill' : 'Create Skill'}>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="label">Name</span>
              <input className="input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="block">
              <span className="label">Category</span>
              <select className="input" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as Exclude<SkillCategory, 'All'> }))}>
                {categories.filter((value) => value !== 'All').map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="label">Description</span>
            <textarea className="input min-h-[88px] resize-y" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <label className="block">
            <span className="label">Tags</span>
            <input className="input" value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} placeholder="coding, review, frontend" />
          </label>
          <div className="rounded-2xl border border-paw-border bg-paw-bg">
            <CodeMirror value={form.content} height="420px" extensions={[markdown()]} theme={editorTheme} onChange={(value) => setForm((current) => ({ ...current, content: value }))} />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={() => void submitCustomSkill()} disabled={saving}>
              <FilePlus2 size={16} />
              {saving ? 'Saving...' : editing ? 'Save Skill' : 'Create Skill'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
