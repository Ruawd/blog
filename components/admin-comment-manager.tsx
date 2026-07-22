"use client"

import { useEffect, useMemo, useState } from "react"
import { Eye, EyeOff, LoaderCircle, MessageSquareText, RefreshCw, Reply, Trash2 } from "lucide-react"

import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list"
import type { AdminComment, CommentStatus } from "@/lib/comment-repository"

async function readJson<T>(response: Response): Promise<T> {
  if (response.status === 204) return {} as T
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error || "请求失败")
  return body
}

const formatter = new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" })

function interactionLabel(comment: AdminComment): string {
  const reactionCount = comment.reactions.reduce((total, reaction) => total + reaction.count, 0)
  return `${comment.likes.count} 赞 · ${reactionCount} 个表情回应`
}

export function AdminCommentManager() {
  const [comments, setComments] = useState<AdminComment[]>([])
  const [filter, setFilter] = useState<"all" | "guestbook" | "article" | "hidden">("all")
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState("")

  async function load() {
    setLoading(true)
    setError("")
    try {
      const data = await readJson<{ comments: AdminComment[] }>(await fetch("/api/admin/comments", { cache: "no-store" }))
      setComments(data.comments)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "互动内容读取失败")
    } finally { setLoading(false) }
  }
  useEffect(() => {
    let cancelled = false
    async function loadInitialComments() {
      try {
        const data = await readJson<{ comments: AdminComment[] }>(await fetch("/api/admin/comments", { cache: "no-store" }))
        if (!cancelled) setComments(data.comments)
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "互动内容读取失败")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadInitialComments()
    return () => { cancelled = true }
  }, [])

  const visible = useMemo(() => comments.filter((comment) => filter === "all" || (filter === "hidden" ? comment.status === "hidden" : comment.scope === filter)), [comments, filter])

  async function changeStatus(comment: AdminComment, status: CommentStatus) {
    setBusyId(comment.id)
    setError("")
    try {
      const data = await readJson<{ comment: AdminComment }>(await fetch(`/api/admin/comments/${comment.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) }))
      setComments((current) => current.map((item) => item.id === comment.id ? data.comment : item))
    } catch (reason) { setError(reason instanceof Error ? reason.message : "状态更新失败") }
    finally { setBusyId(null) }
  }

  async function remove(comment: AdminComment) {
    if (!window.confirm(`确定永久删除 ${comment.nickname} 的这条内容吗？此操作无法撤销。`)) return
    setBusyId(comment.id)
    setError("")
    try {
      await readJson<Record<string, never>>(await fetch(`/api/admin/comments/${comment.id}`, { method: "DELETE" }))
      setComments((current) => current
        .filter((item) => item.id !== comment.id)
        .map((item) => item.parentId === comment.id
          ? { ...item, parentId: null, replyToNickname: "" }
          : item))
    } catch (reason) { setError(reason instanceof Error ? reason.message : "删除失败") }
    finally { setBusyId(null) }
  }

  return (
    <section className="admin-comments-manager" aria-labelledby="admin-comments-title">
      <header><div><p className="section-kicker">COMMUNITY / MODERATION</p><h2 id="admin-comments-title">留言与评论</h2></div><button type="button" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "spin" : ""} aria-hidden="true" />刷新</button></header>
      <nav className="admin-comment-filters" aria-label="筛选互动内容">
        {([['all', '全部'], ['guestbook', '留言'], ['article', '文章评论'], ['hidden', '已隐藏']] as const).map(([key, label]) => <button type="button" className={filter === key ? "is-active" : ""} onClick={() => setFilter(key)} key={key}>{label}</button>)}
      </nav>
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      {loading ? <p className="admin-inline-loading"><LoaderCircle className="spin" aria-hidden="true" />正在读取</p> : visible.length ? (
        <AnimatedList className="admin-comment-list">
          {visible.map((comment) => (
            <AnimatedListItem className={comment.status === "hidden" ? "admin-comment-row is-hidden" : "admin-comment-row"} key={comment.id}>
              <header><div>{comment.parentId ? <Reply aria-hidden="true" /> : <MessageSquareText aria-hidden="true" />}<span><strong>{comment.nickname}</strong><small>{comment.parentId ? `回复 @${comment.replyToNickname} · ` : ""}{comment.email || "未留邮箱"}</small></span></div><time dateTime={comment.createdAt}>{formatter.format(new Date(comment.createdAt))}</time></header>
              <p>{comment.content}</p>
              <footer><span>{comment.scope === "guestbook" ? "留言簿" : `文章 / ${comment.target}`} · {interactionLabel(comment)}</span><div>{comment.status === "approved" ? <button type="button" onClick={() => void changeStatus(comment, "hidden")} disabled={busyId === comment.id}><EyeOff aria-hidden="true" />隐藏</button> : <button type="button" onClick={() => void changeStatus(comment, "approved")} disabled={busyId === comment.id}><Eye aria-hidden="true" />恢复</button>}<button className="danger" type="button" onClick={() => void remove(comment)} disabled={busyId === comment.id}><Trash2 aria-hidden="true" />删除</button></div></footer>
            </AnimatedListItem>
          ))}
        </AnimatedList>
      ) : <div className="admin-comments-empty"><MessageSquareText aria-hidden="true" /><p>当前筛选下没有内容。</p></div>}
    </section>
  )
}
