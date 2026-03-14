import Database from 'better-sqlite3'
import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import { runMigrations } from './migrations.js'
import { TABLE_COUNT } from './schema.js'
import { seedDefaultSettings } from './seed.js'

let dbInstance: Database.Database | null = null

function resolveDataDir() {
  const configured = process.env.OPENPAW_DATA_DIR?.trim() || '~/.openpaw'

  if (configured === '~/.openpaw') {
    return path.join(os.homedir(), '.openpaw')
  }

  if (configured.startsWith('~/')) {
    return path.join(os.homedir(), configured.slice(2))
  }

  return path.resolve(configured)
}

export function getOpenPawDataDir() {
  return resolveDataDir()
}

export function getDb(): Database.Database {
  if (dbInstance) {
    return dbInstance
  }

  const dataDir = resolveDataDir()
  fs.ensureDirSync(dataDir)

  const dbPath = path.join(dataDir, 'openpaw.db')
  const db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations(db)
  seedDefaultSettings(db)

  console.log(`[DB] Connected: ${dbPath}`)
  console.log(`[DB] ${TABLE_COUNT} tables ready`)

  dbInstance = db
  return dbInstance
}
