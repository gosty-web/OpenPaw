import { Database } from 'better-sqlite3'

/**
 * Seeds the database with default settings if they don't already exist.
 */
export function seedDefaultSettings(db: Database) {
  const now = new Date().toISOString()
  const defaultSettings = [
    { key: 'default_provider', value: 'anthropic' },
    { key: 'default_model', value: 'claude-sonnet-4-6' },
    { key: 'voice_enabled', value: 'false' },
    { key: 'browser_enabled', value: 'false' },
    { key: 'web_search_provider', value: 'brave' },
    { key: 'theme', value: 'dark' },
    { key: 'proactive_checks_enabled', value: 'true' },
    { key: 'a2a_enabled', value: 'true' }
  ]

  const stmt = db.prepare('INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)')
  
  for (const setting of defaultSettings) {
    stmt.run(setting.key, setting.value, now)
  }

  console.log('[DB] Default settings seeded')
}

export function seedBuiltinSlashCommands(db: Database) {
  const now = new Date().toISOString()
  const commands = [
    {
      name: 'think',
      display_name: '/think',
      description: 'Forces extended reasoning mode',
      prompt_template: 'Before responding, work through this problem step by step inside <think></think> tags.\nCover: (1) restate the problem, (2) what you know vs don\'t know, (3) three possible approaches,\n(4) which is best and why, (5) where it could go wrong. Your final answer comes after </think>.\n\n{{args}}'
    },
    {
      name: 'research',
      display_name: '/research',
      description: 'Perform deep research via web search',
      prompt_template: 'Perform deep research on: {{args}}\n\nUse web search to find recent, accurate information.\nSearch at least 3 times with different queries. Synthesize findings into a clear summary with sources.'
    },
    {
      name: 'plan',
      display_name: '/plan',
      description: 'Create a detailed action plan',
      prompt_template: 'Create a detailed, numbered action plan for: {{args}}\n\nMake each step concrete and immediately actionable.\nInclude time estimates per step. Flag dependencies between steps.'
    },
    {
      name: 'review',
      display_name: '/review',
      description: 'Critically review code, writing, or designs',
      prompt_template: 'Critically review: {{args}}\n\nStructure your review as: (1) What works well, (2) What is weak or missing,\n(3) Specific improvements with examples, (4) Overall verdict.'
    },
    {
      name: 'debug',
      display_name: '/debug',
      description: 'Systematically debug a problem',
      prompt_template: 'Debug this problem systematically: {{args}}\n\n(1) Reproduce the issue,\n(2) Isolate the cause, (3) Propose and test a fix, (4) Verify the fix works.'
    },
    {
      name: 'summarize',
      display_name: '/summarize',
      description: 'Summarize the entire conversation',
      prompt_template: 'Summarize this entire conversation. Cover: main topics discussed,\ndecisions made, open questions remaining, and key context for future sessions.'
    },
    {
      name: 'deploy',
      display_name: '/deploy',
      description: 'Run deployment checklist',
      prompt_template: 'Run a deployment checklist for the current project.\n\nCheck: build passes,\ntests pass, env vars set, dependencies installed, no console errors, API endpoints healthy.\nReport status of each item.'
    },
    {
      name: 'market',
      display_name: '/market',
      description: 'Generate marketing strategy',
      prompt_template: 'Generate a complete marketing strategy for: {{args}}\n\nCover:\ntarget audience, positioning, channels, messaging, first 30-day action plan.'
    }
  ]

  const stmt = db.prepare(`
    INSERT INTO slash_commands (id, name, display_name, description, prompt_template, is_builtin, created_at)
    VALUES (?, ?, ?, ?, ?, 1, ?)
    ON CONFLICT(name) DO UPDATE SET 
      prompt_template = excluded.prompt_template,
      description = excluded.description
  `)

  const transaction = db.transaction((cmds) => {
    for (const cmd of cmds) {
      stmt.run(`builtin-${cmd.name}`, cmd.name, cmd.display_name, cmd.description, cmd.prompt_template, now)
    }
  })

  transaction(commands)
  console.log('[DB] Built-in slash commands seeded')
}
