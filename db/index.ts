import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { DatabaseSync } from "node:sqlite"

const databasePath = process.env.DATABASE_PATH || join(process.cwd(), "data", "blog.sqlite")

let database: DatabaseSync | null = null

export function getDatabase(): DatabaseSync {
  if (database) return database

  mkdirSync(dirname(databasePath), { recursive: true })
  database = new DatabaseSync(databasePath)
  database.exec("PRAGMA journal_mode = WAL")
  database.exec("PRAGMA foreign_keys = ON")
  database.exec("PRAGMA busy_timeout = 5000")
  return database
}
