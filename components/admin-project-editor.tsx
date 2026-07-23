"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  Check,
  Code2,
  ExternalLink,
  ImageOff,
  LoaderCircle,
  PanelsTopLeft,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react"

import { ResilientImage } from "@/components/resilient-image"
import { BorderBeam } from "@/components/ui/border-beam"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import type { Project, ProjectInput, ProjectStatus } from "@/lib/project-repository"

type ProjectDraft = Omit<ProjectInput, "tags"> & {
  clientId: string
  tagsText: string
}

type ProjectsPayload = {
  projects: Project[]
  revision: string
}

const statusOptions: Array<{ value: ProjectStatus; label: string }> = [
  { value: "published", label: "已公开" },
  { value: "draft", label: "草稿" },
  { value: "archived", label: "已归档" },
]

const statusLabels: Record<ProjectStatus, string> = {
  published: "已公开",
  draft: "草稿",
  archived: "已归档",
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error || "请求失败")
  return body
}

async function fetchProjects(): Promise<ProjectsPayload> {
  return readJson<ProjectsPayload>(
    await fetch("/api/admin/projects", { cache: "no-store" }),
  )
}

function toDraft(project: Project): ProjectDraft {
  return {
    clientId: `project-${project.id}`,
    id: project.id,
    slug: project.slug,
    title: project.title,
    description: project.description,
    url: project.url,
    repoUrl: project.repoUrl,
    imageUrl: project.imageUrl,
    tagsText: project.tags.join(", "),
    status: project.status,
    featured: project.featured,
  }
}

function parseTagsText(value: string): string[] {
  return value
    .split(/[,，\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function toInput(project: ProjectDraft): ProjectInput {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    description: project.description,
    url: project.url,
    repoUrl: project.repoUrl,
    imageUrl: project.imageUrl,
    tags: parseTagsText(project.tagsText),
    status: project.status,
    featured: project.featured,
  }
}

function nextProjectSlug(projects: ProjectDraft[]): string {
  let index = projects.length + 1
  while (projects.some((project) => project.slug === `project-${index}`)) index += 1
  return `project-${index}`
}

function createDraft(projects: ProjectDraft[]): ProjectDraft {
  return {
    clientId: `new-project-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    slug: nextProjectSlug(projects),
    title: "",
    description: "",
    url: "",
    repoUrl: "",
    imageUrl: "",
    tagsText: "",
    status: "draft",
    featured: false,
  }
}

function canPreviewImage(source: string): boolean {
  if (
    source.startsWith("/")
    && !source.startsWith("//")
    && !/(^|\/)\.\.?($|[/?#])/.test(source)
  ) return true
  try {
    return new URL(source).protocol === "https:"
  } catch {
    return false
  }
}

function canVisitUrl(source: string): boolean {
  try {
    const url = new URL(source)
    return url.protocol === "https:" && !url.username && !url.password
  } catch {
    return false
  }
}

function urlHostname(source: string): string {
  if (!source) return "尚未填写访问地址"
  try {
    return new URL(source).hostname
  } catch {
    return "访问地址待修正"
  }
}

export function AdminProjectEditor({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
  const [projects, setProjects] = useState<ProjectDraft[]>([])
  const [revision, setRevision] = useState("")
  const [activeId, setActiveId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const activeIndex = projects.findIndex((project) => project.clientId === activeId)
  const active = activeIndex >= 0 ? projects[activeIndex] : null
  const activeTags = active ? parseTagsText(active.tagsText) : []
  const counts = useMemo(() => ({
    published: projects.filter((project) => project.status === "published").length,
    draft: projects.filter((project) => project.status === "draft").length,
    archived: projects.filter((project) => project.status === "archived").length,
  }), [projects])

  function applyLoadedProjects(payload: ProjectsPayload, preferredSlug = "") {
    const next = payload.projects.map(toDraft)
    const selected = next.find((project) => project.slug === preferredSlug)
      || next.find((project) => project.clientId === activeId)
      || next[0]
    setProjects(next)
    setRevision(payload.revision)
    setActiveId(selected?.clientId || "")
    setDirty(false)
  }

  useEffect(() => {
    let cancelled = false
    async function loadInitialProjects() {
      try {
        const payload = await fetchProjects()
        if (cancelled) return
        const next = payload.projects.map(toDraft)
        setProjects(next)
        setRevision(payload.revision)
        setActiveId(next[0]?.clientId || "")
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "项目读取失败")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadInitialProjects()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!dirty) return
    const warnBeforeLeave = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warnBeforeLeave)
    return () => window.removeEventListener("beforeunload", warnBeforeLeave)
  }, [dirty])

  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  function clearFeedback() {
    setError("")
    setMessage("")
  }

  function update(patch: Partial<ProjectDraft>) {
    if (!active) return
    setProjects((current) => current.map((project) => (
      project.clientId === active.clientId ? { ...project, ...patch } : project
    )))
    setDirty(true)
    clearFeedback()
  }

  function addProject() {
    const project = createDraft(projects)
    setProjects((current) => [...current, project])
    setActiveId(project.clientId)
    setDirty(true)
    clearFeedback()
  }

  function moveProject(direction: "up" | "down") {
    if (!active) return
    const targetIndex = direction === "up" ? activeIndex - 1 : activeIndex + 1
    if (targetIndex < 0 || targetIndex >= projects.length) return
    setProjects((current) => {
      const next = [...current]
      const [item] = next.splice(activeIndex, 1)
      next.splice(targetIndex, 0, item)
      return next
    })
    setDirty(true)
    clearFeedback()
  }

  function removeProject() {
    if (!active || !window.confirm(`确定删除“${active.title || "未命名项目"}”吗？保存后将无法恢复。`)) return
    const next = projects.filter((project) => project.clientId !== active.clientId)
    const selected = next[Math.min(activeIndex, next.length - 1)] || null
    setProjects(next)
    setActiveId(selected?.clientId || "")
    setDirty(true)
    clearFeedback()
  }

  async function reload() {
    if (dirty && !window.confirm("放弃尚未保存的项目修改吗？")) return
    setLoading(true)
    clearFeedback()
    try {
      const preferredSlug = active?.slug || ""
      applyLoadedProjects(await fetchProjects(), preferredSlug)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "项目读取失败")
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    if (saving || !dirty) return
    setSaving(true)
    clearFeedback()
    try {
      const preferredSlug = active?.slug || ""
      const data = await readJson<ProjectsPayload>(await fetch("/api/admin/projects", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projects: projects.map(toInput), revision }),
      }))
      applyLoadedProjects(data, preferredSlug)
      setMessage("项目已保存，公开列表缓存已刷新")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "项目保存失败")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="admin-project-loading"><LoaderCircle className="spin" aria-hidden="true" />正在读取项目</div>
  }

  return (
    <section className="admin-project-manager magic-surface" aria-labelledby="admin-project-title">
      <BorderBeam size={160} duration={12} colorFrom="#111111" colorTo="#b7b7b7" borderWidth={1} />
      <header className="admin-project-heading">
        <div>
          <p className="section-kicker">WORK / PROJECTS</p>
          <h2 id="admin-project-title">项目管理</h2>
          <p>维护个人页上的作品、服务和开源项目；拖动顺序暂未启用，可使用前移与后移精确排序。</p>
        </div>
        <div>
          <a href="/projects" target="_blank" rel="noreferrer">查看项目页<ExternalLink aria-hidden="true" /></a>
          <button type="button" onClick={addProject}><Plus aria-hidden="true" />添加项目</button>
        </div>
      </header>

      <div className="admin-project-summary" aria-label="项目状态统计">
        <div><span>全部项目</span><strong>{projects.length}</strong></div>
        <div><span>公开展示</span><strong>{counts.published}</strong></div>
        <div><span>草稿</span><strong>{counts.draft}</strong></div>
        <div><span>已归档</span><strong>{counts.archived}</strong></div>
      </div>

      <div className="admin-project-workspace">
        <aside className="admin-project-sidebar">
          <header>
            <div><span>项目列表</span><strong>{projects.length} 个</strong></div>
            <button type="button" onClick={() => void reload()} aria-label="刷新项目列表" disabled={loading || saving}>
              <RefreshCw aria-hidden="true" />
            </button>
          </header>
          <div className="admin-project-list">
            {projects.length ? projects.map((project, index) => (
              <button
                type="button"
                className={project.clientId === activeId ? "is-active" : ""}
                onClick={() => { setActiveId(project.clientId); clearFeedback() }}
                key={project.clientId}
              >
                <span className="admin-project-index">{String(index + 1).padStart(2, "0")}</span>
                <span><strong>{project.title || "未命名项目"}</strong><small>/{project.slug || "未设置"}</small></span>
                <b data-status={project.status}>{project.featured ? <Sparkles aria-label="精选" /> : null}{statusLabels[project.status]}</b>
              </button>
            )) : (
              <div className="admin-project-list-empty"><PanelsTopLeft aria-hidden="true" />还没有项目</div>
            )}
          </div>
        </aside>

        {active ? (
          <div className="admin-project-editor">
            <div className="admin-project-editor-grid">
              <section className="admin-project-preview" aria-label="项目卡片预览">
                <div className="admin-project-preview-image">
                  {active.imageUrl && canPreviewImage(active.imageUrl) ? (
                    <ResilientImage key={active.imageUrl} src={active.imageUrl} alt="" decoding="async" />
                  ) : <ImageOff aria-hidden="true" />}
                </div>
                <div className="admin-project-preview-badges">
                  <span data-status={active.status}>{statusLabels[active.status]}</span>
                  {active.featured ? <span className="is-featured"><Sparkles aria-hidden="true" />精选</span> : null}
                </div>
                <p className="section-kicker">PROJECT / {active.slug || "UNTITLED"}</p>
                <h3>{active.title || "未命名项目"}</h3>
                <p>{active.description || "填写项目说明后会显示在这里。"}</p>
                <div className="admin-project-preview-tags">
                  {activeTags.length
                    ? activeTags.map((tag, index) => <span key={`${tag}-${index}`}>{tag}</span>)
                    : <span>暂无标签</span>}
                </div>
                <footer><ExternalLink aria-hidden="true" />{urlHostname(active.url)}</footer>
              </section>

              <div className="admin-project-fields">
                <div className="admin-field-grid">
                  <div className="admin-field">
                    <label htmlFor="project-slug">链接标识 *</label>
                    <input id="project-slug" value={active.slug} onChange={(event) => update({ slug: event.target.value })} maxLength={80} spellCheck={false} />
                    <small>仅使用小写字母、数字与连字符。</small>
                  </div>
                  <div className="admin-field">
                    <label htmlFor="project-status">公开状态 *</label>
                    <select id="project-status" value={active.status} onChange={(event) => update({ status: event.target.value as ProjectStatus })}>
                      {statusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="admin-field">
                  <label htmlFor="project-title">项目名称 *</label>
                  <input id="project-title" value={active.title} onChange={(event) => update({ title: event.target.value })} maxLength={100} />
                </div>
                <div className="admin-field">
                  <label htmlFor="project-description">项目说明 *</label>
                  <textarea id="project-description" value={active.description} onChange={(event) => update({ description: event.target.value })} rows={4} maxLength={600} />
                </div>
                <div className="admin-field">
                  <label htmlFor="project-url">访问地址 *</label>
                  <input id="project-url" type="url" value={active.url} onChange={(event) => update({ url: event.target.value })} placeholder="https://example.com" spellCheck={false} />
                  <small>仅允许不含账号凭据和自定义端口的公网 HTTPS 地址。</small>
                </div>
                <div className="admin-field-grid">
                  <div className="admin-field">
                    <label htmlFor="project-repo-url">代码仓库</label>
                    <input id="project-repo-url" type="url" value={active.repoUrl} onChange={(event) => update({ repoUrl: event.target.value })} placeholder="https://github.com/..." spellCheck={false} />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="project-image-url">封面图片</label>
                    <input id="project-image-url" value={active.imageUrl} onChange={(event) => update({ imageUrl: event.target.value })} placeholder="/images/project.webp 或 HTTPS" spellCheck={false} />
                  </div>
                </div>
                <div className="admin-field">
                  <label htmlFor="project-tags">项目标签</label>
                  <input id="project-tags" value={active.tagsText} onChange={(event) => update({ tagsText: event.target.value })} placeholder="Next.js, SQLite, Magic UI" maxLength={320} />
                  <small>使用中文或英文逗号分隔，最多 10 个，每个不超过 30 个字符。</small>
                </div>

                <label className="admin-project-featured">
                  <input type="checkbox" checked={active.featured} onChange={(event) => update({ featured: event.target.checked })} />
                  <span><Sparkles aria-hidden="true" /><strong>设为精选项目</strong><small>公开页面可以使用更醒目的卡片尺寸和 Magic UI 效果展示。</small></span>
                </label>

                <div className="admin-project-actions">
                  <div>
                    <button type="button" onClick={() => moveProject("up")} disabled={activeIndex <= 0}><ArrowUp aria-hidden="true" />前移</button>
                    <button type="button" onClick={() => moveProject("down")} disabled={activeIndex >= projects.length - 1}><ArrowDown aria-hidden="true" />后移</button>
                  </div>
                  <button className="danger" type="button" onClick={removeProject}><Trash2 aria-hidden="true" />删除</button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="admin-project-empty">
            <PanelsTopLeft aria-hidden="true" />
            <h3>建立第一个项目</h3>
            <p>项目可以是网站、开源仓库，也可以是正在维护的数字服务。</p>
            <button type="button" onClick={addProject}><Plus aria-hidden="true" />添加项目</button>
          </div>
        )}
      </div>

      <footer className="admin-project-footer">
        <p className={error ? "is-error" : message ? "is-success" : ""} role="status">
          {error || message || (dirty ? "有尚未保存的项目修改" : "仅“已公开”的项目会出现在访客页面。")}
        </p>
        <div>
          {active?.repoUrl && canVisitUrl(active.repoUrl) ? <a href={active.repoUrl} target="_blank" rel="noreferrer"><Code2 aria-hidden="true" />仓库</a> : null}
          <ShimmerButton type="button" onClick={() => void save()} disabled={saving || !dirty}>
            {saving ? <LoaderCircle className="spin" aria-hidden="true" /> : message ? <Check aria-hidden="true" /> : <Save aria-hidden="true" />}
            {saving ? "保存中" : "保存全部"}
          </ShimmerButton>
        </div>
      </footer>
    </section>
  )
}
