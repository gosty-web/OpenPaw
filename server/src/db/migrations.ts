import type Database from 'better-sqlite3'
import { SCHEMA } from './schema.js'

const REQUIRED_COLUMNS: Record<string, string[]> = {
  agents: ['id', 'name', 'role', 'status', 'model', 'provider', 'temperature', 'max_tokens', 'created_at', 'updated_at'],
  memories: ['id', 'agent_id', 'tier', 'content', 'importance', 'tags_json', 'created_at'],
  messages: ['id', 'agent_id', 'role', 'content', 'metadata_json', 'session_id', 'created_at'],
  workspaces: ['id', 'name', 'type', 'description', 'context_md', 'created_at'],
  workspace_agents: ['workspace_id', 'agent_id', 'role', 'joined_at'],
  tasks: ['id', 'workspace_id', 'title', 'status', 'publisher_id', 'required_skills_json', 'created_at'],
  task_bids: ['id', 'task_id', 'bidder_id', 'status', 'created_at'],
  mcps: ['id', 'name', 'type', 'args_json', 'headers_json', 'env_json', 'enabled', 'global', 'created_at'],
  agent_mcps: ['agent_id', 'mcp_id', 'enabled'],
  skills: ['id', 'name', 'description', 'category', 'tags_json', 'content_md', 'enabled', 'created_at', 'updated_at'],
  agent_skills: ['agent_id', 'skill_id', 'enabled'],
  cron_jobs: ['id', 'name', 'description', 'agent_id', 'prompt', 'schedule', 'timezone', 'enabled', 'created_at'],
  channels: ['id', 'type', 'config_json', 'agent_id', 'enabled', 'created_at'],
  instances: ['id', 'type', 'agent_id', 'status', 'started_at', 'metadata_json'],
  instance_logs: ['id', 'instance_id', 'level', 'message', 'created_at'],
  settings: ['key', 'value', 'updated_at'],
  auth_tokens: ['id', 'token', 'name', 'created_at'],
  agent_model_overrides: ['id', 'agent_id', 'task_type', 'provider', 'model'],
  files: ['id', 'agent_id', 'filename', 'content', 'updated_at'],
  imports: ['id', 'source', 'status', 'metadata_json', 'created_at'],
}

function ensureCompatibleTables(db: Database.Database) {
  const existing = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>
  const existingNames = new Set(existing.map((row) => row.name))
  const stamp = Date.now()

  for (const [table, requiredColumns] of Object.entries(REQUIRED_COLUMNS)) {
    if (!existingNames.has(table)) {
      continue
    }

    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
    const columnNames = new Set(columns.map((column) => column.name))
    const compatible = requiredColumns.every((column) => columnNames.has(column))

    if (!compatible) {
      const legacyName = `${table}_legacy_${stamp}`
      db.exec(`ALTER TABLE ${table} RENAME TO ${legacyName}`)
      console.log(`[DB] Migrated incompatible table ${table} -> ${legacyName}`)
    }
  }

  db.exec(`
    DROP INDEX IF EXISTS idx_memories_agent_tier;
    DROP INDEX IF EXISTS idx_messages_session;
    DROP INDEX IF EXISTS idx_tasks_workspace_status;
    DROP INDEX IF EXISTS idx_instance_logs_instance;
  `)
}

export function runMigrations(db: Database.Database) {
  ensureCompatibleTables(db)
  db.exec(SCHEMA)
  console.log('[DB] Schema applied')
}
