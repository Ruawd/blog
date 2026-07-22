import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs"
import { basename, dirname, join } from "node:path"
import { backup, DatabaseSync } from "node:sqlite"

import { getDatabase, getDatabasePath } from "@/db"

export type DatabaseBackup = {
  name: string
  size: number
  createdAt: string
}

function backupDirectory(): string {
  const directory = process.env.BACKUP_PATH?.trim()
    || join(/* turbopackIgnore: true */ dirname(getDatabasePath()), "backups")
  mkdirSync(directory, { recursive: true })
  return directory
}

function safeName(value: string): string {
  const name = basename(value)
  if (!/^blog-\d{8}-\d{6}\.sqlite$/.test(name)) throw new Error("备份文件名不正确")
  return name
}

function backupPath(name: string): string {
  return join(backupDirectory(), safeName(name))
}

export function listDatabaseBackups(): DatabaseBackup[] {
  return readdirSync(backupDirectory())
    .filter((name) => /^blog-\d{8}-\d{6}\.sqlite$/.test(name))
    .flatMap((name) => {
      try {
        const stats = statSync(join(backupDirectory(), name))
        return [{ name, size: stats.size, createdAt: stats.mtime.toISOString() }]
      } catch {
        return []
      }
    })
    .sort((left, right) => right.name.localeCompare(left.name))
}

export async function createDatabaseBackup(): Promise<DatabaseBackup> {
  const stamp = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date()).replace(/[-: ]/g, "")
  const name = `blog-${stamp.slice(0, 8)}-${stamp.slice(8)}.sqlite`
  await backup(getDatabase(), backupPath(name))
  const backups = listDatabaseBackups()
  backups.slice(20).forEach((item) => rmSync(backupPath(item.name), { force: true }))
  const stats = statSync(backupPath(name))
  return { name, size: stats.size, createdAt: stats.mtime.toISOString() }
}

export function readDatabaseBackup(name: string): Buffer {
  return readFileSync(backupPath(name))
}

export function deleteDatabaseBackup(name: string): boolean {
  const path = backupPath(name)
  try {
    rmSync(path)
    return true
  } catch {
    return false
  }
}

export function stageDatabaseRestore(payload: Buffer): void {
  if (payload.length < 100 || payload.length > 100 * 1024 * 1024) throw new Error("备份文件大小不正确")
  if (payload.subarray(0, 16).toString("utf8") !== "SQLite format 3\0") throw new Error("这不是有效的 SQLite 数据库")
  const target = getDatabasePath()
  const temporaryPath = `${target}.restore-check-${process.pid}-${Date.now()}`
  const pendingPath = `${target}.restore-pending`
  writeFileSync(temporaryPath, payload, { mode: 0o600 })
  let candidate: DatabaseSync | null = null
  try {
    candidate = new DatabaseSync(temporaryPath, { readOnly: true })
    const integrity = candidate.prepare("PRAGMA integrity_check").get() as Record<string, unknown> | undefined
    if (!integrity || !Object.values(integrity).includes("ok")) throw new Error("数据库完整性检查未通过")
    candidate.close()
    candidate = null
    renameSync(temporaryPath, pendingPath)
  } finally {
    candidate?.close()
    rmSync(temporaryPath, { force: true })
  }
}
