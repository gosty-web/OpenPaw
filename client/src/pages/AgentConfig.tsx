import { useEffect, useState } from 'react'
import { ArrowLeft, Bot, Save } from 'lucide-react'
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

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-2xl border border-paw-border bg-paw-surface p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <AgentAvatar name={form.name} size="lg" />
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-3"><h1 className="text-[clamp(1.6rem,1.3rem+1vw,2.2rem)] font-semibold tracking-tight text-paw-text">Agent Configuration</h1><StatusBadge status={agent.status} /></div>
                <p className="text-sm text-paw-muted">{form.name} · {form.role}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={`/agents/${agent.id}`} className="btn-secondary"><ArrowLeft size={15} />Back to agent</Link>
              <button type="button" onClick={() => void submit()} className="btn-primary" disabled={saving}><Save size={15} />{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">{tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-paw-accent-bg text-paw-accent' : 'bg-paw-raised/60 text-paw-muted hover:bg-paw-raised hover:text-paw-text'}`}>{tab.label}</button>)}</div>
        </header>

        {activeTab === 'identity' && (
          <section className="rounded-2xl border border-paw-border bg-paw-surface p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block"><span className="label">Name</span><input className="input" value={form.name} onChange={(event) => setForm((current) => current ? { ...current, name: event.target.value } : current)} /></label>
              <label className="block"><span className="label">Role</span><input className="input" value={form.role} onChange={(event) => setForm((current) => current ? { ...current, role: event.target.value } : current)} /></label>
            </div>
            <label className="mt-4 block"><span className="label">Personality</span><textarea className="input min-h-[96px] resize-y" value={form.personality} onChange={(event) => setForm((current) => current ? { ...current, personality: event.target.value } : current)} /></label>
            <label className="mt-4 block max-w-[220px]"><span className="label">Avatar Color</span><input className="input h-11" type="color" value={form.avatarColor} onChange={(event) => setForm((current) => current ? { ...current, avatarColor: event.target.value } : current)} /></label>
          </section>
        )}

        {activeTab === 'model' && (
          <section className="space-y-5 rounded-2xl border border-paw-border bg-paw-surface p-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{providerOptions.map((provider) => <button key={provider} type="button" onClick={() => setForm((current) => current ? { ...current, provider, model: provider === 'OpenRouter' ? '' : provider === 'Ollama' ? ollamaModels[0] : presetModels[provider][0] } : current)} className={`rounded-xl border px-4 py-3 text-left transition-all ${form.provider === provider ? 'border-paw-accent bg-paw-accent-bg shadow-glow' : 'border-paw-border bg-paw-raised/55 text-paw-muted hover:border-paw-border-strong hover:text-paw-text'}`}><div className="mb-1 text-sm font-semibold">{provider}</div><div className="text-xs text-paw-faint">{provider === 'OpenRouter' ? 'Paste any model slug' : provider === 'Ollama' ? 'Editable local model' : 'Preset model list'}</div></button>)}</div>
            <div>{form.provider === 'OpenRouter' ? <input className="input" value={form.model} onChange={(event) => setForm((current) => current ? { ...current, model: event.target.value } : current)} placeholder="e.g. anthropic/claude-sonnet-4" /> : form.provider === 'Ollama' ? <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]"><input className="input" value={form.model} onChange={(event) => setForm((current) => current ? { ...current, model: event.target.value } : current)} /><select className="input" value={form.model} onChange={(event) => setForm((current) => current ? { ...current, model: event.target.value } : current)}>{modelOptions.map((model) => <option key={model} value={model}>{model}</option>)}</select></div> : <select className="input" value={form.model} onChange={(event) => setForm((current) => current ? { ...current, model: event.target.value } : current)}>{modelOptions.map((model) => <option key={model} value={model}>{model}</option>)}</select>}</div>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="rounded-xl border border-paw-border bg-paw-raised/45 p-4"><div className="mb-3 flex items-center justify-between"><span className="label mb-0">Temperature</span><span className="text-sm font-medium text-paw-text">{form.temperature.toFixed(1)}</span></div><input type="range" min="0" max="2" step="0.1" value={form.temperature} onChange={(event) => setForm((current) => current ? { ...current, temperature: Number(event.target.value) } : current)} className="w-full accent-paw-accent" /></div>
              <label className="block rounded-xl border border-paw-border bg-paw-raised/45 p-4"><span className="label">Max Tokens</span><input className="input" type="number" min="256" step="256" value={form.maxTokens} onChange={(event) => setForm((current) => current ? { ...current, maxTokens: Number(event.target.value) } : current)} /></label>
            </div>
            <label className="block"><span className="label">System Prompt</span><textarea className="input min-h-[140px] resize-y" value={form.systemPrompt} onChange={(event) => setForm((current) => current ? { ...current, systemPrompt: event.target.value } : current)} /></label>
            <div className="grid gap-4 md:grid-cols-2">{taskOverrideKeys.map((override) => <label key={override.key} className="block"><span className="label">{override.label}</span><input className="input" value={form.taskModelOverrides[override.key] || ''} onChange={(event) => setForm((current) => current ? { ...current, taskModelOverrides: { ...current.taskModelOverrides, [override.key]: event.target.value } } : current)} /></label>)}</div>
          </section>
        )}

        {activeTab === 'behavior' && (
          <section className="grid gap-4 rounded-2xl border border-paw-border bg-paw-surface p-6 md:grid-cols-2">
            {[{ key: 'proactive', label: 'Proactive mode', desc: 'Sends messages unprompted' }, { key: 'voiceResponses', label: 'Voice responses', desc: 'Uses ElevenLabs when available' }, { key: 'webSearch', label: 'Web search enabled', desc: 'Allow live search access' }, { key: 'browserAccess', label: 'Browser access enabled', desc: 'Allow browser-based tasks' }, { key: 'canSpawnSubAgents', label: 'Can spawn sub-agents', desc: 'Allow delegation to helper agents' }].map((item) => <button key={item.key} type="button" onClick={() => setForm((current) => current ? { ...current, behavior: { ...current.behavior, [item.key]: !current.behavior[item.key as keyof FormState['behavior']] } } : current)} className="flex items-center justify-between rounded-2xl border border-paw-border bg-paw-raised/35 px-4 py-4 text-left"><div><div className="font-medium text-paw-text">{item.label}</div><div className="mt-1 text-sm text-paw-muted">{item.desc}</div></div><span className={`rounded-full px-3 py-1 text-sm ${form.behavior[item.key as keyof FormState['behavior']] ? 'bg-paw-success-bg text-paw-success' : 'bg-paw-raised text-paw-muted'}`}>{form.behavior[item.key as keyof FormState['behavior']] ? 'On' : 'Off'}</span></button>)}
          </section>
        )}

        {activeTab === 'integrations' && (
          <section className="rounded-2xl border border-paw-border bg-paw-surface p-6">
            <div className="grid gap-4 md:grid-cols-2">{keyFields.map((field) => <label key={field.key} className="block"><span className="label">{field.label}</span><input className="input" type={field.key === 'ollama' ? 'text' : 'password'} value={form.integrationKeys[field.key] || ''} onChange={(event) => setForm((current) => current ? { ...current, integrationKeys: { ...current.integrationKeys, [field.key]: event.target.value } } : current)} placeholder={field.key === 'ollama' ? 'http://localhost:11434' : 'Override global setting'} /></label>)}</div>
          </section>
        )}
      </div>
    </div>
  )
}
