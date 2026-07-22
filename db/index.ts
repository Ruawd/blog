import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs"
import { dirname, join } from "node:path"
import { DatabaseSync } from "node:sqlite"

const databasePath = process.env.DATABASE_PATH
  || join(/* turbopackIgnore: true */ process.cwd(), "data", "blog.sqlite")

let database: DatabaseSync | null = null

export function getDatabasePath(): string {
  return databasePath
}

function applyPendingRestore(): void {
  const pendingPath = `${databasePath}.restore-pending`
  if (!existsSync(/* turbopackIgnore: true */ pendingPath)) return
  mkdirSync(/* turbopackIgnore: true */ dirname(databasePath), { recursive: true })
  const safetyPath = `${databasePath}.before-restore-${new Date().toISOString().replace(/[:.]/g, "-")}`
  if (existsSync(/* turbopackIgnore: true */ databasePath)) {
    renameSync(/* turbopackIgnore: true */ databasePath, safetyPath)
  }
  renameSync(/* turbopackIgnore: true */ pendingPath, databasePath)
  rmSync(/* turbopackIgnore: true */ `${databasePath}-wal`, { force: true })
  rmSync(/* turbopackIgnore: true */ `${databasePath}-shm`, { force: true })
}

export function getDatabase(): DatabaseSync {
  if (database) return database

  mkdirSync(/* turbopackIgnore: true */ dirname(databasePath), { recursive: true })
  applyPendingRestore()
  database = new DatabaseSync(databasePath)
  database.exec("PRAGMA journal_mode = WAL")
  database.exec("PRAGMA foreign_keys = ON")
  database.exec("PRAGMA busy_timeout = 5000")
  return database
}
