import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BookOpen, Cpu, Files, HelpCircle, MessageSquare, Server, Settings, Terminal, Workflow } from 'lucide-react'
import { clsx } from 'clsx'

const docsContent: Record<string, string> = {
  'getting-started': `# Getting Started

Welcome to **OpenPaw**, the local-first agent orchestration platform. OpenPaw is designed to give you full control over your AI agents, their memories, and their workflows - all running locally on your machine.

## Quick Setup
1. **Initialize**: Run \`npm run setup\` in the root directory.
2. **Launch**: Start the development environment with \`npm run dev\`.
3. **Configure**: Visit \`/settings\` to add your API keys (OpenAI, Anthropic, etc.).
`,
  'core-concepts': `# Core Concepts

OpenPaw represents a shift from AI services to AI sovereignty. Here is how the ecosystem works:

### What is OpenPaw?
OpenPaw is the next evolution of agent orchestration. While platforms like OpenClaw provided the foundation for agent files, OpenPaw expands this into a full multi-agent workspace with real-time streaming, long-term memory tiers, and local-first persistence.

### Agent Files and Sovereignty
In OpenPaw, an agent is not just a prompt. It is a collection of Markdown files that define its personality, memories, and growth. You own these files. You can edit them with any text editor, version control them with Git, or move them between OpenPaw instances.

### A2A Protocol (Agent-to-Agent)
Agents in OpenPaw do not just talk to you; they talk to each other. The A2A Protocol allows a lead agent to delegate tasks to specialist agents based on their skills and MCP capabilities.

### Skills vs MCPs
- **Skills**: Hard-coded or scripted capabilities that give agents specific tools (for example, web search or file access).
- **MCPs**: Model Context Protocol servers that connect agents to external data and tools (for example, Google Drive or GitHub).
`,
  'agent-files': `# Agent Files

The soul of an agent is defined across 8 core Markdown files. Understanding these is key to mastering OpenPaw.

### 1. AGENTS.md
Operating Instructions. This file contains the primary system prompts and behavioral constraints.

### 2. SOUL.md
Identity and Values. Where the personality lives.

### 3. USER.md
The User Model. The agent's evolving understanding of you.

### 4. IDENTITY.md
Immutable facts about the agent.

### 5. MEMORY.md
Long-term semantic memory.

### 6. HEARTBEAT.md
Proactive lifecycle tasks.

### 7. GROWTH.md
Learning log.

### 8. BONDS.md
Social graph for agent relationships.
`,
  'api-reference': `# API Reference

The OpenPaw backend exposes a REST API for programmatic control of your agent workspace.

| Endpoint | Method | Description |
| --- | --- | --- |
| \`/api/agents\` | GET | List all local agents |
| \`/api/agents/:id\` | GET | Get full agent state and files |
| \`/api/messages\` | POST | Send a message to an agent |
| \`/api/sessions\` | GET | List chat sessions for an agent |
| \`/api/import/openclaw\` | POST | Import OpenClaw export data |
| \`/api/backup/create\` | POST | Trigger a full system backup |

### Example Request
\`\`\`json
POST /api/messages
{
  "agentId": "agent-strategy",
  "content": "Analyze the latest roadmap bets.",
  "sessionId": "..."
}
\`\`\`
`,
  'default': `# Documentation
Select a topic from the sidebar to learn more about building and orchestrating agents in OpenPaw.
`,
}

const navGroups = [
  {
    label: 'Getting Started',
    items: [
      { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
      { id: 'core-concepts', label: 'Core Concepts', icon: Cpu },
    ],
  },
  {
    label: 'Core Concepts',
    items: [
      { id: 'agent-files', label: 'Agent Files', icon: Files },
      { id: 'chat-interface', label: 'Chat Interface', icon: MessageSquare },
      { id: 'mcps-skills', label: 'MCPs and Skills', icon: Workflow },
      { id: 'cron-jobs', label: 'Cron Jobs', icon: Terminal },
      { id: 'channels', label: 'Channels', icon: Server },
    ],
  },
  {
    label: 'Reference',
    items: [
      { id: 'api-reference', label: 'API Reference', icon: Settings },
      { id: 'faq', label: 'FAQ', icon: HelpCircle },
    ],
  },
]

export function Docs() {
  const [activeTab, setActiveTab] = useState('core-concepts')

  return (
    <div className="flex h-full overflow-hidden bg-paw-bg">
      <aside className="no-scrollbar w-[240px] shrink-0 overflow-y-auto border-r border-paw-border bg-paw-surface/50 backdrop-blur-md">
        <div className="flex flex-col gap-8 p-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="mb-4 px-2 text-[10px] font-bold uppercase tracking-[0.15em] text-paw-faint/80">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={clsx(
                        'group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200',
                        active 
                          ? 'bg-paw-accent/10 text-paw-accent shadow-sm' 
                          : 'text-paw-muted hover:bg-paw-raised hover:text-paw-text'
                      )}
                    >
                      <Icon size={16} className={clsx('transition-colors', active ? 'text-paw-accent' : 'text-paw-faint group-hover:text-paw-muted')} />
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-12 py-16">
          <article className="prose prose-paw prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: (props) => <h1 className="text-4xl font-bold tracking-tight text-paw-text mb-8" {...props} />,
                h2: (props) => <h2 className="text-2xl font-semibold tracking-tight text-paw-text mt-16 mb-6 pb-3 border-b border-paw-border/50" {...props} />,
                h3: (props) => <h3 className="text-lg font-semibold text-paw-text mt-10 mb-4" {...props} />,
                p: (props) => <p className="text-base text-paw-muted leading-relaxed mb-6" {...props} />,
                ul: (props) => <ul className="my-6 space-y-3 list-none pl-0" {...props} />,
                li: (props) => (
                  <li className="flex items-start gap-3 text-sm text-paw-muted before:mt-2 before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-paw-accent/40" {...props} />
                ),
                a: (props) => <a className="font-semibold text-paw-accent no-underline hover:underline decoration-2 underline-offset-4" {...props} />,
                code: ({ className, children, ...props }) => {
                  const isBlock = Boolean(className)
                  if (isBlock) {
                    return (
                      <div className="group relative my-8 overflow-hidden rounded-2xl border border-paw-border bg-paw-raised/30 shadow-2xl shadow-black/20">
                        <div className="flex items-center justify-between border-b border-paw-border/50 bg-paw-raised/50 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-paw-faint">
                          <span>{className?.replace('language-', '') || 'code'}</span>
                          <Terminal size={12} />
                        </div>
                        <pre className="no-scrollbar overflow-x-auto p-6 text-xs leading-relaxed text-paw-text">
                          <code className={clsx('font-mono', className)} {...props}>
                            {children}
                          </code>
                        </pre>
                      </div>
                    )
                  }
                  return (
                    <code className="rounded-md border border-paw-border bg-paw-raised/50 px-1.5 py-0.5 font-mono text-[13px] text-paw-accent/90" {...props}>
                      {children}
                    </code>
                  )
                },
                blockquote: (props) => (
                  <blockquote className="my-8 rounded-2xl border-l-[6px] border-paw-accent bg-paw-accent/5 px-8 py-6 italic shadow-sm" {...props} />
                ),
                table: (props) => (
                  <div className="my-10 overflow-hidden rounded-2xl border border-paw-border bg-paw-surface shadow-md shadow-black/5">
                    <table className="w-full text-left text-sm" {...props} />
                  </div>
                ),
                th: (props) => <th className="bg-paw-raised/50 px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-paw-faint border-b border-paw-border/50" {...props} />,
                td: (props) => <td className="px-6 py-4 border-b border-paw-border/30 text-paw-muted leading-relaxed" {...props} />,
              }}
            >
              {docsContent[activeTab] || docsContent.default}
            </ReactMarkdown>
          </article>
        </div>
      </main>
    </div>
  )
}
