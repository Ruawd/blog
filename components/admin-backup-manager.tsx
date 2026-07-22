"use client"

import { useEffect, useRef, useState } from "react"
import { Database, Download, LoaderCircle, RefreshCw, ShieldCheck, Trash2, Upload } from "lucide-react"

type Backup = { name: string; size: number; createdAt: string }

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(payload.error || "请求失败")
  return payload
}

const sizeFormatter = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 1 })
const dateFormatter = new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" })

export function AdminBackupManager() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function refresh() {
    setLoading(true)
    try {
      const data = await readJson<{ backups: Backup[] }>(await fetch("/api/admin/backups", { cache: "no-store" }))
      setBackups(data.backups)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "备份列表读取失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh() }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  async function createBackup() {
    if (busy) return
    setBusy("create")
    setError("")
    setMessage("")
    try {
      const data = await readJson<{ backups: Backup[] }>(await fetch("/api/admin/backups", { method: "POST" }))
      setBackups(data.backups)
      setMessage("数据库备份已创建")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "备份创建失败")
    } finally {
      setBusy("")
    }
  }

  async function removeBackup(name: string) {
    if (busy || !window.confirm(`确定删除备份 ${name} 吗？`)) return
    setBusy(name)
    setError("")
    try {
      await readJson(await fetch(`/api/admin/backups/${encodeURIComponent(name)}`, { method: "DELETE" }))
      setBackups((current) => current.filter((item) => item.name !== name))
      setMessage("备份已删除")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "备份删除失败")
    } finally {
      setBusy("")
    }
  }

  async function restoreBackup(file: File) {
    if (busy || !window.confirm("恢复数据库会覆盖当前数据，并需要重启容器后生效。确定继续吗？")) return
    setBusy("restore")
    setError("")
    setMessage("")
    try {
      const form = new FormData()
      form.set("file", file)
      await readJson(await fetch("/api/admin/backups/restore", { method: "POST", body: form }))
      setMessage("恢复文件已通过完整性检查。请重启网站容器使其生效；当前数据库尚未被覆盖。")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "恢复文件校验失败")
    } finally {
      setBusy("")
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <section className="admin-backup-manager" aria-labelledby="admin-backup-title">
      <header>
        <div>
          <p className="section-kicker">DATABASE / SAFETY</p>
          <h2 id="admin-backup-title">数据库备份</h2>
          <p>在线备份 SQLite，最多保留 20 份；恢复文件会先进行完整性检查。</p>
        </div>
        <div>
          <button type="button" onClick={() => void refresh()} disabled={loading || Boolean(busy)} aria-label="刷新备份列表">
            <RefreshCw className={loading ? "spin" : ""} aria-hidden="true" />刷新
          </button>
          <button className="is-primary" type="button" onClick={() => void createBackup()} disabled={Boolean(busy)}>
            {busy === "create" ? <LoaderCircle className="spin" aria-hidden="true" /> : <Database aria-hidden="true" />}
            创建备份
          </button>
        </div>
      </header>

      <div className="admin-backup-restore">
        <ShieldCheck aria-hidden="true" />
        <div><strong>从备份恢复</strong><p>上传 `.sqlite` 后仅暂存，重启容器时才会原子替换当前数据库。</p></div>
        <label>
          <Upload aria-hidden="true" />选择文件
          <input ref={fileRef} type="file" accept=".sqlite,application/vnd.sqlite3" disabled={Boolean(busy)} onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void restoreBackup(file)
          }} />
        </label>
      </div>

      {error || message ? <p className={error ? "admin-error" : "admin-success"} role={error ? "alert" : "status"}>{error || message}</p> : null}

      <div className="admin-backup-list" aria-busy={loading}>
        {loading ? (
          <div className="admin-backup-empty"><LoaderCircle className="spin" aria-hidden="true" />正在读取备份</div>
        ) : backups.length ? backups.map((backup) => (
          <article key={backup.name}>
            <Database aria-hidden="true" />
            <div><strong>{backup.name}</strong><small>{dateFormatter.format(new Date(backup.createdAt))} · {sizeFormatter.format(backup.size / 1024)} KB</small></div>
            <a href={`/api/admin/backups/${encodeURIComponent(backup.name)}`} download><Download aria-hidden="true" />下载</a>
            <button type="button" onClick={() => void removeBackup(backup.name)} disabled={Boolean(busy)} aria-label={`删除 ${backup.name}`}>
              {busy === backup.name ? <LoaderCircle className="spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
            </button>
          </article>
        )) : (
          <div className="admin-backup-empty"><Database aria-hidden="true" />还没有数据库备份</div>
        )}
      </div>
    </section>
  )
}
