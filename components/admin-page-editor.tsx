"use client"

import { useEffect, useState } from "react"
import { Check, ExternalLink, FileText, LoaderCircle, RefreshCw, Save } from "lucide-react"

import { ArticleMarkdown } from "@/components/article-markdown"
import { BorderBeam } from "@/components/ui/border-beam"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import type { PageContent } from "@/lib/page-content"

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error || "请求失败")
  return body
}

export function AdminPageEditor() {
  const [pages, setPages] = useState<PageContent[]>([])
  const [active, setActive] = useState<PageContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  async function load() {
    setLoading(true)
    setError("")
    try {
      const data = await readJson<{ pages: PageContent[] }>(await fetch("/api/admin/pages", { cache: "no-store" }))
      setPages(data.pages)
      setActive((current) => data.pages.find((page) => page.key === current?.key) || data.pages[0] || null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "页面读取失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function loadInitialPages() {
      try {
        const data = await readJson<{ pages: PageContent[] }>(await fetch("/api/admin/pages", { cache: "no-store" }))
        if (cancelled) return
        setPages(data.pages)
        setActive(data.pages[0] || null)
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "页面读取失败")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadInitialPages()
    return () => { cancelled = true }
  }, [])

  function update(field: "eyebrow" | "title" | "description" | "body", value: string) {
    setActive((current) => current ? { ...current, [field]: value } : current)
    setMessage("")
    setError("")
  }

  async function save() {
    if (!active || saving) return
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const data = await readJson<{ page: PageContent }>(await fetch(`/api/admin/pages/${active.key}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(active),
      }))
      setActive(data.page)
      setPages((current) => current.map((page) => page.key === data.page.key ? data.page : page))
      setMessage("页面内容已保存，前台立即生效")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-content-workspace" aria-label="页面内容编辑器">
      <aside className="admin-content-list">
        <header><div><p>站内页面</p><strong>{pages.length} 个</strong></div><button type="button" onClick={() => void load()} aria-label="刷新页面列表" disabled={loading}><RefreshCw className={loading ? "spin" : ""} aria-hidden="true" /></button></header>
        {loading ? <p className="admin-inline-loading"><LoaderCircle className="spin" aria-hidden="true" />正在读取</p> : (
          <div>
            {pages.map((page) => <button type="button" className={active?.key === page.key ? "is-active" : ""} onClick={() => { setActive(page); setError(""); setMessage("") }} key={page.key}><FileText aria-hidden="true" /><span><strong>{page.label}</strong><small>{page.path}</small></span></button>)}
          </div>
        )}
      </aside>

      {active ? (
        <div className="admin-page-editor magic-surface">
          <BorderBeam size={140} duration={12} colorFrom="#111111" colorTo="#b7b7b7" borderWidth={1} />
          <header className="admin-page-editor-heading"><div><p className="section-kicker">PAGE / CONTENT</p><h2>{active.label}</h2></div><a href={active.path} target="_blank" rel="noreferrer">打开页面<ExternalLink aria-hidden="true" /></a></header>
          <div className="admin-page-editor-grid">
            <div className="admin-page-fields">
              <label><span>英文抬头</span><input value={active.eyebrow} onChange={(event) => update("eyebrow", event.target.value)} maxLength={80} /></label>
              <label><span>页面标题 *</span><input value={active.title} onChange={(event) => update("title", event.target.value)} maxLength={120} required /></label>
              <label><span>页面说明</span><textarea value={active.description} onChange={(event) => update("description", event.target.value)} maxLength={500} rows={3} /></label>
              <label><span>补充正文（Markdown）</span><textarea className="admin-page-body-input" value={active.body} onChange={(event) => update("body", event.target.value)} rows={16} spellCheck={false} /></label>
            </div>
            <section className="admin-page-preview" aria-label="页面内容预览"><p className="eyebrow">{active.eyebrow}</p><h3>{active.title}</h3><p>{active.description}</p>{active.body ? <ArticleMarkdown content={active.body} /> : <div className="admin-preview-empty">补充正文会显示在这里</div>}</section>
          </div>
          <footer className="admin-page-editor-footer"><p className={error ? "is-error" : message ? "is-success" : ""} role="status">{error || message || "标题和说明用于页面抬头，正文支持 Markdown。"}</p><ShimmerButton type="button" onClick={() => void save()} disabled={saving}>{saving ? <LoaderCircle className="spin" aria-hidden="true" /> : message ? <Check aria-hidden="true" /> : <Save aria-hidden="true" />}{saving ? "保存中" : "保存页面"}</ShimmerButton></footer>
        </div>
      ) : null}
    </section>
  )
}
