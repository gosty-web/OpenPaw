import Database from 'better-sqlite3'
import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import { runMigrations } from './migrations.js'
import { seedDefaultSettings } from './seed.js'
import { TABLE_COUNT } from './schema.js'

let db: Database.Database | null = null

/**
 * Returns the path to the OpenPaw data directory.
 */
export function getOpenPawDataDir() {
  const dir = path.join(os.homedir(), '.openpaw')
  fs.ensureDirSync(dir)
  return dir
}

/**
 * Initializes and returns the singleton SQLite database instance.
 */
export function getDb(): Database.Database {
  if (db) return db

  const dataDir = getOpenPawDataDir()
  const dbPath = path.join(dataDir, 'openpaw.db')

  db = new Database(dbPath)
  
  // Enable WAL mode and foreign key constraints
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  console.log(`[DB] Connected: ${dbPath}`)

  // Run migrations and seed data
  runMigrations(db)
  seedDefaultSettings(db)

  console.log(`[DB] ${TABLE_COUNT} tables ready`)

  return db
}
