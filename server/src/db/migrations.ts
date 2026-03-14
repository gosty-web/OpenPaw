import { Database } from 'better-sqlite3'
import { SCHEMA } from './schema.js'

/**
 * Applies the database schema to the provided SQLite database connection.
 */
export function runMigrations(db: Database) {
  try {
    db.exec(SCHEMA)
    console.log('[DB] Schema applied')
  } catch (error) {
    console.error('[DB] Migration failed:', error)
    throw error
  }
}
