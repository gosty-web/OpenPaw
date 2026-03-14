import type { Agent } from './api'

export type Provider = 'Anthropic' | 'OpenAI' | 'Groq' | 'Ollama' | 'OpenRouter'

export type AgentFileName =
  | 'AGENTS.md'
  | 'SOUL.md'
  | 'USER.md'
  | 'IDENTITY.md'
  | 'MEMORY.md'
  | 'HEARTBEAT.md'
  | 'GROWTH.md'
  | 'BONDS.md'

export const agentFileNames: AgentFileName[] = [
  'AGENTS.md',
  'SOUL.md',
  'USER.md',
  'IDENTITY.md',
  'MEMORY.md',
  'HEARTBEAT.md',
  'GROWTH.md',
  'BONDS.md',
]

export const providerOptions: Provider[] = ['Anthropic', 'OpenAI', 'Groq', 'Ollama', 'OpenRouter']

export const presetModels: Record<Exclude<Provider, 'Ollama' | 'OpenRouter'>, string[]> = {
  Anthropic: [
    'claude-opus-4-6',
    'claude-sonnet-4-6',
    'claude-opus-4-5',
    'claude-sonnet-4-5',
    'claude-haiku-4-5',
  ],
  OpenAI: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o1', 'o1-mini', 'o3', 'o3-mini'],
  Groq: ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
}

export const ollamaModels = ['llama3.2', 'llama3.1', 'mistral', 'qwen2.5-coder', 'phi3', 'gemma2']

export const taskOverrideKeys = [
  { key: 'coding', label: 'Coding tasks' },
  { key: 'research', label: 'Research tasks' },
  { key: 'creative', label: 'Creative tasks' },
  { key: 'planning', label: 'Planning tasks' },
]

export function defaultSystemPrompt(name: string, role: string) {
  const identity = name.trim() || 'OpenPaw'
  const focus = role.trim() || 'helpful AI teammate'
  return `You are ${identity}, a ${focus} working inside OpenPaw. Be clear, proactive, and collaborative. Prefer concrete next steps, ask concise clarifying questions only when necessary, and maintain a thoughtful, local-first workflow.`
}

export function extractSoulSummary(content?: string) {
  if (!content) {
    return 'This agent has not written a soul description yet.'
  }

  const withoutTitle = content.replace(/^#.*$/m, '').trim()
  const firstSection = withoutTitle.split(/\n##\s+/)[0]?.trim() ?? ''
  return firstSection.replace(/\n+/g, ' ').trim() || 'This agent has not written a soul description yet.'
}

export function vitalityFromAgent(agent: Agent) {
  const seed = Array.from(agent.id).reduce((total, char) => total + char.charCodeAt(0), 0)
  return {
    energy: 48 + (seed % 40),
    curiosity: 54 + ((seed * 3) % 36),
    satisfaction: 50 + ((seed * 5) % 38),
    motivation: 58 + ((seed * 7) % 32),
  }
}
