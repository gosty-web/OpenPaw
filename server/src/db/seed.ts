import type Database from 'better-sqlite3'

const DEFAULT_SETTINGS: Record<string, string> = {
  default_provider: 'anthropic',
  default_model: 'claude-sonnet-4-6',
  voice_enabled: 'false',
  browser_enabled: 'false',
  web_search_provider: 'brave',
  web_search_results_per_search: '5',
  web_search_cache_minutes: '30',
  ollama_url: 'http://localhost:11434',
  memory_backend: 'local',
  memory_importance_threshold: '0.45',
  memory_auto_summarize: 'true',
  pinecone_environment: '',
  pinecone_index_name: 'openpaw-memory',
  voice_provider: 'elevenlabs',
  voice_auto_play: 'false',
  whisper_enabled: 'true',
  browser_mode: 'bundled',
  browser_headed: 'false',
  browser_max_sessions: '2',
  accent_color: 'violet',
  sidebar_width: '240',
  message_density: 'comfortable',
  font_size: 'medium',
  auth_token: '',
  allowed_origins: 'http://localhost:5173',
  auto_lock_minutes: '0',
  port: '7411',
  openpaw_version: '0.1.0',
  data_directory: '~/.openpaw',
}

export function seedDefaultSettings(db: Database.Database) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, updated_at)
    VALUES (@key, @value, @updated_at)
  `)

  const timestamp = new Date().toISOString()
  const transaction = db.transaction(() => {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      insert.run({ key, value, updated_at: timestamp })
    }
  })

  transaction()
}

