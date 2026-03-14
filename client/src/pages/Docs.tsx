import { useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type DocSectionId =
  | 'getting-started'
  | 'core-concepts'
  | 'agent-files'
  | 'chat-interface'
  | 'mcps-skills'
  | 'cron-jobs'
  | 'channels'
  | 'api-reference'
  | 'deployment'
  | 'faq'

const docs: Array<{ id: DocSectionId; label: string; content: string }> = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    content: `# Getting Started

OpenPaw is a local-first AI agent platform. Run the server, open the client, create your first agent, and start chatting.

## First steps

1. Start the root dev command
2. Open the Dashboard
3. Create an agent
4. Start a conversation
5. Attach skills, MCPs, channels, and cron jobs as needed
`,
  },
  {
    id: 'core-concepts',
    label: 'Core Concepts',
    content: `# Core Concepts

OpenPaw is a local-first AI agent platform focused on persistent identity, collaboration, and control. It takes inspiration from OpenClaw's agent architecture, but packages it into a simpler local product shell with explicit workspaces, channels, skills, MCPs, and cron-driven proactive behavior.

## What OpenPaw is

OpenPaw is the control plane for your local agents. It gives you a UI, storage, routing, files, chat, collaboration spaces, and integrations. The goal is to make agents feel like durable teammates, not disposable prompts.

## How it relates to OpenClaw

OpenClaw is the reference architecture. OpenPaw borrows the core idea that agents should have persistent files, stable identities, and a workspace-aware operating model. OpenPaw adds a polished local dashboard, structured management pages, and a productized shell around those ideas.

## What agent files are

Agent files are the persistent markdown files that define an agent's identity, behavior, and memory boundaries. They survive across sessions, so the agent can grow over time instead of reloading from scratch every time a chat opens.

## What A2A protocol means here

A2A stands for agent-to-agent collaboration. In OpenPaw, workspaces use A2A task flow so one agent can publish a task, others can bid, and the right specialist can take the job. It turns a flat list of agents into a working team.

## Skills vs MCPs

Skills are instruction files. They teach an agent how to approach a kind of task.

MCPs are tools. They let an agent reach outside the model into files, browsers, APIs, databases, or external services.

The short version:

- Skills change how the agent thinks and works
- MCPs change what the agent can access and do
`,
  },
  {
    id: 'agent-files',
    label: 'Agent Files',
    content: `# Agent Files

Every agent in OpenPaw has eight persistent markdown files. Together, they define identity, behavior, memory, and collaboration posture.

## AGENTS.md

Operating instructions for the agent. This is what the agent does on every session startup, how it behaves, what it reads first, how it uses tools, and how it should act in solo or group contexts.

## SOUL.md

Identity, personality, values, and communication style. This is the most human layer. It defines who the agent is, not just what it does.

## USER.md

Who the user is. This is the agent's working model of the person it helps: preferences, goals, style, projects, and context.

## IDENTITY.md

Immutable core facts about the agent such as name, creation date, and purpose. This file anchors continuity and should not be casually edited.

## MEMORY.md

Long-term curated memories. This file is intentionally sensitive and only loaded in main sessions so private context is not sprayed into every interaction.

## HEARTBEAT.md

Proactive task checklist. This tells the agent what to check during scheduled runs, what counts as worth reporting, and when to stay quiet.

## GROWTH.md

Learning log. This is where the agent tracks skills acquired, mistakes made, lessons learned, and areas it wants to improve next.

## BONDS.md

Relationship memory for other agents. It tracks who the agent knows, trust levels, collaboration history, and shared projects so group work feels coherent over time.
`,
  },
  {
    id: 'chat-interface',
    label: 'Chat Interface',
    content: `# Chat Interface

The Chat page is the main working surface. The left rail shows agents and sessions. The right panel shows the conversation, markdown rendering, code blocks, and the sticky composer.

Suggested prompts help start a fresh thread, while session history keeps prior conversations organized by agent.
`,
  },
  {
    id: 'mcps-skills',
    label: 'MCPs & Skills',
    content: `# MCPs & Skills

## MCPs

MCP connections give agents tool access. Typical MCPs include filesystem, GitHub, Postgres, browser automation, search, and memory services.

## Skills

Skills are reusable instruction sets, workflows, knowledge files, or personality layers. They can be created locally or imported from GitHub.
`,
  },
  {
    id: 'cron-jobs',
    label: 'Cron Jobs',
    content: `# Cron Jobs

Cron jobs let agents run on a schedule. Good examples include daily summaries, inbox checks, feed monitoring, maintenance tasks, and recurring reports.
`,
  },
  {
    id: 'channels',
    label: 'Channels',
    content: `# Channels

Channels connect agents to external messaging platforms like Telegram, Discord, Slack, WhatsApp, and the built-in web chat.
`,
  },
  {
    id: 'api-reference',
    label: 'API Reference',
    content: `# API Reference

OpenPaw exposes a REST API under \`/api\`.

## Health

- \`GET /api/health\`

## Agents

- \`GET /api/agents\`
- \`POST /api/agents\`
- \`GET /api/agents/:id\`
- \`PATCH /api/agents/:id\`
- \`DELETE /api/agents/:id\`
- \`GET /api/agents/:id/files\`
- \`GET /api/agents/:id/files/:filename\`
- \`PUT /api/agents/:id/files/:filename\`
- \`GET /api/agents/:id/memory\`
- \`POST /api/agents/:id/memory\`
- \`DELETE /api/agents/:id/memory/:memoryId\`
- \`GET /api/agents/:id/sessions\`
- \`GET /api/agents/:id/sessions/:sessionId/messages\`
- \`POST /api/agents/:id/chat\`
- \`POST /api/agents/:id/stream\`
- \`DELETE /api/agents/:id/sessions/:sessionId\`
- \`POST /api/agents/:id/spawn\`

## Workspaces

- \`GET /api/workspaces\`
- \`POST /api/workspaces\`
- \`GET /api/workspaces/:id\`
- \`PATCH /api/workspaces/:id\`
- \`DELETE /api/workspaces/:id\`
- \`POST /api/workspaces/:id/agents\`
- \`DELETE /api/workspaces/:id/agents/:agentId\`
- \`GET /api/workspaces/:id/tasks\`
- \`POST /api/workspaces/:id/tasks\`
- \`PATCH /api/workspaces/:id/tasks/:taskId\`

## MCPs

- \`GET /api/mcps\`
- \`POST /api/mcps\`
- \`PATCH /api/mcps/:id\`
- \`DELETE /api/mcps/:id\`
- \`POST /api/mcps/:id/test\`
- \`POST /api/mcps/:id/toggle\`

## Skills

- \`GET /api/skills\`
- \`POST /api/skills\`
- \`PATCH /api/skills/:id\`
- \`DELETE /api/skills/:id\`
- \`POST /api/skills/import\`
- \`POST /api/skills/:id/toggle\`

## Cron

- \`GET /api/cron\`
- \`POST /api/cron\`
- \`PATCH /api/cron/:id\`
- \`DELETE /api/cron/:id\`
- \`POST /api/cron/:id/run\`

## Channels

- \`GET /api/channels\`
- \`PATCH /api/channels/:type\`
- \`POST /api/channels/:type/toggle\`
- \`GET /api/channels/whatsapp/qr\`
- \`POST /api/channels/telegram/test\`

## Instances

- \`GET /api/instances\`
- \`GET /api/instances/:id/logs\`

## Settings and System

- \`GET /api/settings\`
- \`PATCH /api/settings\`
- \`POST /api/settings/test/:provider\`
- \`POST /api/system/restart\`
- \`GET /api/providers/models\`
- \`GET /api/voice/voices\`
- \`POST /api/voice/tts\`

## Import and Export

- \`POST /api/import/openclaw\`
- \`POST /api/export/all\`
`,
  },
  {
    id: 'deployment',
    label: 'Deployment',
    content: `# Deployment

OpenPaw is designed for local-first development. In production-like setups, keep the server and client separate, protect API access with tokens, and route channels through the configured integrations.
`,
  },
  {
    id: 'faq',
    label: 'FAQ',
    content: `# FAQ

## Is OpenPaw local-first?

Yes. The platform is built around local files, local state, and local operator control.

## Do I need MCPs to use it?

No. Agents can still chat without MCPs, but MCPs are what give them real tools.

## Can agents collaborate?

Yes. Workspaces and A2A task flow are built for that.
`,
  },
]

export function Docs() {
  const [active, setActive] = useState<DocSectionId>('core-concepts')
  const refs = useRef<Record<DocSectionId, HTMLElement | null>>({
    'getting-started': null,
    'core-concepts': null,
    'agent-files': null,
    'chat-interface': null,
    'mcps-skills': null,
    'cron-jobs': null,
    channels: null,
    'api-reference': null,
    deployment: null,
    faq: null,
  })

  const activeDoc = useMemo(() => docs.find((entry) => entry.id === active) ?? docs[0], [active])

  return (
    <div className="flex h-full min-h-0 flex-1 gap-6 overflow-hidden p-8">
      <aside className="hidden w-44 shrink-0 lg:block">
        <div className="sticky top-0 card p-3">
          {docs.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => {
                setActive(entry.id)
                refs.current[entry.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                active === entry.id ? 'bg-paw-accent-bg text-paw-accent' : 'text-paw-muted hover:bg-paw-raised hover:text-paw-text'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </aside>

      <div className="min-h-0 flex-1 overflow-y-auto pr-2">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-paw-text">Docs</h1>
          <p className="mt-2 text-sm text-paw-muted">Embedded markdown documentation for OpenPaw concepts, files, APIs, and workflows.</p>
        </div>

        <div className="card prose prose-invert max-w-none border-paw-border bg-paw-surface/90 p-0">
          {docs.map((entry) => (
            <section key={entry.id} ref={(node) => { refs.current[entry.id] = node }} className="border-b border-paw-border px-8 py-8 last:border-b-0">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h2 className="mb-4 text-2xl font-semibold text-paw-text">{children}</h2>,
                  h2: ({ children }) => <h3 className="mt-6 mb-3 text-lg font-semibold text-paw-text">{children}</h3>,
                  p: ({ children }) => <p className="mb-4 text-sm leading-7 text-paw-muted">{children}</p>,
                  li: ({ children }) => <li className="mb-2 text-sm leading-7 text-paw-muted">{children}</li>,
                  code: ({ children }) => <code className="rounded bg-paw-raised px-1.5 py-0.5 font-mono text-xs text-paw-text">{children}</code>,
                }}
              >
                {entry.content}
              </ReactMarkdown>
            </section>
          ))}
        </div>

        <div className="mt-4 text-xs text-paw-faint">Currently focused: {activeDoc.label}</div>
      </div>
    </div>
  )
}
