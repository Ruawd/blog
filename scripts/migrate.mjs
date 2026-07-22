import { mkdirSync, readFileSync, readdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { DatabaseSync } from "node:sqlite"

const databasePath = resolve(process.env.DATABASE_PATH || "./data/blog.sqlite")
const migrationsPath = resolve("./drizzle")

mkdirSync(dirname(databasePath), { recursive: true })
const database = new DatabaseSync(databasePath)
database.exec("PRAGMA journal_mode = WAL")
database.exec("PRAGMA busy_timeout = 5000")
database.exec(`
  CREATE TABLE IF NOT EXISTS __schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`)

const applied = new Set(
  database.prepare("SELECT name FROM __schema_migrations").all().map((row) => row.name),
)
const migrations = readdirSync(migrationsPath)
  .filter((name) => name.endsWith(".sql"))
  .sort()

for (const name of migrations) {
  if (applied.has(name)) continue
  const sql = readFileSync(resolve(migrationsPath, name), "utf8")
    .replaceAll("--> statement-breakpoint", "")

  database.exec("BEGIN IMMEDIATE")
  try {
    database.exec(sql)
    database.prepare("INSERT INTO __schema_migrations (name) VALUES (?)").run(name)
    database.exec("COMMIT")
  } catch (error) {
    database.exec("ROLLBACK")
    throw error
  }
}

database.close()
console.log(`Applied ${migrations.length} database migration(s).`)
