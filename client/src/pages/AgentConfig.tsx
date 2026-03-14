import { useEffect, useState } from 'react'
import { ArrowLeft, Bot, Link2, Save, Sparkles, Zap } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AgentAvatar, StatusBadge } from '../components/chat/shared'
import { api, type Agent } from '../lib/api'
import { defaultSystemPrompt, ollamaModels, presetModels, providerOptions, taskOverrideKeys, type Provider } from '../lib/agentMeta'
import { toast } from '../lib/toast'

type ConfigTab = 'identity' | 'model' | 'behavior' | 'integrations'

type FormState = {
  name: string
  role: string
  personality: string
  avatarColor: string
  provider: Provider
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
  taskModelOverrides: Record<string, string>
  behavior: {
    proactive: boolean
    voiceResponses: boolean
    webSearch: boolean
    browserAccess: boolean
    canSpawnSubAgents: boolean
  }
  integrationKeys: Record<string, string>
}

const tabs: Array<{ id: ConfigTab; label: string }> = [
  { id: 'identity', label: 'Identity' },
  { id: 'model', label: 'Model' },
  { id: 'behavior', label: 'Behavior' },
  { id: 'integrations', label: 'Integrations' },
]

const keyFields = [
  { key: 'anthropic', label: 'Anthropic API key' },
  { key: 'openai', label: 'OpenAI API key' },
  { key: 'groq', label: 'Groq API key' },
  { key: 'ollama', label: 'Ollama endpoint' },
  { key: 'openrouter', label: 'OpenRouter API key' },
]

const avatarColors = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9']

function makeForm(agent: Agent): FormState {
  const provider = (agent.provider as Provider) || 'Anthropic'
  return {
    name: agent.name,
    role: agent.role || '',
    personality: agent.personality || '',
    avatarColor: agent.avatarColor || '#7c3aed',
    provider,
    model: agent.model || (provider === 'Ollama' ? ollamaModels[0] : provider === 'OpenRouter' ? '' : presetModels[provider][0]),
    temperature: agent.temperature ?? 0.7,
    maxTokens: agent.maxTokens ?? 4096,
    systemPrompt: agent.systemPrompt || defaultSystemPrompt(agent.name, agent.role || ''),
    taskModelOverrides: {
      coding: agent.taskModelOverrides?.coding || agent.model || '',
      research: agent.taskModelOverrides?.research || agent.model || '',
      creative: agent.taskModelOverrides?.creative || agent.model || '',
      planning: agent.taskModelOverrides?.planning || agent.model || '',
    },
    behavior: {
      proactive: agent.behavior?.proactive ?? false,
      voiceResponses: agent.behavior?.voiceResponses ?? false,
      webSearch: agent.behavior?.webSearch ?? true,
      browserAccess: agent.behavior?.browserAccess ?? false,
      canSpawnSubAgents: agent.behavior?.canSpawnSubAgents ?? false,
    },
    integrationKeys: {
      anthropic: String(agent.integrationKeys?.anthropic ?? ''),
      openai: String(agent.integrationKeys?.openai ?? ''),
      groq: String(agent.integrationKeys?.groq ?? ''),
      ollama: String(agent.integrationKeys?.ollama ?? ''),
      openrouter: String(agent.integrationKeys?.openrouter ?? ''),
    },
  }
}

export function AgentConfig() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState<ConfigTab>('identity')
  const [agent, setAgent] = useState<Agent | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.agents.get(id).then((data) => {
      setAgent(data)
      setForm(makeForm(data))
    }).catch((error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to load agent config')
      setAgent(null)
      setForm(null)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="min-h-0 flex-1 overflow-y-auto p-8"><div className="rounded-2xl border border-paw-border bg-paw-surface p-6"><div className="mb-3 h-7 w-56 animate-pulse rounded bg-paw-raised" /><div className="h-4 w-72 animate-pulse rounded bg-paw-raised" /></div></div>
  if (!agent || !form) return <div className="flex h-full items-center justify-center p-8"><div className="rounded-2xl border border-dashed border-paw-border bg-paw-surface px-10 py-12 text-center"><Bot size={42} className="mx-auto mb-4 text-paw-faint opacity-20" /><h1 className="mb-2 text-xl font-semibold text-paw-text">Agent not found</h1><button type="button" className="btn-primary" onClick={() => navigate('/agents')}>Back to agents</button></div></div>

  const modelOptions = form.provider === 'Ollama' ? ollamaModels : form.provider === 'OpenRouter' ? [] : presetModels[form.provider]

  const submit = async () => {
    if (!id) return
    setSaving(true)
    try {
      const updated = await api.agents.update(id, {
        name: form.name.trim(),
        role: form.role.trim(),
        personality: form.personality.trim(),
        avatarColor: form.avatarColor,
        provider: form.provider,
        model: form.model.trim(),
        temperature: form.temperature,
        maxTokens: form.maxTokens,
        systemPrompt: form.systemPrompt,
        taskModelOverrides: form.taskModelOverrides,
        behavior: form.behavior,
        integrationKeys: form.integrationKeys,
      })
      setAgent(updated)
      setForm(makeForm(updated))
      toast.success('Agent configuration saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const isDirty = JSON.stringify(form) !== JSON.stringify(makeForm(agent))

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="bg-paw-surface border border-paw-border rounded-2xl p-6 shadow-sm sticky top-0 z-20 backdrop-blur-md bg-opacity-80">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
              <div className="relative group">
                <AgentAvatar name={form.name} size="lg" />
                <div className="absolute -bottom-1 -right-1 ring-2 ring-paw-surface rounded-full overflow-hidden">
                  <StatusBadge status={agent.status} />
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-paw-text">Configuration</h1>
                  <span className="px-2 py-0.5 rounded-full bg-paw-raised border border-paw-border text-[10px] font-mono text-paw-faint uppercase tracking-widest">
                    ID: {agent.id.slice(0, 8)}
                  </span>
                </div>
                <p className="text-sm text-paw-muted mt-1">{form.name || "Unnamed Agent"} <span className="opacity-30 mx-2">|</span> {form.role || "No role assigned"}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link to={`/agents/${agent.id}`} className="btn-secondary h-10 px-4 group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                Back
              </Link>
              <button 
                type="button" 
                onClick={() => void submit()} 
                className="btn-primary h-10 px-6 shadow-glow" 
                disabled={saving || !isDirty}
              >
                <Save size={16} />
                {saving ? 'Syncing...' : 'Save Configuration'}
              </button>
            </div>
          </div>
          <div className="mt-8 flex gap-6 border-b border-paw-border-subtle">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-1 pb-4 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === tab.id ? 'text-paw-accent' : 'text-paw-faint hover:text-paw-muted'}`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-paw-accent rounded-full shadow-[0_0_8px_rgba(var(--paw-accent-rgb),0.5)]" />
                )}
              </button>
            ))}
          </div>
        </header>

        <div className="grid gap-8">
          {activeTab === 'identity' && (
            <section className="bg-paw-surface border border-paw-border rounded-2xl p-8 space-y-8 animate-slide-up">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-paw-accent-bg rounded-xl border border-paw-accent/20">
                  <Bot size={20} className="text-paw-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-paw-text tracking-tight">Core Identity</h3>
                  <p className="text-sm text-paw-muted">Define how the agent perceives itself and presents to the world.</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-paw-faint">Public Name</span>
                  <input className="input h-11 border-paw-border hover:border-paw-border-strong focus:border-paw-accent/50" value={form.name} onChange={(event) => setForm((current) => current ? { ...current, name: event.target.value } : current)} placeholder="e.g. Sentinel, Archon..." />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-paw-faint">Professional Role</span>
                  <input className="input h-11 border-paw-border hover:border-paw-border-strong focus:border-paw-accent/50" value={form.role} onChange={(event) => setForm((current) => current ? { ...current, role: event.target.value } : current)} placeholder="e.g. Security Researcher, Creative Strategist..." />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-paw-faint">Personality Drivers</span>
                <textarea 
                  className="input min-h-[120px] resize-y py-3 leading-relaxed border-paw-border hover:border-paw-border-strong focus:border-paw-accent/50" 
                  value={form.personality} 
                  onChange={(event) => setForm((current) => current ? { ...current, personality: event.target.value } : current)} 
                  placeholder="Describe traits, tone, and behavioral constraints..."
                />
              </label>

              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-widest text-paw-faint">Manifestation Color</div>
                <div className="flex items-center gap-3">
                  {avatarColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm((current) => current ? { ...current, avatarColor: color } : current)}
                      className={`group relative h-10 w-10 rounded-xl transition-all ${form.avatarColor === color ? 'ring-2 ring-paw-accent ring-offset-4 ring-offset-paw-surface rotate-12 scale-110 shadow-lg' : 'hover:scale-105 opacity-60 hover:opacity-100 hover:rotate-3'}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select ${color}`}
                    >
                      {form.avatarColor === color && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'model' && (
            <section className="bg-paw-surface border border-paw-border rounded-2xl p-8 space-y-8 animate-slide-up">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-paw-accent-bg rounded-xl border border-paw-accent/20">
                  <Sparkles size={20} className="text-paw-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-paw-text tracking-tight">Intelligence Engine</h3>
                  <p className="text-sm text-paw-muted">Select the neural substrate and configure generation parameters.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {providerOptions.map((provider) => (
                  <button 
                    key={provider} 
                    type="button" 
                    onClick={() => setForm((current) => current ? { ...current, provider, model: provider === 'OpenRouter' ? '' : provider === 'Ollama' ? ollamaModels[0] : presetModels[provider][0] } : current)} 
                    className={`relative rounded-xl border p-4 text-left transition-all group overflow-hidden ${form.provider === provider ? 'border-paw-accent bg-paw-accent-bg' : 'border-paw-border bg-paw-raised/30 hover:border-paw-border-strong hover:bg-paw-raised/50'}`}
                  >
                    <div className="relative z-10">
                      <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${form.provider === provider ? 'text-paw-accent' : 'text-paw-faint'}`}>{provider}</div>
                      <div className="text-[10px] text-paw-muted opacity-80 leading-tight">
                        {provider === 'OpenRouter' ? 'Unlimited Models' : provider === 'Ollama' ? 'Local Instance' : 'Optimized Tiers'}
                      </div>
                    </div>
                    {form.provider === provider && (
                      <div className="absolute -right-2 -bottom-2 opacity-10">
                        <StatusBadge status="connected" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="bg-paw-raised/30 border border-paw-border rounded-xl p-6 space-y-4">
                <div className="text-xs font-bold uppercase tracking-widest text-paw-faint">Model Selection</div>
                {form.provider === 'OpenRouter' ? (
                  <input className="input h-11" value={form.model} onChange={(event) => setForm((current) => current ? { ...current, model: event.target.value } : current)} placeholder="e.g. anthropic/claude-3-5-sonnet:beta" />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <select className="input h-11" value={form.model} onChange={(event) => setForm((current) => current ? { ...current, model: event.target.value } : current)}>
                      {modelOptions.map((model) => <option key={model} value={model}>{model}</option>)}
                    </select>
                    {form.provider === 'Ollama' && (
                      <input className="input h-11" value={form.model} onChange={(event) => setForm((current) => current ? { ...current, model: event.target.value } : current)} placeholder="Custom local slug..." />
                    )}
                  </div>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="group space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-paw-faint">Generation Temperature</span>
                    <span className="text-xs font-mono font-bold text-paw-accent bg-paw-accent-bg px-2 py-0.5 rounded border border-paw-accent/20">
                      {form.temperature.toFixed(1)}
                    </span>
                  </div>
                  <div className="px-2 py-4 bg-paw-raised/30 border border-paw-border rounded-xl">
                    <input 
                      type="range" 
                      min="0" 
                      max="2" 
                      step="0.1" 
                      value={form.temperature} 
                      onChange={(event) => setForm((current) => current ? { ...current, temperature: Number(event.target.value) } : current)} 
                      className="w-full accent-paw-accent cursor-pointer" 
                    />
                    <div className="flex justify-between mt-2 px-1">
                      <span className="text-[10px] text-paw-faint">Deterministic</span>
                      <span className="text-[10px] text-paw-faint">Balanced</span>
                      <span className="text-[10px] text-paw-faint">Creative</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-paw-faint">Context Window / Max Tokens</span>
                  <div className="flex items-center gap-4 bg-paw-raised/30 border border-paw-border rounded-xl p-3.5">
                    <input className="bg-transparent border-none text-paw-text font-mono text-lg focus:ring-0 w-full" type="number" min="256" step="256" value={form.maxTokens} onChange={(event) => setForm((current) => current ? { ...current, maxTokens: Number(event.target.value) } : current)} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-paw-faint shrink-0">Tokens</span>
                  </div>
                </div>
              </div>

              <label className="block space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-paw-faint">Master System Prompt</span>
                  <button type="button" onClick={() => setForm(c => c ? {...c, systemPrompt: defaultSystemPrompt(c.name, c.role)} : c)} className="text-[10px] font-bold text-paw-accent hover:underline">Reset to Default</button>
                </div>
                <textarea 
                  className="input min-h-[160px] resize-y font-mono text-xs leading-relaxed py-4 border-paw-border focus:border-paw-accent/50" 
                  value={form.systemPrompt} 
                  onChange={(event) => setForm((current) => current ? { ...current, systemPrompt: event.target.value } : current)} 
                />
              </label>

              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-widest text-paw-faint">Task-Specific Intelligence Overrides</span>
                <div className="grid gap-4 md:grid-cols-2">
                  {taskOverrideKeys.map((override) => (
                    <label key={override.key} className="block group">
                      <div className="text-[10px] font-bold mb-1.5 text-paw-faint group-focus-within:text-paw-accent transition-colors">{override.label} Intelligence</div>
                      <input 
                        className="input h-10 text-xs font-mono border-paw-border-subtle focus:border-paw-accent/30" 
                        value={form.taskModelOverrides[override.key] || ''} 
                        onChange={(event) => setForm((current) => current ? { ...current, taskModelOverrides: { ...current.taskModelOverrides, [override.key]: event.target.value } } : current)} 
                        placeholder="Inherit master model..."
                      />
                    </label>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'behavior' && (
            <section className="bg-paw-surface border border-paw-border rounded-2xl p-8 space-y-8 animate-slide-up">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-paw-accent-bg rounded-xl border border-paw-accent/20">
                  <Zap size={20} className="text-paw-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-paw-text tracking-tight">Behavioral Flags</h3>
                  <p className="text-sm text-paw-muted">Configure operational boundaries and autonomy levels.</p>
                </div>
              </div>

              <div className="divide-y divide-paw-border-subtle border border-paw-border rounded-xl overflow-hidden">
                {[
                  { key: 'proactive', label: 'Proactive Engagement', desc: 'Allows the agent to initiate message streams without direct user triggers.' },
                  { key: 'voiceResponses', label: 'Vocal Manifestation', desc: 'Synthesizes spoken responses using the configured ElevenLabs identity.' },
                  { key: 'webSearch', label: 'Information Retrieval', desc: 'Grants access to live web searches to anchor responses in current facts.' },
                  { key: 'browserAccess', label: 'Browser Automation', desc: 'Allows the agent to interact with headless browsers for web-based tasks.' },
                  { key: 'canSpawnSubAgents', label: 'Recursive Delegation', desc: 'Grants authority to spawn and coordinate sub-agents for complex goals.' }
                ].map((item) => {
                  const active = form.behavior[item.key as keyof FormState['behavior']]
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setForm((current) => current ? { ...current, behavior: { ...current.behavior, [item.key]: !current.behavior[item.key as keyof FormState['behavior']] } } : current)}
                      className="group flex w-full items-center justify-between p-6 text-left transition-all hover:bg-paw-raised/20"
                    >
                      <div className="max-w-[80%]">
                        <div className="text-sm font-bold text-paw-text group-hover:text-paw-accent transition-colors">{item.label}</div>
                        <div className="mt-1 text-xs text-paw-muted leading-relaxed">{item.desc}</div>
                      </div>
                      <div className={`relative h-6 w-11 rounded-full transition-all duration-300 ring-4 ring-offset-paw-surface ${active ? 'bg-paw-accent ring-paw-accent/10' : 'bg-paw-raised ring-transparent border border-paw-border'}`}>
                        <div className={`absolute top-1 w-3.5 h-3.5 rounded-full bg-white transition-all shadow-sm ${active ? 'left-6' : 'left-1'}`} />
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {activeTab === 'integrations' && (
            <section className="bg-paw-surface border border-paw-border rounded-2xl p-8 space-y-8 animate-slide-up">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-paw-accent-bg rounded-xl border border-paw-accent/20">
                  <Link2 size={20} className="text-paw-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-paw-text tracking-tight">Credential Injection</h3>
                  <p className="text-sm text-paw-muted">Override global API keys for this specific agent identity.</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {keyFields.map((field) => (
                  <div key={field.key} className="space-y-2 group">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-paw-faint group-focus-within:text-paw-accent transition-colors">{field.label}</span>
                    <input 
                      className="input h-11 font-mono text-xs border-paw-border-subtle focus:border-paw-accent/50" 
                      type={field.key === 'ollama' ? 'text' : 'password'} 
                      value={form.integrationKeys[field.key] || ''} 
                      onChange={(event) => setForm((current) => current ? { ...current, integrationKeys: { ...current.integrationKeys, [field.key]: event.target.value } } : current)} 
                      placeholder={field.key === 'ollama' ? 'http://localhost:11434' : '••••••••••••••••'} 
                    />
                  </div>
                ))}
              </div>
              <div className="bg-paw-info-bg/50 border border-paw-info/20 rounded-xl p-5 flex gap-4">
                <div className="w-1 h-auto bg-paw-info rounded-full shrink-0" />
                <p className="text-xs text-paw-info leading-relaxed">
                  Keys entered here take precedence over system-wide configuration. They are encrypted at rest and never transmitted in logs.
                </p>
              </div>
            </section>
          )}
        </div>

        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-30 transition-all duration-500 ${isDirty ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
          <div className="bg-paw-text text-paw-bg px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 backdrop-blur-xl bg-opacity-95">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-paw-warning animate-pulse" />
              <span className="text-sm font-bold tracking-tight">Unsaved alterations detected</span>
            </div>
            <div className="h-4 w-px bg-paw-bg/20" />
            <button 
              type="button" 
              onClick={() => void submit()} 
              className="px-6 py-2 bg-paw-accent hover:bg-paw-accent-h text-white rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-glow"
              disabled={saving}
            >
              Commit Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
