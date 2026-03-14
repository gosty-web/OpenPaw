import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Hash,
  Link2,
  MessageCircle,
  MessageSquare,
  QrCode,
  Smartphone,
  type LucideIcon,
} from 'lucide-react'
import { Modal } from '../components/Modal'
import { api, type Agent, type AgentSkill, type Channel, type WhatsappQrResponse } from '../lib/api'
import { toast } from '../lib/toast'

type ChannelFormState = {
  botToken: string
  webhookUrl: string
  allowList: string
  testChatId: string
  agentId: string
  clientId: string
  guildId: string
  commandPrefix: string
  appToken: string
  signingSecret: string
  channelWhitelist: string
  phoneNumber: string
}

const channelMeta: Record<'telegram' | 'discord' | 'slack' | 'whatsapp' | 'web', { icon: LucideIcon; description: string }> = {
  telegram: {
    icon: MessageCircle,
    description: 'Let one agent answer Telegram messages and groups in real time.',
  },
  discord: {
    icon: Hash,
    description: 'Expose agents in Discord with slash commands and guild controls.',
  },
  slack: {
    icon: MessageSquare,
    description: 'Bring agents into Slack channels, threads, and workspace workflows.',
  },
  whatsapp: {
    icon: Smartphone,
    description: 'Bridge WhatsApp with WPPConnect using a local QR-powered session.',
  },
  web: {
    icon: Globe,
    description: 'Built-in web chat is always available inside your local OpenPaw app.',
  },
}

const channelTone: Record<'telegram' | 'discord' | 'slack' | 'whatsapp' | 'web', string> = {
  telegram: 'bg-blue-500/15 text-blue-400',
  discord: 'bg-indigo-500/15 text-indigo-400',
  slack: 'bg-amber-500/15 text-amber-400',
  whatsapp: 'bg-paw-success/15 text-paw-success',
  web: 'bg-paw-accent/15 text-paw-accent-h',
}

function defaultWebhookUrl() {
  if (typeof window === 'undefined') {
    return 'http://localhost:7411/webhooks/telegram'
  }

  return `${window.location.protocol}//${window.location.hostname}:7411/webhooks/telegram`
}

function statusMeta(status?: Channel['status']) {
  if (status === 'connected') {
    return {
      label: 'Connected',
      badge: 'bg-paw-success/15 text-paw-success border border-paw-success/25',
      dot: 'bg-paw-success',
      pulse: true,
    }
  }

  if (status === 'error') {
    return {
      label: 'Error',
      badge: 'bg-paw-danger/15 text-paw-danger border border-paw-danger/25',
      dot: 'bg-paw-danger',
      pulse: false,
    }
  }

  return {
    label: 'Not connected',
    badge: 'bg-paw-raised text-paw-faint border border-paw-border',
    dot: 'bg-paw-faint',
    pulse: false,
  }
}

function formatListInput(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function slugCommand(input: string) {
  return `/${input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`
}

function instructionsFor(channelId: string) {
  if (channelId === 'telegram') {
    return [
      'Open Telegram and start a chat with @BotFather.',
      'Create a new bot, copy the bot token, and paste it into OpenPaw.',
      'Set your webhook to the generated URL, then choose which agent should respond.',
    ]
  }

  if (channelId === 'discord') {
    return [
      'Create an application in the Discord developer portal.',
      'Enable a bot user, copy the bot token and client ID, then invite it to your server.',
      'Pick the agent that should answer slash commands and optional guild restrictions.',
    ]
  }

  if (channelId === 'slack') {
    return [
      'Create a Slack app for your workspace and enable Socket Mode or event subscriptions.',
      'Copy the app token, bot token, and signing secret into OpenPaw.',
      'Restrict channels if needed, then assign the agent that should answer messages.',
    ]
  }

  return [
    'Run WPPConnect locally so OpenPaw can open a session.',
    'Scan the QR code with your WhatsApp mobile app to authorize the connection.',
    'Choose the agent that should answer incoming messages after the session is paired.',
  ]
}

function agentNameFor(channel: Channel, agents: Agent[]) {
  return channel.agentName ?? agents.find((agent) => agent.id === channel.agentId)?.name ?? 'No agent selected'
}

function buildFormState(channel: Channel): ChannelFormState {
  return {
    botToken: channel.config?.botToken ?? '',
    webhookUrl: channel.config?.webhookUrl ?? defaultWebhookUrl(),
    allowList: channel.config?.allowList?.join(', ') ?? '',
    testChatId: channel.config?.testChatId ?? '',
    agentId: channel.agentId ?? '',
    clientId: channel.config?.clientId ?? '',
    guildId: channel.config?.guildId ?? '',
    commandPrefix: channel.config?.commandPrefix ?? '/',
    appToken: channel.config?.appToken ?? '',
    signingSecret: channel.config?.signingSecret ?? '',
    channelWhitelist: channel.config?.channelWhitelist?.join(', ') ?? '',
    phoneNumber: channel.config?.phoneNumber ?? '',
  }
}

function InstructionsCallout({ channelId }: { channelId: string }) {
  const steps = instructionsFor(channelId)
  const title =
    channelId === 'telegram'
      ? 'Create your Telegram bot'
      : channelId === 'discord'
        ? 'Discord setup flow'
        : channelId === 'slack'
          ? 'Slack app setup'
          : 'WhatsApp pairing flow'

  return (
    <div className="mb-5 rounded-xl border border-paw-border bg-paw-raised p-4">
      <div className="mb-3 text-sm font-semibold text-paw-text">{title}</div>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step} className="flex items-start gap-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-paw-accent text-xs font-bold text-white">
              {index + 1}
            </div>
            <p className="text-sm text-paw-muted">{step}</p>
          </div>
        ))}
      </div>
      {channelId === 'discord' && (
        <a
          href="https://discord.com/developers/applications"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm text-paw-accent hover:text-paw-accent-h"
        >
          Open Discord developer portal
          <ExternalLink size={14} />
        </a>
      )}
      {channelId === 'slack' && (
        <a
          href="https://api.slack.com/apps"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm text-paw-accent hover:text-paw-accent-h"
        >
          Open Slack app dashboard
          <ExternalLink size={14} />
        </a>
      )}
      {channelId === 'whatsapp' && (
        <a
          href="https://github.com/wppconnect-team/wppconnect"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm text-paw-accent hover:text-paw-accent-h"
        >
          View WPPConnect on GitHub
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  )
}

export function Channels() {
  const navigate = useNavigate()
  const [channels, setChannels] = useState<Channel[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [modalChannelId, setModalChannelId] = useState<string | null>(null)
  const [form, setForm] = useState<ChannelFormState>({
    botToken: '',
    webhookUrl: defaultWebhookUrl(),
    allowList: '',
    testChatId: '',
    agentId: '',
    clientId: '',
    guildId: '',
    commandPrefix: '/',
    appToken: '',
    signingSecret: '',
    channelWhitelist: '',
    phoneNumber: '',
  })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null)
  const [discordSkills, setDiscordSkills] = useState<AgentSkill[]>([])
  const [whatsappQr, setWhatsappQr] = useState<WhatsappQrResponse | null>(null)
  const [whatsappLoading, setWhatsappLoading] = useState(false)
  const [showTelegramToken, setShowTelegramToken] = useState(false)
  const [telegramTestResult, setTelegramTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    Promise.all([api.channels.list(), api.agents.list()])
      .then(([channelData, agentData]) => {
        setChannels(channelData)
        setAgents(agentData)
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load channels'))
      .finally(() => setLoading(false))
  }, [])

  const modalChannel = useMemo(
    () => channels.find((channel) => channel.id === modalChannelId) ?? null,
    [channels, modalChannelId],
  )

  const connectedCount = useMemo(
    () => channels.filter((channel) => channel.status === 'connected').length,
    [channels],
  )

  const discordCommands = useMemo(
    () => discordSkills.filter((skill) => skill.enabled !== false).map((skill) => slugCommand(skill.name)).slice(0, 6),
    [discordSkills],
  )

  useEffect(() => {
    if (!modalChannel) {
      return
    }

    setForm(buildFormState(modalChannel))
  }, [modalChannel])

  useEffect(() => {
    if (modalChannel?.id !== 'discord' || !form.agentId) {
      setDiscordSkills([])
      return
    }

    api.agents.skills(form.agentId)
      .then(setDiscordSkills)
      .catch(() => setDiscordSkills([]))
  }, [form.agentId, modalChannel?.id])

  useEffect(() => {
    if (modalChannel?.id !== 'whatsapp') {
      setWhatsappQr(null)
      return
    }

    setWhatsappLoading(true)
    api.channels.whatsappQr()
      .then(setWhatsappQr)
      .catch(() => setWhatsappQr(null))
      .finally(() => setWhatsappLoading(false))
  }, [modalChannel?.id])

  const openModal = (channel: Channel) => {
    setModalChannelId(channel.id)
    setTelegramTestResult(null)
  }

  const closeModal = () => {
    setModalChannelId(null)
    setDiscordSkills([])
    setWhatsappQr(null)
    setTelegramTestResult(null)
  }

  const patchChannel = (updated: Channel) => {
    setChannels((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)))
  }

  const saveChannel = async () => {
    if (!modalChannel) {
      return
    }

    if (modalChannel.id !== 'web' && !form.agentId) {
      toast.warning('Choose an agent before saving this channel')
      return
    }

    const payload =
      modalChannel.id === 'telegram'
        ? {
            enabled: Boolean(form.botToken),
            agentId: form.agentId,
            config: {
              botToken: form.botToken,
              webhookUrl: form.webhookUrl,
              allowList: formatListInput(form.allowList),
              testChatId: form.testChatId,
            },
          }
        : modalChannel.id === 'discord'
          ? {
              enabled: Boolean(form.botToken && form.clientId),
              agentId: form.agentId,
              config: {
                botToken: form.botToken,
                clientId: form.clientId,
                guildId: form.guildId,
                commandPrefix: form.commandPrefix || '/',
              },
            }
          : modalChannel.id === 'slack'
            ? {
                enabled: Boolean(form.appToken && form.botToken && form.signingSecret),
                agentId: form.agentId,
                config: {
                  appToken: form.appToken,
                  botToken: form.botToken,
                  signingSecret: form.signingSecret,
                  channelWhitelist: formatListInput(form.channelWhitelist),
                },
              }
            : {
                enabled: true,
                agentId: form.agentId,
                config: {
                  phoneNumber: form.phoneNumber,
                },
              }

    setSaving(true)
    try {
      const updated = await api.channels.update(modalChannel.id, payload)
      patchChannel(updated)
      toast.success(`${modalChannel.name} updated`)
      closeModal()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Unable to save ${modalChannel.name}`)
    } finally {
      setSaving(false)
    }
  }

  const disconnectChannel = async (channel: Channel) => {
    if (channel.id === 'web') {
      return
    }

    setDisconnectingId(channel.id)
    try {
      const updated = await api.channels.update(channel.id, { enabled: false, status: 'not_connected' })
      patchChannel(updated)
      toast.success(`${channel.name} disconnected`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Unable to disconnect ${channel.name}`)
    } finally {
      setDisconnectingId(null)
    }
  }

  const testTelegram = async () => {
    if (!modalChannel || modalChannel.id !== 'telegram') {
      return
    }

    if (!form.botToken || !form.testChatId) {
      toast.warning('Add a bot token and chat ID before testing Telegram')
      return
    }

    setTesting(true)
    setTelegramTestResult(null)
    try {
      const persisted = await api.channels.update('telegram', {
        enabled: true,
        agentId: form.agentId,
        config: {
          botToken: form.botToken,
          webhookUrl: form.webhookUrl,
          allowList: formatListInput(form.allowList),
          testChatId: form.testChatId,
        },
      })
      patchChannel(persisted)
      const result = await api.channels.test('telegram', { chatId: form.testChatId })
      setTelegramTestResult({ ok: true, message: result.message })
      toast.success(result.message)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send Telegram test'
      setTelegramTestResult({ ok: false, message })
      toast.error(error instanceof Error ? error.message : 'Unable to send Telegram test')
    } finally {
      setTesting(false)
    }
  }

  const copyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(form.webhookUrl)
      toast.success('Webhook URL copied')
    } catch {
      toast.error('Unable to copy webhook URL')
    }
  }

  const refreshWhatsappQr = async () => {
    setWhatsappLoading(true)
    try {
      const result = await api.channels.whatsappQr()
      setWhatsappQr(result)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load WhatsApp QR code')
    } finally {
      setWhatsappLoading(false)
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h1 className="text-[clamp(1.75rem,1.4rem+1vw,2.2rem)] font-semibold tracking-tight text-paw-text">Channels</h1>
              <span className="badge bg-paw-raised text-paw-muted">{connectedCount}/5 connected</span>
            </div>
            <p className="text-sm text-paw-muted">Connect your agents to messaging platforms</p>
          </div>
        </header>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-72 animate-pulse rounded-2xl border border-paw-border bg-paw-surface" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {channels.map((channel) => {
              const meta = channelMeta[channel.id as keyof typeof channelMeta] ?? channelMeta.web
              const Icon = meta.icon
              const status = statusMeta(channel.status)
              const isWeb = channel.id === 'web'

              return (
                <div
                  key={channel.id}
                  className="group relative overflow-hidden rounded-2xl border border-paw-border bg-paw-surface p-5 shadow-sm transition-all hover:border-paw-border-strong hover:shadow-glow"
                >
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-paw-accent-bg/40 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                  {channel.status === 'connected' && !isWeb ? (
                    <button
                      type="button"
                      className="absolute right-5 top-5 z-10 text-xs font-medium text-paw-faint hover:text-paw-danger"
                      onClick={() => void disconnectChannel(channel)}
                      disabled={disconnectingId === channel.id}
                    >
                      {disconnectingId === channel.id ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  ) : null}
                  <div className="relative z-10 flex h-full flex-col">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${channelTone[channel.id as keyof typeof channelTone]}`}>
                        <Icon size={18} />
                      </div>
                      <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${status.badge}`}>
                        <span className={`h-2 w-2 rounded-full ${status.dot} ${status.pulse ? 'animate-pulse-soft' : ''}`} />
                        {status.label}
                      </span>
                    </div>

                    <div className="mb-5">
                      <h2 className="text-lg font-semibold text-paw-text">{channel.name}</h2>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-paw-muted">{channel.description ?? meta.description}</p>
                    </div>

                    <div className="mb-6 space-y-3 rounded-2xl border border-paw-border bg-paw-bg/70 p-4 text-sm">
                      <div className="flex items-center gap-2 text-paw-muted">
                        <Bot size={14} className="text-paw-faint" />
                        <span className="truncate">{isWeb ? 'Always active in the OpenPaw client' : agentNameFor(channel, agents)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-paw-muted">
                        <Link2 size={14} className="text-paw-faint" />
                        <span className="truncate">
                          {channel.id === 'telegram'
                            ? channel.config?.webhookUrl ?? defaultWebhookUrl()
                            : channel.id === 'whatsapp'
                              ? channel.config?.phoneNumber ?? 'Awaiting QR scan'
                              : isWeb
                                ? 'http://localhost:5173/chat'
                                : channel.updatedAt
                                  ? `Updated ${new Date(channel.updatedAt).toLocaleDateString()}`
                                  : 'Ready to configure'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto">
                      <button
                        type="button"
                        className="btn-primary w-full justify-center"
                        onClick={() => (isWeb ? navigate('/chat') : openModal(channel))}
                      >
                        {isWeb ? 'View' : channel.status === 'connected' ? 'Configure' : 'Connect'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={Boolean(modalChannel)} onClose={closeModal} title={modalChannel ? `${modalChannel.name} Configuration` : 'Channel'}>
        {modalChannel ? (
          <div className="space-y-6">
            <InstructionsCallout channelId={modalChannel.id} />

            {modalChannel.id === 'telegram' ? (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4 lg:border-r lg:border-paw-border lg:pr-6">
                  <label className="block">
                    <span className="label">Bot Token</span>
                    <div className="relative">
                      <input
                        className="input pr-10"
                        type={showTelegramToken ? 'text' : 'password'}
                        value={form.botToken}
                        onChange={(event) => setForm((current) => ({ ...current, botToken: event.target.value }))}
                        placeholder="123456:telegram-bot-token"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTelegramToken((current) => !current)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-paw-faint hover:text-paw-text"
                        aria-label="Toggle bot token visibility"
                      >
                        {showTelegramToken ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </label>
                  <label className="block">
                    <span className="label">Webhook URL</span>
                    <div className="flex items-center gap-2">
                      <input className="input font-mono text-xs text-paw-faint" value={form.webhookUrl} readOnly />
                      <button type="button" className="btn-ghost h-9 w-9 justify-center p-0" onClick={() => void copyWebhook()}>
                        <Copy size={14} />
                      </button>
                    </div>
                  </label>
                  <label className="block">
                    <span className="label">Agent</span>
                    <select className="input" value={form.agentId} onChange={(event) => setForm((current) => ({ ...current, agentId: event.target.value }))}>
                      <option value="">Select an agent</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name} - {agent.role}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="label">Allow List</span>
                    <input
                      className="input"
                      value={form.allowList}
                      onChange={(event) => setForm((current) => ({ ...current, allowList: event.target.value }))}
                      placeholder="12345, 67890 (leave blank for all)"
                    />
                  </label>
                </div>

                <div className="rounded-xl border border-paw-border bg-paw-raised p-4">
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-paw-text">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-paw-accent text-white">
                      <CheckCircle2 size={12} />
                    </span>
                    Send a test message
                  </div>
                  <label className="block">
                    <span className="label">Chat ID</span>
                    <input className="input" value={form.testChatId} onChange={(event) => setForm((current) => ({ ...current, testChatId: event.target.value }))} placeholder="Telegram chat ID" />
                  </label>
                  <button type="button" className="btn-primary mt-4 w-full justify-center" onClick={() => void testTelegram()} disabled={testing}>
                    {testing ? 'Sending...' : 'Send test'}
                  </button>
                  {telegramTestResult ? (
                    <div className="mt-3 rounded-lg border border-paw-border/50 bg-paw-surface p-3">
                      <div className={`text-xs ${telegramTestResult.ok ? 'text-paw-success' : 'text-paw-danger'}`}>
                        {telegramTestResult.message}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {modalChannel.id === 'discord' ? (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-4">
                  <label className="block">
                    <span className="label">Bot Token</span>
                    <input className="input" value={form.botToken} onChange={(event) => setForm((current) => ({ ...current, botToken: event.target.value }))} placeholder="Discord bot token" />
                  </label>
                  <label className="block">
                    <span className="label">Client ID</span>
                    <input className="input" value={form.clientId} onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value }))} placeholder="Discord client ID" />
                  </label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="label">Guild ID</span>
                      <input className="input" value={form.guildId} onChange={(event) => setForm((current) => ({ ...current, guildId: event.target.value }))} placeholder="Optional" />
                    </label>
                    <label className="block">
                      <span className="label">Command Prefix</span>
                      <input className="input" value={form.commandPrefix} onChange={(event) => setForm((current) => ({ ...current, commandPrefix: event.target.value }))} />
                    </label>
                  </div>
                  <label className="block">
                    <span className="label">Agent</span>
                    <select className="input" value={form.agentId} onChange={(event) => setForm((current) => ({ ...current, agentId: event.target.value }))}>
                      <option value="">Select an agent</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name} - {agent.role}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="rounded-2xl border border-paw-border bg-paw-bg p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-paw-text">
                    <Hash size={16} className="text-paw-accent" />
                    Slash commands
                  </div>
                  <p className="mb-4 text-sm leading-6 text-paw-muted">These are inferred from the selected agent's active skills.</p>
                  <div className="flex flex-wrap gap-2">
                    {discordCommands.length > 0 ? (
                      discordCommands.map((command) => (
                        <span key={command} className="kbd">
                          {command}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-paw-faint">Choose an agent to preview slash commands.</span>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {modalChannel.id === 'slack' ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="label">App Token</span>
                    <input className="input" value={form.appToken} onChange={(event) => setForm((current) => ({ ...current, appToken: event.target.value }))} placeholder="xapp-..." />
                  </label>
                  <label className="block">
                    <span className="label">Bot Token</span>
                    <input className="input" value={form.botToken} onChange={(event) => setForm((current) => ({ ...current, botToken: event.target.value }))} placeholder="xoxb-..." />
                  </label>
                </div>
                <label className="block">
                  <span className="label">Signing Secret</span>
                  <input className="input" value={form.signingSecret} onChange={(event) => setForm((current) => ({ ...current, signingSecret: event.target.value }))} placeholder="Slack signing secret" />
                </label>
                <label className="block">
                  <span className="label">Channel Whitelist</span>
                  <input className="input" value={form.channelWhitelist} onChange={(event) => setForm((current) => ({ ...current, channelWhitelist: event.target.value }))} placeholder="product-updates, agent-ops" />
                </label>
                <label className="block">
                  <span className="label">Agent</span>
                  <select className="input" value={form.agentId} onChange={(event) => setForm((current) => ({ ...current, agentId: event.target.value }))}>
                    <option value="">Select an agent</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} - {agent.role}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            {modalChannel.id === 'whatsapp' ? (
              <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                <div className="rounded-2xl border border-paw-border bg-paw-bg p-5">
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-paw-text">
                    <QrCode size={16} className="text-paw-accent" />
                    Pair device
                  </div>
                  <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-paw-border bg-paw-surface">
                    {whatsappLoading ? (
                      <div className="space-y-2">
                        <div className="h-4 w-28 animate-pulse rounded bg-paw-raised" />
                        <div className="h-4 w-20 animate-pulse rounded bg-paw-raised" />
                      </div>
                    ) : whatsappQr ? (
                      <img src={whatsappQr.qrCodeDataUrl} alt="WhatsApp QR code" className="h-56 w-56 rounded-xl object-contain" />
                    ) : (
                      <div className="text-center text-sm text-paw-faint">
                        <QrCode size={30} className="mx-auto mb-3 opacity-30" />
                        QR code unavailable
                      </div>
                    )}
                  </div>
                  <div className="mt-4 text-sm text-paw-muted">
                    {whatsappQr?.status === 'connected'
                      ? `Connected as ${whatsappQr.phoneNumber ?? 'paired device'}`
                      : 'Scan QR code to connect'}
                  </div>
                  <button type="button" className="btn-secondary mt-4 w-full justify-center" onClick={() => void refreshWhatsappQr()}>
                    Refresh QR
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-paw-border bg-paw-bg p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-paw-text">
                      <AlertTriangle size={16} className="text-paw-warning" />
                      Status
                    </div>
                    <p className="text-sm leading-6 text-paw-muted">
                      {whatsappQr?.status === 'connected'
                        ? `Connected as ${whatsappQr.phoneNumber ?? 'a paired device'}.`
                        : 'Scan the QR code with WhatsApp on your phone to complete the connection.'}
                    </p>
                  </div>
                  <label className="block">
                    <span className="label">Agent</span>
                    <select className="input" value={form.agentId} onChange={(event) => setForm((current) => ({ ...current, agentId: event.target.value }))}>
                      <option value="">Select an agent</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name} - {agent.role}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="label">Connected Phone Number</span>
                    <input className="input" value={form.phoneNumber} onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))} placeholder="+234 800 000 0000" />
                  </label>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={() => void saveChannel()} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
