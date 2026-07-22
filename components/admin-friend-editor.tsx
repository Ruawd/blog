"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  Check,
  CircleAlert,
  ExternalLink,
  Globe2,
  ImageOff,
  Link2,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  ScanSearch,
  Trash2,
} from "lucide-react"

import { ResilientImage } from "@/components/resilient-image"
import { BorderBeam } from "@/components/ui/border-beam"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import type { FriendInput, FriendLink, FriendStatus } from "@/lib/friend-repository"

const statusOptions: Array<{ value: FriendStatus; label: string }> = [
  { value: "approved", label: "已通过" },
  { value: "pending", label: "待审核" },
  { value: "rejected", label: "已拒绝" },
  { value: "hidden", label: "已隐藏" },
]

const statusLabels: Record<FriendStatus, string> = {
  approved: "已通过",
  pending: "待审核",
  rejected: "已拒绝",
  hidden: "已隐藏",
}

type Filter = "all" | FriendStatus

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error || "请求失败")
  return body
}

async function fetchFriends(): Promise<FriendLink[]> {
  const data = await readJson<{ friends: FriendLink[] }>(
    await fetch("/api/admin/friends", { cache: "no-store" }),
  )
  return data.friends
}

function toInput(friend: FriendLink): FriendInput {
  return {
    name: friend.name,
    url: friend.url,
    avatarUrl: friend.avatarUrl,
    description: friend.description,
    backlinkUrl: friend.backlinkUrl,
    status: friend.status,
  }
}

function newFriend(): FriendInput {
  return {
    name: "",
    url: "",
    avatarUrl: "",
    description: "",
    backlinkUrl: "",
    status: "approved",
  }
}

function canPreview(source: string): boolean {
  try {
    return new URL(source).protocol === "https:"
  } catch {
    return false
  }
}

export function AdminFriendEditor() {
  const [friends, setFriends] = useState<FriendLink[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [draft, setDraft] = useState<FriendInput | null>(null)
  const [filter, setFilter] = useState<Filter>("all")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [moving, setMoving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const active = activeId ? friends.find((friend) => friend.id === activeId) || null : null
  const activeIndex = active ? friends.findIndex((friend) => friend.id === active.id) : -1
  const filteredFriends = useMemo(() => filter === "all"
    ? friends
    : friends.filter((friend) => friend.status === filter), [filter, friends])

  useEffect(() => {
    let cancelled = false
    async function loadInitialFriends() {
      try {
        const next = await fetchFriends()
        if (cancelled) return
        setFriends(next)
        setActiveId(next[0]?.id || null)
        setDraft(next[0] ? toInput(next[0]) : null)
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "友链读取失败")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadInitialFriends()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!dirty) return
    const warnBeforeLeave = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warnBeforeLeave)
    return () => window.removeEventListener("beforeunload", warnBeforeLeave)
  }, [dirty])

  function clearFeedback() {
    setError("")
    setMessage("")
  }

  function selectFriend(friend: FriendLink) {
    if (dirty && !window.confirm("放弃当前尚未保存的友链修改吗？")) return
    setActiveId(friend.id)
    setDraft(toInput(friend))
    setDirty(false)
    clearFeedback()
  }

  function update<K extends keyof FriendInput>(key: K, value: FriendInput[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : current)
    setDirty(true)
    clearFeedback()
  }

  function addFriend() {
    if (dirty && !window.confirm("放弃当前尚未保存的友链修改吗？")) return
    setActiveId(null)
    setDraft(newFriend())
    setDirty(true)
    clearFeedback()
  }

  async function reload() {
    if (dirty && !window.confirm("放弃当前尚未保存的友链修改吗？")) return
    setLoading(true)
    clearFeedback()
    try {
      const next = await fetchFriends()
      setFriends(next)
      const selected = next.find((friend) => friend.id === activeId) || next[0] || null
      setActiveId(selected?.id || null)
      setDraft(selected ? toInput(selected) : null)
      setDirty(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "友链读取失败")
    } finally {
      setLoading(false)
    }
  }

  async function persistFriend(): Promise<FriendLink | null> {
    if (!draft || saving) return active
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch(activeId ? `/api/admin/friends/${activeId}` : "/api/admin/friends", {
        method: activeId ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      })
      const data = await readJson<{ friend: FriendLink }>(response)
      setFriends((current) => activeId
        ? current.map((friend) => friend.id === data.friend.id ? data.friend : friend)
        : [...current, data.friend])
      setActiveId(data.friend.id)
      setDraft(toInput(data.friend))
      setDirty(false)
      setMessage("友链已保存，公开状态会立即同步到前台")
      return data.friend
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "友链保存失败")
      return null
    } finally {
      setSaving(false)
    }
  }

  async function reviewFriend() {
    if (!draft || reviewing || saving) return
    let target = active
    if (!target || dirty) target = await persistFriend()
    if (!target) return
    setReviewing(true)
    setError("")
    setMessage("")
    try {
      const data = await readJson<{ friend: FriendLink; review: { approved: boolean; message: string } }>(
        await fetch(`/api/admin/friends/${target.id}/review`, { method: "POST" }),
      )
      setFriends((current) => current.map((friend) => friend.id === data.friend.id ? data.friend : friend))
      setDraft(toInput(data.friend))
      setMessage(data.review.message)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "自动审核失败")
    } finally {
      setReviewing(false)
    }
  }

  async function moveFriend(direction: "up" | "down") {
    if (!active || dirty || moving) return
    setMoving(true)
    clearFeedback()
    try {
      const data = await readJson<{ friends: FriendLink[] }>(await fetch(`/api/admin/friends/${active.id}/move`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ direction }),
      }))
      setFriends(data.friends)
      const selected = data.friends.find((friend) => friend.id === active.id) || active
      setDraft(toInput(selected))
      setMessage("友链顺序已更新")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "友链排序失败")
    } finally {
      setMoving(false)
    }
  }

  async function removeFriend() {
    if (!active || !window.confirm(`确定删除“${active.name}”吗？此操作无法撤销。`)) return
    setSaving(true)
    clearFeedback()
    try {
      await readJson<{ ok: boolean }>(await fetch(`/api/admin/friends/${active.id}`, { method: "DELETE" }))
      const next = friends.filter((friend) => friend.id !== active.id)
      const selected = next[Math.min(activeIndex, next.length - 1)] || null
      setFriends(next)
      setActiveId(selected?.id || null)
      setDraft(selected ? toInput(selected) : null)
      setDirty(false)
      setMessage("友链已删除")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "友链删除失败")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="admin-friend-loading"><LoaderCircle className="spin" aria-hidden="true" />正在读取友链</div>
  }

  return (
    <section className="admin-friend-manager magic-surface" aria-labelledby="admin-friend-title">
      <BorderBeam size={160} duration={12} colorFrom="#111111" colorTo="#b7b7b7" borderWidth={1} />
      <header className="admin-friend-heading">
        <div>
          <p className="section-kicker">FRIENDS / REVIEW</p>
          <h2 id="admin-friend-title">友链管理</h2>
          <p>编辑公开友链，处理访客申请，并重新执行 HTTPS、头像与双向链接验证。</p>
        </div>
        <div>
          <a href="/friends" target="_blank" rel="noreferrer">查看友链<ExternalLink aria-hidden="true" /></a>
          <button type="button" onClick={addFriend}><Plus aria-hidden="true" />添加友链</button>
        </div>
      </header>

      <div className="admin-friend-filters" aria-label="友链状态筛选">
        {(["all", "pending", "approved", "rejected", "hidden"] as Filter[]).map((value) => (
          <button
            type="button"
            className={filter === value ? "is-active" : ""}
            onClick={() => setFilter(value)}
            key={value}
          >
            {value === "all" ? "全部" : statusLabels[value]}
            <span>{value === "all" ? friends.length : friends.filter((friend) => friend.status === value).length}</span>
          </button>
        ))}
        <button className="admin-friend-refresh" type="button" onClick={() => void reload()} aria-label="刷新友链列表">
          <RefreshCw aria-hidden="true" />
        </button>
      </div>

      <div className="admin-friend-workspace">
        <aside className="admin-friend-list">
          {filteredFriends.length ? filteredFriends.map((friend) => (
            <button
              type="button"
              className={activeId === friend.id ? "is-active" : ""}
              onClick={() => selectFriend(friend)}
              key={friend.id}
            >
              <span className="admin-friend-avatar">
                {friend.avatarUrl ? <ResilientImage src={friend.avatarUrl} alt="" loading="lazy" decoding="async" /> : friend.name.slice(0, 1)}
              </span>
              <span><strong>{friend.name}</strong><small>{new URL(friend.url).hostname}</small></span>
              <b data-status={friend.status}>{statusLabels[friend.status]}</b>
            </button>
          )) : (
            <div className="admin-friend-list-empty"><Link2 aria-hidden="true" />当前筛选下没有友链</div>
          )}
        </aside>

        {draft ? (
          <div className="admin-friend-editor">
            <div className="admin-friend-editor-grid">
              <section className="admin-friend-preview" aria-label="友链预览">
                <div className="admin-friend-preview-avatar">
                  {draft.avatarUrl && canPreview(draft.avatarUrl) ? (
                    <ResilientImage key={draft.avatarUrl} src={draft.avatarUrl} alt="" decoding="async" />
                  ) : draft.name ? draft.name.slice(0, 1) : <ImageOff aria-hidden="true" />}
                </div>
                <span className="admin-friend-status" data-status={draft.status}>{statusLabels[draft.status]}</span>
                <h3>{draft.name || "未命名站点"}</h3>
                <p>{draft.description || "填写站点介绍后会显示在这里。"}</p>
                <div><Globe2 aria-hidden="true" />{draft.url ? (() => { try { return new URL(draft.url).hostname } catch { return "地址待修正" } })() : "尚未填写地址"}</div>
                {active?.reviewMessage ? (
                  <aside className={active.status === "approved" ? "is-success" : ""}>
                    {active.status === "approved" ? <Check aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
                    <span><strong>最近审核</strong><small>{active.reviewMessage}</small></span>
                  </aside>
                ) : null}
              </section>

              <div className="admin-friend-fields">
                <div className="admin-field-grid">
                  <div className="admin-field">
                    <label htmlFor="friend-name">站点名称 *</label>
                    <input id="friend-name" value={draft.name} onChange={(event) => update("name", event.target.value)} maxLength={60} />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="friend-status">公开状态 *</label>
                    <select id="friend-status" value={draft.status} onChange={(event) => update("status", event.target.value as FriendStatus)}>
                      {statusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="admin-field">
                  <label htmlFor="friend-url">站点地址 *</label>
                  <input id="friend-url" type="url" value={draft.url} onChange={(event) => update("url", event.target.value)} placeholder="https://example.com" spellCheck={false} />
                  <small>仅支持公网 HTTPS，自动审核会检查首页是否可以访问。</small>
                </div>
                <div className="admin-field">
                  <label htmlFor="friend-avatar">头像地址</label>
                  <input id="friend-avatar" type="url" value={draft.avatarUrl} onChange={(event) => update("avatarUrl", event.target.value)} placeholder="https://example.com/avatar.webp" spellCheck={false} />
                  <small>可留空；填写后自动审核会验证是否返回图片内容。</small>
                </div>
                <div className="admin-field">
                  <label htmlFor="friend-backlink">对方友链页面</label>
                  <input id="friend-backlink" type="url" value={draft.backlinkUrl} onChange={(event) => update("backlinkUrl", event.target.value)} placeholder="https://example.com/friends" spellCheck={false} />
                  <small>需与站点地址同域；自动审核会查找指向 p8.nz 或 blog.ruawd.de 的 HTTPS 链接。</small>
                </div>
                <div className="admin-field">
                  <label htmlFor="friend-description">站点介绍</label>
                  <textarea id="friend-description" value={draft.description} onChange={(event) => update("description", event.target.value)} rows={4} maxLength={240} />
                </div>

                <div className="admin-friend-actions">
                  <div>
                    <button type="button" onClick={() => void moveFriend("up")} disabled={!active || dirty || moving || activeIndex <= 0}><ArrowUp aria-hidden="true" />前移</button>
                    <button type="button" onClick={() => void moveFriend("down")} disabled={!active || dirty || moving || activeIndex >= friends.length - 1}><ArrowDown aria-hidden="true" />后移</button>
                  </div>
                  {active ? <button className="danger" type="button" onClick={() => void removeFriend()} disabled={saving || reviewing}><Trash2 aria-hidden="true" />删除</button> : null}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="admin-friend-empty"><Link2 aria-hidden="true" /><h3>还没有友链</h3><button type="button" onClick={addFriend}><Plus aria-hidden="true" />添加友链</button></div>
        )}
      </div>

      <footer className="admin-friend-footer">
        <p className={error ? "is-error" : message ? "is-success" : ""} role="status">
          {error || message || (dirty ? "有尚未保存的友链修改" : "自动通过的申请会立即显示在前台；失败申请保留为待审核。")}
        </p>
        <div>
          <button type="button" onClick={() => void reviewFriend()} disabled={!draft || reviewing || saving}>
            {reviewing ? <LoaderCircle className="spin" aria-hidden="true" /> : <ScanSearch aria-hidden="true" />}{reviewing ? "审核中" : "自动审核"}
          </button>
          <ShimmerButton type="button" onClick={() => void persistFriend()} disabled={!draft || saving || (!dirty && Boolean(active))}>
            {saving ? <LoaderCircle className="spin" aria-hidden="true" /> : message ? <Check aria-hidden="true" /> : <Save aria-hidden="true" />}{saving ? "保存中" : "保存友链"}
          </ShimmerButton>
        </div>
      </footer>
    </section>
  )
}
