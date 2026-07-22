"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowUpRight,
  Check,
  Clock3,
  Eye,
  FilePenLine,
  FilePlus2,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Save,
} from "lucide-react"

import { ArticleMarkdown } from "@/components/article-markdown"
import { ResilientImage } from "@/components/resilient-image"
import type { ArticleInput, ArticleStatus, ArticleSummary, EditableArticle } from "@/lib/blog-types"

type AdminEditorProps = {
  displayName: string
}

type EditorPane = "edit" | "preview"

function localDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function createBlankArticle(): EditableArticle {
  const today = localDate()
  return {
    slug: "",
    title: "",
    description: "",
    content: "",
    category: "随笔",
    tags: [],
    image: "",
    sourceLink: "",
    status: "draft",
    published: today,
    updated: today,
    readingMinutes: 1,
    source: "database",
    editable: true,
    protected: false,
  }
}

function slugify(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
}

function cacheKey(slug: string | null): string {
  return `ruawd-editor:${slug ?? "new"}`
}

function readCachedArticle(slug: string | null): EditableArticle | null {
  try {
    const value = window.localStorage.getItem(cacheKey(slug))
    if (!value) return null
    const parsed = JSON.parse(value) as { article?: EditableArticle }
    return parsed.article ?? null
  } catch {
    return null
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error || "请求失败，请稍后重试")
  return body
}

export function AdminEditor({ displayName }: AdminEditorProps) {
  const [posts, setPosts] = useState<ArticleSummary[]>([])
  const [draft, setDraft] = useState<EditableArticle | null>(null)
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [pane, setPane] = useState<EditorPane>("edit")
  const [loadingList, setLoadingList] = useState(true)
  const [loadingArticle, setLoadingArticle] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadInitialData() {
      setLoadingList(true)
      try {
        const { posts: loadedPosts } = await readJson<{ posts: ArticleSummary[] }>(
          await fetch("/api/admin/posts", { cache: "no-store" }),
        )
        if (cancelled) return
        setPosts(loadedPosts)

        if (loadedPosts[0]) {
          const { post } = await readJson<{ post: EditableArticle }>(
            await fetch(`/api/admin/posts/${encodeURIComponent(loadedPosts[0].slug)}`, { cache: "no-store" }),
          )
          if (cancelled) return
          const cached = readCachedArticle(post.slug)
          setActiveSlug(post.slug)
          setDraft(cached ?? post)
          setDirty(Boolean(cached))
          setMessage(cached ? "已恢复这篇文章在本机未保存的内容" : "")
        } else {
          const cached = readCachedArticle(null)
          setDraft(cached ?? createBlankArticle())
          setDirty(Boolean(cached))
        }
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "文章列表读取失败")
      } finally {
        if (!cancelled) setLoadingList(false)
      }
    }

    void loadInitialData()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!draft || !dirty) return
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(
        cacheKey(activeSlug),
        JSON.stringify({ article: draft, savedAt: new Date().toISOString() }),
      )
    }, 500)
    return () => window.clearTimeout(timer)
  }, [activeSlug, dirty, draft])

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!dirty) return
      event.preventDefault()
    }
    window.addEventListener("beforeunload", warnBeforeLeaving)
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving)
  }, [dirty])

  useEffect(() => {
    const saveWithShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return
      event.preventDefault()
      if (draft && !saving && draft.editable) void saveArticle(draft.status)
    }
    document.addEventListener("keydown", saveWithShortcut)
    return () => document.removeEventListener("keydown", saveWithShortcut)
  })

  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => b.updated.localeCompare(a.updated)),
    [posts],
  )

  async function refreshList() {
    const { posts: refreshed } = await readJson<{ posts: ArticleSummary[] }>(
      await fetch("/api/admin/posts", { cache: "no-store" }),
    )
    setPosts(refreshed)
  }

  async function openArticle(slug: string) {
    if (slug === activeSlug && draft) return
    setLoadingArticle(true)
    setError("")
    setMessage("")
    try {
      const { post } = await readJson<{ post: EditableArticle }>(
        await fetch(`/api/admin/posts/${encodeURIComponent(slug)}`, { cache: "no-store" }),
      )
      const cached = readCachedArticle(slug)
      setActiveSlug(slug)
      setDraft(cached ?? post)
      setDirty(Boolean(cached))
      setSlugTouched(true)
      setMessage(cached ? "已恢复这篇文章在本机未保存的内容" : "")
      setPane("edit")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "文章读取失败")
    } finally {
      setLoadingArticle(false)
    }
  }

  function startNewArticle() {
    const cached = readCachedArticle(null)
    setActiveSlug(null)
    setDraft(cached ?? createBlankArticle())
    setDirty(Boolean(cached))
    setSlugTouched(Boolean(cached?.slug))
    setError("")
    setMessage(cached ? "已恢复上次未保存的新文章" : "")
    setPane("edit")
  }

  function updateDraft<K extends keyof EditableArticle>(key: K, value: EditableArticle[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : current)
    setDirty(true)
    setMessage("")
    setError("")
  }

  function updateTitle(title: string) {
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        title,
        slug: activeSlug || slugTouched ? current.slug : slugify(title),
      }
    })
    setDirty(true)
    setMessage("")
  }

  async function saveArticle(status: ArticleStatus) {
    if (!draft || saving || !draft.editable) return
    setSaving(true)
    setError("")
    setMessage("")

    const payload: ArticleInput = {
      slug: draft.slug,
      title: draft.title,
      description: draft.description,
      content: draft.content,
      category: draft.category,
      tags: draft.tags,
      image: draft.image,
      sourceLink: draft.sourceLink,
      status,
      published: draft.published,
    }

    try {
      const endpoint = activeSlug
        ? `/api/admin/posts/${encodeURIComponent(activeSlug)}`
        : "/api/admin/posts"
      const response = await fetch(endpoint, {
        method: activeSlug ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      const { post } = await readJson<{ post: EditableArticle }>(response)
      window.localStorage.removeItem(cacheKey(activeSlug))
      if (!activeSlug) window.localStorage.removeItem(cacheKey(null))
      setDraft(post)
      setActiveSlug(post.slug)
      setDirty(false)
      setSlugTouched(true)
      setMessage(status === "published" ? "文章已发布，前台现在可以看到" : "草稿已保存")
      await refreshList()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "文章保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-workspace" aria-label="文章编辑工作区">
      <aside className="admin-post-sidebar">
        <div className="admin-sidebar-heading">
          <div>
            <span>文章</span>
            <small>{posts.length} 篇</small>
          </div>
          <button type="button" onClick={startNewArticle} aria-label="新建文章">
            <FilePlus2 aria-hidden="true" />
          </button>
        </div>

        <div className="admin-post-list" aria-busy={loadingList}>
          {loadingList ? (
            <div className="admin-list-state"><LoaderCircle aria-hidden="true" />正在读取文章</div>
          ) : sortedPosts.length ? sortedPosts.map((post) => (
            <button
              className="admin-post-item"
              data-active={activeSlug === post.slug}
              type="button"
              key={post.slug}
              onClick={() => void openArticle(post.slug)}
            >
              <span>
                {post.protected ? <LockKeyhole aria-hidden="true" /> : <FilePenLine aria-hidden="true" />}
                {post.status === "published" ? "已发布" : "草稿"}
              </span>
              <strong>{post.title}</strong>
              <small>{post.category} · {post.updated}</small>
            </button>
          )) : (
            <div className="admin-list-state">还没有文章，从新建开始。</div>
          )}
        </div>

        <p className="admin-signed-in">当前账号：{displayName}</p>
      </aside>

      <div className="admin-editor-area" data-pane={pane}>
        <div className="admin-mobile-tabs" role="tablist" aria-label="编辑器视图">
          <button type="button" role="tab" aria-selected={pane === "edit"} onClick={() => setPane("edit")}>
            <FilePenLine aria-hidden="true" />编辑
          </button>
          <button type="button" role="tab" aria-selected={pane === "preview"} onClick={() => setPane("preview")}>
            <Eye aria-hidden="true" />预览
          </button>
        </div>

        <form className="admin-form" onSubmit={(event) => { event.preventDefault(); void saveArticle(draft?.status ?? "draft") }}>
          {loadingArticle || !draft ? (
            <div className="admin-editor-state"><LoaderCircle aria-hidden="true" />正在读取文章</div>
          ) : (
            <>
              <div className="admin-form-topline">
                <div>
                  <span className={`admin-status-badge is-${draft.status}`}>
                    {draft.status === "published" ? <Check aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
                    {draft.status === "published" ? "已发布" : "草稿"}
                  </span>
                  <span>{dirty ? "有未保存修改" : "内容已同步"}</span>
                </div>
                {draft.status === "published" && activeSlug ? (
                  <Link href={`/blog/${activeSlug}`} target="_blank">
                    查看文章 <ArrowUpRight aria-hidden="true" />
                  </Link>
                ) : null}
              </div>

              {!draft.editable ? (
                <div className="admin-form-notice" role="status">
                  <LockKeyhole aria-hidden="true" />
                  这是一篇密码保护文章。为避免破坏加密正文，请继续在原内容源中编辑。
                </div>
              ) : null}

              <div className="admin-field admin-title-field">
                <label htmlFor="article-title">标题</label>
                <input
                  id="article-title"
                  value={draft.title}
                  onChange={(event) => updateTitle(event.target.value)}
                  placeholder="这篇文章想讲什么？"
                  disabled={!draft.editable}
                  required
                />
              </div>

              <div className="admin-field-grid">
                <div className="admin-field">
                  <label htmlFor="article-slug">链接标识</label>
                  <input
                    id="article-slug"
                    value={draft.slug}
                    onChange={(event) => { setSlugTouched(true); updateDraft("slug", slugify(event.target.value)) }}
                    placeholder="my-new-post"
                    disabled={Boolean(activeSlug) || !draft.editable}
                    required
                  />
                  <small>发布地址：/blog/{draft.slug || "my-new-post"}</small>
                </div>
                <div className="admin-field">
                  <label htmlFor="article-date">发布日期</label>
                  <input
                    id="article-date"
                    type="date"
                    value={draft.published}
                    onChange={(event) => updateDraft("published", event.target.value)}
                    disabled={!draft.editable}
                    required
                  />
                </div>
              </div>

              <div className="admin-field-grid">
                <div className="admin-field">
                  <label htmlFor="article-category">分类</label>
                  <input
                    id="article-category"
                    value={draft.category}
                    onChange={(event) => updateDraft("category", event.target.value)}
                    placeholder="技术踩坑"
                    disabled={!draft.editable}
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="article-tags">标签</label>
                  <input
                    id="article-tags"
                    value={draft.tags.join(", ")}
                    onChange={(event) => updateDraft("tags", event.target.value.split(/[，,]/).map((tag) => tag.trim()).filter(Boolean))}
                    placeholder="Next.js, VPS, 教程"
                    disabled={!draft.editable}
                  />
                </div>
              </div>

              <div className="admin-field">
                <label htmlFor="article-description">摘要</label>
                <textarea
                  id="article-description"
                  value={draft.description}
                  onChange={(event) => updateDraft("description", event.target.value)}
                  placeholder="用两三句话说明文章内容。"
                  rows={3}
                  disabled={!draft.editable}
                />
              </div>

              <details className="admin-extra-fields">
                <summary>封面与来源</summary>
                <div className="admin-field">
                  <label htmlFor="article-image">封面图片地址</label>
                  <input
                    id="article-image"
                    type="url"
                    value={draft.image}
                    onChange={(event) => updateDraft("image", event.target.value)}
                    placeholder="https://example.com/cover.webp"
                    disabled={!draft.editable}
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="article-source">来源链接</label>
                  <input
                    id="article-source"
                    type="url"
                    value={draft.sourceLink}
                    onChange={(event) => updateDraft("sourceLink", event.target.value)}
                    placeholder="https://example.com/report"
                    disabled={!draft.editable}
                  />
                </div>
              </details>

              <div className="admin-field admin-content-field">
                <div className="admin-field-label-row">
                  <label htmlFor="article-content">正文</label>
                  <span>支持 Markdown</span>
                </div>
                <textarea
                  id="article-content"
                  value={draft.content}
                  onChange={(event) => updateDraft("content", event.target.value)}
                  placeholder={"## 从这里开始\n\n写下正文，右侧会同步预览。"}
                  spellCheck="false"
                  disabled={!draft.editable}
                />
              </div>

              <div className="admin-savebar">
                <div aria-live="polite">
                  {error ? <span className="admin-error">{error}</span> : null}
                  {!error && message ? <span className="admin-success">{message}</span> : null}
                  {!error && !message && dirty ? <span>未保存内容已临时保存在本机</span> : null}
                </div>
                <div>
                  <button type="button" className="admin-secondary-button" onClick={() => void saveArticle("draft")} disabled={saving || !draft.editable}>
                    {saving ? <LoaderCircle aria-hidden="true" /> : <Save aria-hidden="true" />}
                    保存草稿
                  </button>
                  <button type="button" className="admin-primary-button" onClick={() => void saveArticle("published")} disabled={saving || !draft.editable}>
                    {saving ? <LoaderCircle aria-hidden="true" /> : <Check aria-hidden="true" />}
                    发布文章
                  </button>
                </div>
              </div>
            </>
          )}
        </form>

        <aside className="admin-preview" aria-label="文章实时预览">
          <header>
            <div>
              <Eye aria-hidden="true" />
              <span>实时预览</span>
            </div>
            <button type="button" onClick={() => setDraft((current) => current ? { ...current } : current)} aria-label="刷新预览">
              <RefreshCw aria-hidden="true" />
            </button>
          </header>
          <div className="admin-preview-canvas">
            {draft ? (
              <article>
                <p className="section-kicker">{draft.category || "未分类"} / PREVIEW</p>
                <h1>{draft.title || "未命名文章"}</h1>
                <p className="admin-preview-description">{draft.description || "文章摘要会显示在这里。"}</p>
                <div className="admin-preview-meta">
                  <time dateTime={draft.published}>{draft.published}</time>
                  <span>{draft.tags.length ? draft.tags.map((tag) => `#${tag}`).join("  ") : "暂未添加标签"}</span>
                </div>
                {draft.image ? (
                  <ResilientImage className="admin-preview-cover" src={draft.image} alt="文章封面预览" />
                ) : null}
                {draft.content ? (
                  <ArticleMarkdown content={draft.content} />
                ) : (
                  <div className="admin-preview-empty">开始写正文后，这里会同步显示排版效果。</div>
                )}
              </article>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  )
}
