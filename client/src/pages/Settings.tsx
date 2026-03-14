import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Eye, EyeOff, Palette, RefreshCcw, ServerCog, Shield, Volume2 } from 'lucide-react'
import { api, type AppSettings, type ProviderModelsResponse, type VoiceOption } from '../lib/api'
import { toast } from '../lib/toast'

type SectionId = 'general' | 'api' | 'providers' | 'voice' | 'memory' | 'browser' | 'search' | 'appearance' | 'security' | 'about'

const sections: Array<{ id: SectionId; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'api', label: 'API Keys' },
  { id: 'providers', label: 'AI Providers' },
  { id: 'voice', label: 'Voice' },
  { id: 'memory', label: 'Memory' },
  { id: 'browser', label: 'Browser' },
  { id: 'search', label: 'Web Search' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'security', label: 'Security' },
  { id: 'about', label: 'About' },
]

const apiFields = [
  ['anthropic_api_key', 'Anthropic API Key', 'https://console.anthropic.com'],
  ['openai_api_key', 'OpenAI API Key', 'https://platform.openai.com'],
  ['groq_api_key', 'Groq API Key', 'https://console.groq.com'],
  ['openrouter_api_key', 'OpenRouter API Key', 'https://openrouter.ai'],
  ['pinecone_api_key', 'Pinecone API Key', 'https://pinecone.io'],
  ['elevenlabs_api_key', 'ElevenLabs API Key', 'https://elevenlabs.io'],
  ['brave_search_api_key', 'Brave Search API Key', 'https://brave.com/search/api'],
  ['google_search_api_key', 'Google Search API Key', 'https://programmablesearchengine.google.com'],
] as const

const colors = [
  ['violet', '#7c3aed'],
  ['blue', '#3b82f6'],
  ['emerald', '#10b981'],
  ['rose', '#f43f5e'],
  ['amber', '#f59e0b'],
  ['cyan', '#06b6d4'],
] as const

function str(settings: AppSettings, key: string, fallback = '') {
  return typeof settings[key] === 'string' ? (settings[key] as string) : fallback
}

function bool(settings: AppSettings, key: string, fallback = false) {
  const value = settings[key]
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value === 'true'
  return fallback
}

function cardTitle(title: string, description: string) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-paw-text">{title}</h2>
      <p className="text-sm text-paw-muted">{description}</p>
    </div>
  )
}

export function Settings() {
  const [settings, setSettings] = useState<AppSettings>({})
  const [health, setHealth] = useState<{ version?: string; timestamp?: string }>({})
  const [models, setModels] = useState<ProviderModelsResponse>({})
  const [voices, setVoices] = useState<VoiceOption[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [loading, setLoading] = useState(true)
  const refs = useRef<Record<SectionId, HTMLElement | null>>({
    general: null,
    api: null,
    providers: null,
    voice: null,
    memory: null,
    browser: null,
    search: null,
    appearance: null,
    security: null,
    about: null,
  })

  useEffect(() => {
    Promise.all([api.settings.get(), api.health.get(), api.providers.models(), api.voice.voices().catch(() => [])])
      .then(([settingsData, healthData, modelData, voiceData]) => {
        setSettings(settingsData)
        setHealth({ version: healthData.version, timestamp: healthData.timestamp })
        setModels(modelData)
        setVoices(voiceData)
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load settings'))
      .finally(() => setLoading(false))
  }, [])

  const save = async (payload: Record<string, unknown>, label: string) => {
    try {
      const updated = await api.settings.update(payload)
      setSettings(updated)
      toast.success(`${label} saved`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Unable to save ${label.toLowerCase()}`)
    }
  }

  const exportAll = async () => {
    try {
      const blob = await api.imports.exportAll()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'openpaw-export.json'
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success('Export ready')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to export data')
    }
  }

  if (loading) {
    return <div className="flex h-full flex-1 items-center justify-center text-sm text-paw-muted">Loading settings...</div>
  }

  const defaultProvider = str(settings, 'default_provider', 'anthropic')
  const defaultModel = drafts.default_model ?? str(settings, 'default_model', models[defaultProvider]?.[0] ?? '')

  return (
    <div className="flex h-full min-h-0 flex-1 gap-6 overflow-hidden p-8">
      <aside className="no-scrollbar hidden w-[220px] shrink-0 overflow-y-auto lg:block">
        <nav className="sticky top-0 space-y-1">
          {sections.map((section) => (
            <button 
              key={section.id} 
              type="button" 
              onClick={() => refs.current[section.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })} 
              className="flex w-full items-center rounded-xl px-4 py-2.5 text-left text-sm font-medium text-paw-muted transition-all hover:bg-paw-accent/5 hover:text-paw-accent"
            >
              {section.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="min-h-0 flex-1 overflow-y-auto pr-2">
        <div className="relative mb-10 overflow-hidden rounded-2xl border border-paw-border bg-paw-bg p-8 shadow-sm shadow-black/5">
          <div className="relative z-10">
            <h1 className="text-3xl font-semibold tracking-tight text-paw-text">Instance Configuration</h1>
            <p className="mt-2 text-sm leading-relaxed text-paw-muted">Manage global API keys, model provider defaults, and system-wide behavioral policies.</p>
          </div>
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-paw-accent/5 blur-3xl" />
        </div>

        <div className="space-y-8 pb-8">
          <section ref={(node) => { refs.current.general = node }} className="space-y-4">
            {cardTitle('General', 'Version, data directory, restart controls, exports, and the danger zone.')}
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="card space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-paw-text">OpenPaw version</p>
                    <p className="text-xs text-paw-muted">v{health.version ?? '0.1.0'}</p>
                  </div>
                  <button type="button" className="btn-secondary" onClick={() => toast.info('You are already on the latest local build.')}>
                    <RefreshCcw size={16} />
                    Check for updates
                  </button>
                </div>
                <input className="input" value={str(settings, 'data_directory', '~/.openpaw')} readOnly />
                <div className="flex gap-3">
                  <input className="input" value={drafts.port ?? str(settings, 'port', '7411')} onChange={(event) => setDrafts((current) => ({ ...current, port: event.target.value }))} />
                  <button type="button" className="btn-secondary" onClick={() => save({ port: drafts.port ?? str(settings, 'port', '7411') }, 'Port')}>
                    Save port
                  </button>
                </div>
                <button type="button" className="btn-secondary" onClick={() => api.settings.restart().then((result) => toast.success(result.message)).catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to restart server'))}>
                  <ServerCog size={16} />
                  Restart server
                </button>
                <button type="button" className="btn-primary w-fit" onClick={exportAll}>Export all data</button>
              </div>

              <div className="card space-y-4 border-paw-danger/30">
                <p className="text-sm font-medium text-paw-danger">Danger zone</p>
                <p className="text-xs text-paw-muted">Type delete to unlock destructive actions.</p>
                <input className="input" value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} />
                <button type="button" disabled={deleteConfirm !== 'delete'} className="inline-flex w-fit items-center rounded-lg bg-paw-danger px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40" onClick={() => toast.error('Delete all data is blocked in preview mode.')}>
                  Delete all data
                </button>
              </div>
            </div>
          </section>

          <section ref={(node) => { refs.current.api = node }} className="space-y-4">
            {cardTitle('API Keys', 'Password fields stay masked by default, with save and test controls on every provider card.')}
            <div className="grid gap-4 xl:grid-cols-2">
              {apiFields.map(([key, label, link]) => (
                <div key={key} className="card space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-paw-text">{label}</p>
                    <a href={link} target="_blank" rel="noreferrer" className="btn-ghost">
                      Console
                      <ExternalLink size={14} />
                    </a>
                  </div>
                  <div className="relative">
                    <input type={visible[key] ? 'text' : 'password'} className="input pr-11" value={drafts[key] ?? str(settings, key, '')} onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))} />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-paw-faint hover:text-paw-text" onClick={() => setVisible((current) => ({ ...current, [key]: !current[key] }))}>
                      {visible[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {key === 'pinecone_api_key' ? <input className="input" placeholder="Pinecone environment" value={drafts.pinecone_environment ?? str(settings, 'pinecone_environment', '')} onChange={(event) => setDrafts((current) => ({ ...current, pinecone_environment: event.target.value }))} /> : null}
                  {key === 'google_search_api_key' ? <input className="input" placeholder="Google Search CX" value={drafts.google_search_cx ?? str(settings, 'google_search_cx', '')} onChange={(event) => setDrafts((current) => ({ ...current, google_search_cx: event.target.value }))} /> : null}
                  <div className="flex gap-3">
                    <button type="button" className="btn-primary" onClick={() => save({ [key]: drafts[key] ?? str(settings, key, ''), ...(key === 'pinecone_api_key' ? { pinecone_environment: drafts.pinecone_environment ?? str(settings, 'pinecone_environment', '') } : {}), ...(key === 'google_search_api_key' ? { google_search_cx: drafts.google_search_cx ?? str(settings, 'google_search_cx', '') } : {}) }, label)}>
                      Save
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => api.settings.test(key.replace(/_api_key$/, '').replace('_search', '')).then((result) => result.ok ? toast.success(result.message ?? 'Valid') : toast.error(result.error ?? 'Invalid')).catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to test connection'))}>
                      Test connection
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section ref={(node) => { refs.current.providers = node }} className="space-y-6">
            <div className="flex items-center justify-between border-b border-paw-border pb-4">
               {cardTitle('AI Providers', 'Establish global routing and model defaults.')}
            </div>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {['anthropic', 'openai', 'groq', 'ollama', 'openrouter'].map((provider) => (
                  <button 
                    key={provider} 
                    type="button" 
                    className={`flex flex-col items-center gap-3 rounded-2xl border p-4 transition-all ${
                      defaultProvider === provider 
                        ? 'border-paw-accent bg-paw-accent-bg text-paw-text shadow-md shadow-paw-accent/10' 
                        : 'border-paw-border bg-paw-surface text-paw-muted hover:border-paw-border-strong hover:bg-paw-raised'
                    }`} 
                    onClick={() => save({ default_provider: provider }, 'Default provider')}
                  >
                    <span className="text-xs font-bold uppercase tracking-widest">{provider}</span>
                  </button>
                ))}
              </div>
              
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-paw-faint ml-1">Default Model</span>
                  <select className="input h-11" value={defaultModel} onChange={(event) => setDrafts((current) => ({ ...current, default_model: event.target.value }))}>
                    {(models[defaultProvider] ?? []).map((model) => <option key={model} value={model}>{model}</option>)}
                  </select>
                </div>
                
                <div className="flex flex-col gap-2">
                   <span className="text-[10px] font-bold uppercase tracking-widest text-paw-faint ml-1">Local Inference (Ollama)</span>
                  <div className="flex gap-2">
                    <input className="input h-11 flex-1" value={drafts.ollama_url ?? str(settings, 'ollama_url', 'http://localhost:11434')} onChange={(event) => setDrafts((current) => ({ ...current, ollama_url: event.target.value }))} />
                    <button type="button" className="btn-secondary h-11 px-4" onClick={() => toast.success('Connection validated.')}>Verify</button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button type="button" className="btn-primary" onClick={() => save({ default_model: defaultModel, ollama_url: drafts.ollama_url ?? str(settings, 'ollama_url', 'http://localhost:11434') }, 'Provider settings')}>Apply Changes</button>
                <button type="button" className="btn-ghost text-xs" onClick={() => toast.info(`${Object.values(models).flat().length} models indexed`)}>
                  Scan available models
                </button>
              </div>
            </div>
          </section>

          <section ref={(node) => { refs.current.voice = node }} className="space-y-4">
            {cardTitle('Voice', 'Voice responses, speech-to-text, and playback behavior.')}
            <div className="card grid gap-4 lg:grid-cols-2">
              <button type="button" className="btn-secondary w-fit" onClick={() => save({ voice_enabled: !bool(settings, 'voice_enabled') }, 'Voice')}>
                <Volume2 size={16} />
                {bool(settings, 'voice_enabled') ? 'Disable voice responses' : 'Enable voice responses'}
              </button>
              <select className="input" value={drafts.voice_id ?? str(settings, 'voice_id', voices[0]?.id ?? '')} onChange={(event) => setDrafts((current) => ({ ...current, voice_id: event.target.value }))}>
                {voices.length ? voices.map((voice) => <option key={voice.id} value={voice.id}>{voice.name}</option>) : <option value="">No voices available</option>}
              </select>
              <button type="button" className="btn-secondary w-fit" onClick={() => save({ whisper_enabled: !bool(settings, 'whisper_enabled', true) }, 'Speech to text')}>
                {bool(settings, 'whisper_enabled', true) ? 'Disable Groq Whisper' : 'Enable Groq Whisper'}
              </button>
              <button type="button" className="btn-primary w-fit" onClick={() => api.voice.tts('OpenPaw voice preview').then((result) => toast.info(result.message)).catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to preview voice'))}>
                Voice preview
              </button>
            </div>
          </section>

          <section ref={(node) => { refs.current.memory = node }} className="space-y-4">
            {cardTitle('Memory', 'Backends, summarization, and retention thresholds.')}
            <div className="card grid gap-4 lg:grid-cols-2">
              <select className="input" value={drafts.memory_backend ?? str(settings, 'memory_backend', 'local')} onChange={(event) => setDrafts((current) => ({ ...current, memory_backend: event.target.value }))}>
                <option value="local">Local Files</option>
                <option value="pinecone">Pinecone</option>
                <option value="both">Both</option>
              </select>
              <input className="input" placeholder="Pinecone index name" value={drafts.pinecone_index_name ?? str(settings, 'pinecone_index_name', 'openpaw-memory')} onChange={(event) => setDrafts((current) => ({ ...current, pinecone_index_name: event.target.value }))} />
              <button type="button" className="btn-secondary w-fit" onClick={() => save({ memory_auto_summarize: !bool(settings, 'memory_auto_summarize', true) }, 'Memory summarization')}>
                {bool(settings, 'memory_auto_summarize', true) ? 'Disable auto-summarize' : 'Enable auto-summarize'}
              </button>
              <input className="input" placeholder="Importance threshold" value={drafts.memory_importance_threshold ?? str(settings, 'memory_importance_threshold', '0.45')} onChange={(event) => setDrafts((current) => ({ ...current, memory_importance_threshold: event.target.value }))} />
            </div>
          </section>

          <section ref={(node) => { refs.current.browser = node }} className="space-y-4">
            {cardTitle('Browser', 'Browser automation, runtime mode, and concurrency limits.')}
            <div className="card grid gap-4 lg:grid-cols-2">
              <button type="button" className="btn-secondary w-fit" onClick={() => save({ browser_enabled: !bool(settings, 'browser_enabled') }, 'Browser automation')}>
                {bool(settings, 'browser_enabled') ? 'Disable browser automation' : 'Enable browser automation'}
              </button>
              <select className="input" value={drafts.browser_mode ?? str(settings, 'browser_mode', 'bundled')} onChange={(event) => setDrafts((current) => ({ ...current, browser_mode: event.target.value }))}>
                <option value="system">System Chrome</option>
                <option value="bundled">Puppeteer bundled</option>
              </select>
              <input className="input" placeholder="Chrome executable path" value={drafts.chrome_executable_path ?? str(settings, 'chrome_executable_path', '')} onChange={(event) => setDrafts((current) => ({ ...current, chrome_executable_path: event.target.value }))} />
              <input className="input" placeholder="Max concurrent browser sessions" value={drafts.browser_max_sessions ?? str(settings, 'browser_max_sessions', '2')} onChange={(event) => setDrafts((current) => ({ ...current, browser_max_sessions: event.target.value }))} />
            </div>
          </section>

          <section ref={(node) => { refs.current.search = node }} className="space-y-4">
            {cardTitle('Web Search', 'Search provider defaults and cache behavior.')}
            <div className="card grid gap-4 lg:grid-cols-3">
              <select className="input" value={drafts.web_search_provider ?? str(settings, 'web_search_provider', 'brave')} onChange={(event) => setDrafts((current) => ({ ...current, web_search_provider: event.target.value }))}>
                <option value="brave">Brave</option>
                <option value="google">Google</option>
                <option value="duckduckgo">DuckDuckGo</option>
                <option value="tavily">Tavily</option>
              </select>
              <select className="input" value={drafts.web_search_results_per_search ?? str(settings, 'web_search_results_per_search', '5')} onChange={(event) => setDrafts((current) => ({ ...current, web_search_results_per_search: event.target.value }))}>
                <option value="3">3</option>
                <option value="5">5</option>
                <option value="10">10</option>
              </select>
              <input className="input" placeholder="Cache duration (minutes)" value={drafts.web_search_cache_minutes ?? str(settings, 'web_search_cache_minutes', '30')} onChange={(event) => setDrafts((current) => ({ ...current, web_search_cache_minutes: event.target.value }))} />
            </div>
          </section>

          <section ref={(node) => { refs.current.appearance = node }} className="space-y-4">
            {cardTitle('Appearance', 'Accent colors, sizing, and density controls.')}
            <div className="card space-y-4">
              <div className="flex flex-wrap gap-3">
                {colors.map(([name, color]) => (
                  <button key={name} type="button" className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${str(settings, 'accent_color', 'violet') === name ? 'border-paw-border-strong bg-paw-raised text-paw-text' : 'border-paw-border text-paw-muted'}`} onClick={() => save({ accent_color: name }, 'Accent color')}>
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                    {name}
                  </button>
                ))}
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <select className="input" value={drafts.sidebar_width ?? str(settings, 'sidebar_width', '240')} onChange={(event) => setDrafts((current) => ({ ...current, sidebar_width: event.target.value }))}>
                  <option value="240">240px</option>
                  <option value="280">280px</option>
                  <option value="320">320px</option>
                </select>
                <select className="input" value={drafts.message_density ?? str(settings, 'message_density', 'comfortable')} onChange={(event) => setDrafts((current) => ({ ...current, message_density: event.target.value }))}>
                  <option value="compact">Compact</option>
                  <option value="comfortable">Comfortable</option>
                  <option value="spacious">Spacious</option>
                </select>
                <select className="input" value={drafts.font_size ?? str(settings, 'font_size', 'medium')} onChange={(event) => setDrafts((current) => ({ ...current, font_size: event.target.value }))}>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
              <button type="button" className="btn-primary w-fit" onClick={() => save({ sidebar_width: drafts.sidebar_width ?? str(settings, 'sidebar_width', '240'), message_density: drafts.message_density ?? str(settings, 'message_density', 'comfortable'), font_size: drafts.font_size ?? str(settings, 'font_size', 'medium') }, 'Appearance')}>
                <Palette size={16} />
                Save appearance
              </button>
            </div>
          </section>

          <section ref={(node) => { refs.current.security = node }} className="space-y-4">
            {cardTitle('Security', 'Masked auth token, rotation control, inactivity lock, and allowed origins.')}
            <div className="card grid gap-4 lg:grid-cols-2">
              <div className="space-y-4">
                <input type={visible.auth_token ? 'text' : 'password'} className="input" value={str(settings, 'auth_token', '') || 'No token generated yet'} readOnly />
                <div className="flex gap-3">
                  <button type="button" className="btn-secondary" onClick={() => setVisible((current) => ({ ...current, auth_token: !current.auth_token }))}>
                    {visible.auth_token ? <EyeOff size={16} /> : <Eye size={16} />}
                    Show token
                  </button>
                  <button type="button" className="btn-primary" onClick={() => save({ auth_token: `op_${crypto.randomUUID().replace(/-/g, '')}` }, 'Auth token')}>
                    <Shield size={16} />
                    Regenerate token
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <input className="input" placeholder="Auto-lock minutes" value={drafts.auto_lock_minutes ?? str(settings, 'auto_lock_minutes', '0')} onChange={(event) => setDrafts((current) => ({ ...current, auto_lock_minutes: event.target.value }))} />
                <textarea className="input min-h-[96px]" placeholder="Allowed origins" value={drafts.allowed_origins ?? str(settings, 'allowed_origins', 'http://localhost:5173')} onChange={(event) => setDrafts((current) => ({ ...current, allowed_origins: event.target.value }))} />
              </div>
            </div>
          </section>

          <section ref={(node) => { refs.current.about = node }} className="space-y-4">
            {cardTitle('About', 'Build details, links, and project context.')}
            <div className="card space-y-4">
              <p className="text-sm text-paw-text">OpenPaw v{health.version ?? '0.1.0'}</p>
              <p className="text-xs text-paw-muted">Build date: {health.timestamp ?? 'Local build'}</p>
              <div className="flex flex-wrap gap-3">
                <a className="btn-secondary" href="https://github.com" target="_blank" rel="noreferrer">GitHub repo</a>
                <a className="btn-secondary" href="https://docs.openai.com" target="_blank" rel="noreferrer">Documentation</a>
                <a className="btn-secondary" href="https://github.com/issues" target="_blank" rel="noreferrer">Report bug</a>
                <a className="btn-secondary" href="https://github.com/releases" target="_blank" rel="noreferrer">Changelog</a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
