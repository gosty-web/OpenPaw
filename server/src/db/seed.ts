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
