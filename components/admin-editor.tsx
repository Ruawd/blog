"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowUpRight,
  CalendarClock,
  Check,
  Clock3,
  Eye,
  FilePenLine,
  FilePlus2,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LockOpen,
  History,
  RefreshCw,
  Save,
} from "lucide-react"

import { ArticleMarkdown } from "@/components/article-markdown"
import { ResilientImage } from "@/components/resilient-image"
import { decryptArticleContent, encryptArticleContent } from "@/lib/article-crypto"
import type { ArticleInput, ArticleStatus, ArticleSummary, EditableArticle } from "@/lib/blog-types"

type AdminEditorProps = {
  displayName: string
}

type EditorPane = "edit" | "preview"
type ServerAutosave = { article: EditableArticle; updatedAt: string }
type PostRevision = { id: number; slug: string; title: string; status: ArticleStatus; updatedBy: string; createdAt: string }

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
    scheduledAt: "",
    updated: today,
    readingMinutes: 1,
    source: "database",
    editable: true,
    protected: false,
    passwordHint: "",
  }
}

function estimateReadingMinutes(content: string): number {
  const chineseCharacters = (content.match(/[\u3400-\u9fff]/g) ?? []).length
  const latinWords = (content.replace(/[\u3400-\u9fff]/g, " ").match(/[\p{L}\p{N}]+/gu) ?? []).length
  return Math.max(1, Math.ceil(chineseCharacters / 400 + latinWords / 220))
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
    return parsed.article ? { ...parsed.article, scheduledAt: parsed.article.scheduledAt || "" } : null
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
  const [unlockPassword, setUnlockPassword] = useState("")
  const [protectedPassword, setProtectedPassword] = useState("")
  const [protectedUnlocked, setProtectedUnlocked] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [autosaving, setAutosaving] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [revisions, setRevisions] = useState<PostRevision[]>([])
  const [loadingRevisions, setLoadingRevisions] = useState(false)
  const [restoringRevision, setRestoringRevision] = useState<number | null>(null)
  const canEdit = Boolean(draft?.editable && (!draft.protected || protectedUnlocked))

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
          const { post, autosave } = await readJson<{ post: EditableArticle; autosave: ServerAutosave | null }>(
            await fetch(`/api/admin/posts/${encodeURIComponent(loadedPosts[0].slug)}`, { cache: "no-store" }),
          )
          if (cancelled) return
          const cached = post.protected ? null : readCachedArticle(post.slug)
          setActiveSlug(post.slug)
          const recovered = cached ?? autosave?.article ?? post
          setDraft({ ...recovered, scheduledAt: recovered.scheduledAt || "" })
          setDirty(Boolean(cached || autosave))
          setProtectedUnlocked(false)
          setProtectedPassword("")
          setUnlockPassword("")
          setMessage(cached
            ? "已恢复这篇文章在本机未保存的内容"
            : autosave
              ? `已恢复服务器自动保存内容（${new Date(autosave.updatedAt).toLocaleString("zh-CN")}）`
              : "")
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
    if (!draft || !dirty || draft.protected) return
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(
        cacheKey(activeSlug),
        JSON.stringify({ article: draft, savedAt: new Date().toISOString() }),
      )
    }, 500)
    return () => window.clearTimeout(timer)
  }, [activeSlug, dirty, draft])

  useEffect(() => {
    if (!activeSlug || !draft || !dirty || draft.protected || saving) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setAutosaving(true)
      try {
        await readJson(await fetch(`/api/admin/posts/${encodeURIComponent(activeSlug)}/autosave`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ article: draft }),
          signal: controller.signal,
        }))
        setMessage("未发布修改已自动保存到服务器")
      } catch (reason) {
        if ((reason as Error).name !== "AbortError") setMessage("本机草稿已保存，服务器自动保存暂时失败")
      } finally {
        if (!controller.signal.aborted) setAutosaving(false)
      }
    }, 4_000)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [activeSlug, dirty, draft, saving])

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
      if (draft && !saving && canEdit) void saveArticle(draft.status)
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
    if (dirty && draft?.protected && !window.confirm("当前加密文章有未保存修改，确定要离开吗？")) return
    setLoadingArticle(true)
    setError("")
    setMessage("")
    try {
      const { post, autosave } = await readJson<{ post: EditableArticle; autosave: ServerAutosave | null }>(
        await fetch(`/api/admin/posts/${encodeURIComponent(slug)}`, { cache: "no-store" }),
      )
      const cached = post.protected ? null : readCachedArticle(slug)
      const recovered = cached ?? autosave?.article ?? post
      setActiveSlug(slug)
      setDraft({ ...recovered, scheduledAt: recovered.scheduledAt || "" })
      setDirty(Boolean(cached || autosave))
      setProtectedUnlocked(false)
      setProtectedPassword("")
      setUnlockPassword("")
      setSlugTouched(true)
      setMessage(cached
        ? "已恢复这篇文章在本机未保存的内容"
        : autosave
          ? `已恢复服务器自动保存内容（${new Date(autosave.updatedAt).toLocaleString("zh-CN")}）`
          : "")
      setHistoryOpen(false)
      setRevisions([])
      setPane("edit")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "文章读取失败")
    } finally {
      setLoadingArticle(false)
    }
  }

  function startNewArticle() {
    if (dirty && draft?.protected && !window.confirm("当前加密文章有未保存修改，确定要新建文章吗？")) return
    const cached = readCachedArticle(null)
    setActiveSlug(null)
    setDraft(cached ?? createBlankArticle())
    setDirty(Boolean(cached))
    setSlugTouched(Boolean(cached?.slug))
    setError("")
    setMessage(cached ? "已恢复上次未保存的新文章" : "")
    setProtectedUnlocked(false)
    setProtectedPassword("")
    setUnlockPassword("")
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

  async function unlockProtectedArticle() {
    if (!draft?.protected || !draft.encrypted || unlocking || !unlockPassword) return
    setUnlocking(true)
    setError("")
    setMessage("")
    try {
      const content = await decryptArticleContent(draft.encrypted, unlockPassword)
      setDraft((current) => current ? { ...current, content } : current)
      setProtectedPassword(unlockPassword)
      setProtectedUnlocked(true)
      setUnlockPassword("")
      setMessage("文章已在当前浏览器中解锁，可以编辑和预览")
    } catch {
      setError("文章密码不正确，请重新输入")
    } finally {
      setUnlocking(false)
    }
  }

  async function saveArticle(status: ArticleStatus) {
    if (!draft || saving || !canEdit) return
    setSaving(true)
    setError("")
    setMessage("")

    try {
      if (draft.protected && !protectedPassword) throw new Error("请先使用文章密码解锁正文")
      const encrypted = draft.protected
        ? await encryptArticleContent(draft.content, protectedPassword)
        : undefined
      const payload: ArticleInput = {
        slug: draft.slug,
        title: draft.title,
        description: draft.description,
        content: draft.protected ? "" : draft.content,
        category: draft.category,
        tags: draft.tags,
        image: draft.image,
        sourceLink: draft.sourceLink,
        status,
        published: draft.published,
        scheduledAt: draft.scheduledAt,
        protected: draft.protected,
        passwordHint: draft.passwordHint,
        readingMinutes: estimateReadingMinutes(draft.content),
        encrypted,
      }
      const endpoint = activeSlug
        ? `/api/admin/posts/${encodeURIComponent(activeSlug)}`
        : "/api/admin/posts"
      const response = await fetch(endpoint, {
        method: activeSlug ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      const { post } = await readJson<{ post: EditableArticle }>(response)
      if (!draft.protected) {
        window.localStorage.removeItem(cacheKey(activeSlug))
        if (!activeSlug) window.localStorage.removeItem(cacheKey(null))
      }
      setDraft(post.protected ? { ...post, content: draft.content, encrypted } : post)
      setActiveSlug(post.slug)
      setDirty(false)
      setSlugTouched(true)
      setMessage(
        post.protected
          ? status === "published"
            ? "加密正文已重新加密并发布"
            : status === "scheduled"
              ? `加密文章已安排在 ${post.scheduledAt.replace("T", " ")} 发布`
              : "加密草稿已安全保存"
          : status === "published"
            ? "文章已发布，前台现在可以看到"
            : status === "scheduled"
              ? `文章已安排在 ${post.scheduledAt.replace("T", " ")} 发布`
              : "草稿已保存",
      )
      await refreshList()
      if (historyOpen) await loadRevisions(post.slug)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "文章保存失败")
    } finally {
      setSaving(false)
    }
  }

  async function loadRevisions(slug = activeSlug) {
    if (!slug) return
    setLoadingRevisions(true)
    try {
      const data = await readJson<{ revisions: PostRevision[] }>(
        await fetch(`/api/admin/posts/${encodeURIComponent(slug)}/revisions`, { cache: "no-store" }),
      )
      setRevisions(data.revisions)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "历史版本读取失败")
    } finally {
      setLoadingRevisions(false)
    }
  }

  async function toggleHistory() {
    const next = !historyOpen
    setHistoryOpen(next)
    if (next && activeSlug) await loadRevisions(activeSlug)
  }

  async function restoreRevision(revision: PostRevision) {
    if (!activeSlug || restoringRevision || !window.confirm(`确定恢复 ${new Date(revision.createdAt).toLocaleString("zh-CN")} 的版本吗？当前版本会自动进入历史记录。`)) return
    setRestoringRevision(revision.id)
    setError("")
    try {
      const data = await readJson<{ post: EditableArticle; revisions: PostRevision[] }>(await fetch(
        `/api/admin/posts/${encodeURIComponent(activeSlug)}/revisions`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ revisionId: revision.id }),
        },
      ))
      setDraft({ ...data.post, scheduledAt: data.post.scheduledAt || "" })
      setRevisions(data.revisions)
      setDirty(false)
      setMessage("历史版本已恢复")
      await refreshList()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "历史版本恢复失败")
    } finally {
      setRestoringRevision(null)
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
                {post.status === "published" ? "已发布" : post.status === "scheduled" ? "定时" : "草稿"}
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
                    {draft.status === "published" ? <Check aria-hidden="true" /> : draft.status === "scheduled" ? <CalendarClock aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
                    {draft.status === "published" ? "已发布" : draft.status === "scheduled" ? "等待定时发布" : "草稿"}
                  </span>
                  <span>{autosaving ? "正在自动保存" : dirty ? "有未保存修改" : "内容已同步"}</span>
                </div>
                <div className="admin-topline-actions">
                  {activeSlug ? (
                    <button type="button" onClick={() => void toggleHistory()} aria-expanded={historyOpen}>
                      <History aria-hidden="true" />历史版本
                    </button>
                  ) : null}
                  {draft.status === "published" && activeSlug ? (
                    <Link href={`/blog/${activeSlug}`} target="_blank">
                      查看文章 <ArrowUpRight aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
              </div>

              {draft.protected && !protectedUnlocked ? (
                <section className="admin-protected-unlock" aria-labelledby="admin-protected-title">
                  <div className="admin-protected-heading">
                    <LockKeyhole aria-hidden="true" />
                    <div>
                      <strong id="admin-protected-title">解锁后编辑加密文章</strong>
                      <p>正文只在当前浏览器中解密；保存时会使用同一密码重新加密。</p>
                    </div>
                  </div>
                  {draft.passwordHint ? <p className="admin-protected-hint">提示：{draft.passwordHint}</p> : null}
                  <div className="admin-protected-controls">
                    <label htmlFor="admin-article-password">文章密码</label>
                    <div>
                      <input
                        id="admin-article-password"
                        type="password"
                        value={unlockPassword}
                        onChange={(event) => { setUnlockPassword(event.target.value); setError("") }}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter") return
                          event.preventDefault()
                          void unlockProtectedArticle()
                        }}
                        autoComplete="current-password"
                        aria-describedby={error ? "admin-protected-error" : undefined}
                        disabled={unlocking || !draft.encrypted}
                      />
                      <button
                        type="button"
                        onClick={() => void unlockProtectedArticle()}
                        disabled={unlocking || !unlockPassword || !draft.encrypted}
                        aria-busy={unlocking}
                      >
                        {unlocking ? <LoaderCircle aria-hidden="true" /> : <KeyRound aria-hidden="true" />}
                        {unlocking ? "正在解锁" : "解锁并编辑"}
                      </button>
                    </div>
                    {!draft.encrypted ? <p role="alert">没有读取到加密正文，请刷新页面后重试。</p> : null}
                    {error ? <p id="admin-protected-error" role="alert">{error}</p> : null}
                  </div>
                </section>
              ) : draft.protected ? (
                <div className="admin-form-notice is-unlocked" role="status">
                  <LockOpen aria-hidden="true" />
                  已在当前浏览器中解锁。保存时正文会重新加密，密码不会写入数据库。
                </div>
              ) : null}

              <div className="admin-field admin-title-field">
                <label htmlFor="article-title">标题</label>
                <input
                  id="article-title"
                  value={draft.title}
                  onChange={(event) => updateTitle(event.target.value)}
                  placeholder="这篇文章想讲什么？"
                  disabled={!canEdit}
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
                    disabled={Boolean(activeSlug) || !canEdit}
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
                    disabled={!canEdit}
                    required
                  />
                </div>
              </div>

              <div className="admin-field admin-schedule-field">
                <label htmlFor="article-scheduled-at">定时发布时间</label>
                <input
                  id="article-scheduled-at"
                  type="datetime-local"
                  value={draft.scheduledAt}
                  onChange={(event) => updateDraft("scheduledAt", event.target.value)}
                  disabled={!canEdit}
                />
                <small>填写后点击“定时发布”；到达该时间后文章会自动进入公开列表。</small>
              </div>

              <div className="admin-field-grid">
                <div className="admin-field">
                  <label htmlFor="article-category">分类</label>
                  <input
                    id="article-category"
                    value={draft.category}
                    onChange={(event) => updateDraft("category", event.target.value)}
                    placeholder="技术踩坑"
                    disabled={!canEdit}
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="article-tags">标签</label>
                  <input
                    id="article-tags"
                    value={draft.tags.join(", ")}
                    onChange={(event) => updateDraft("tags", event.target.value.split(/[，,]/).map((tag) => tag.trim()).filter(Boolean))}
                    placeholder="Next.js, VPS, 教程"
                    disabled={!canEdit}
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
                  disabled={!canEdit}
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
                    disabled={!canEdit}
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
                    disabled={!canEdit}
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
                  disabled={!canEdit}
                />
              </div>

              {historyOpen ? (
                <section className="admin-revision-panel" aria-labelledby="admin-revision-title">
                  <header>
                    <div><History aria-hidden="true" /><span><strong id="admin-revision-title">历史版本</strong><small>最多保留 50 份手动保存记录</small></span></div>
                    <button type="button" onClick={() => void loadRevisions()} disabled={loadingRevisions} aria-label="刷新历史版本">
                      <RefreshCw className={loadingRevisions ? "spin" : ""} aria-hidden="true" />
                    </button>
                  </header>
                  <div>
                    {loadingRevisions ? (
                      <p><LoaderCircle className="spin" aria-hidden="true" />正在读取历史版本</p>
                    ) : revisions.length ? revisions.map((revision) => (
                      <article key={revision.id}>
                        <div>
                          <strong>{revision.title}</strong>
                          <small>{new Date(revision.createdAt).toLocaleString("zh-CN")} · {revision.updatedBy} · {revision.status === "published" ? "已发布" : revision.status === "scheduled" ? "定时" : "草稿"}</small>
                        </div>
                        <button type="button" onClick={() => void restoreRevision(revision)} disabled={Boolean(restoringRevision)}>
                          {restoringRevision === revision.id ? <LoaderCircle className="spin" aria-hidden="true" /> : <History aria-hidden="true" />}
                          恢复
                        </button>
                      </article>
                    )) : <p>还没有历史版本；下一次手动保存时会自动记录当前版本。</p>}
                  </div>
                </section>
              ) : null}

              <div className="admin-savebar">
                <div aria-live="polite">
                  {error ? <span className="admin-error">{error}</span> : null}
                  {!error && message ? <span className="admin-success">{message}</span> : null}
                  {!error && !message && dirty ? <span>{activeSlug ? "未保存内容会同步到本机和服务器草稿" : "新文章未保存内容已临时保存在本机"}</span> : null}
                </div>
                <div>
                  <button type="button" className="admin-secondary-button" onClick={() => void saveArticle("draft")} disabled={saving || !canEdit}>
                    {saving ? <LoaderCircle aria-hidden="true" /> : <Save aria-hidden="true" />}
                    保存草稿
                  </button>
                  <button type="button" className="admin-secondary-button" onClick={() => void saveArticle("scheduled")} disabled={saving || !canEdit || !draft.scheduledAt}>
                    {saving ? <LoaderCircle aria-hidden="true" /> : <CalendarClock aria-hidden="true" />}
                    定时发布
                  </button>
                  <button type="button" className="admin-primary-button" onClick={() => void saveArticle("published")} disabled={saving || !canEdit}>
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
            {draft?.protected && !protectedUnlocked ? (
              <div className="admin-preview-empty admin-preview-locked">
                <LockKeyhole aria-hidden="true" />
                解锁文章后，这里会显示正文预览。
              </div>
            ) : draft ? (
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
