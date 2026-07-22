"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ExternalLink, LoaderCircle, MessageSquareText, Send } from "lucide-react"

import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list"
import { BorderBeam } from "@/components/ui/border-beam"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import type { CommentScope, PublicComment } from "@/lib/comment-repository"

type CommentSectionProps = {
  scope: CommentScope
  target: string
  title?: string
}

type FormData = { nickname: string; email: string; website: string; content: string; company: string }
const emptyForm: FormData = { nickname: "", email: "", website: "", content: "", company: "" }

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error || "请求失败，请稍后重试")
  return body
}

const formatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
})

export function CommentSection({ scope, target, title = scope === "guestbook" ? "留言簿" : "评论" }: CommentSectionProps) {
  const [comments, setComments] = useState<PublicComment[]>([])
  const [form, setForm] = useState<FormData>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const endpoint = useMemo(() => `/api/comments?scope=${scope}&target=${encodeURIComponent(target)}`, [scope, target])

  useEffect(() => {
    let timer: number | undefined
    try {
      const saved = JSON.parse(window.localStorage.getItem("ruawd-comment-profile") || "{}") as Partial<FormData>
      timer = window.setTimeout(() => {
        setForm((current) => ({ ...current, nickname: saved.nickname || "", email: saved.email || "", website: saved.website || "" }))
      }, 0)
    } catch {}
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await readJson<{ comments: PublicComment[] }>(await fetch(endpoint, { cache: "no-store" }))
        if (!cancelled) setComments(data.comments)
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "互动内容读取失败")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [endpoint])

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setError("")
    setSuccess("")
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError("")
    setSuccess("")
    try {
      const { comment } = await readJson<{ comment: PublicComment }>(await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, scope, target }),
      }))
      setComments((current) => [comment, ...current])
      setSuccess(scope === "guestbook" ? "留言已发布" : "评论已发布")
      setForm((current) => ({ ...current, content: "", company: "" }))
      window.localStorage.setItem("ruawd-comment-profile", JSON.stringify({ nickname: form.nickname, email: form.email, website: form.website }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "提交失败")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="comment-section" id={scope === "article" ? "article-comments" : "guestbook"} aria-labelledby={`${scope}-comments-title`}>
      <header className="comment-section-heading">
        <div>
          <p className="section-kicker">{scope === "article" ? "DISCUSSION" : "GUESTBOOK"}</p>
          <h2 id={`${scope}-comments-title`} tabIndex={-1}>{title}</h2>
        </div>
        <span>{comments.length} 条</span>
      </header>

      <form className="comment-form magic-surface" onSubmit={submit}>
        <BorderBeam size={110} duration={10} colorFrom="#111111" colorTo="#b7b7b7" borderWidth={1} />
        <div className="comment-form-grid">
          <label><span>昵称 *</span><input value={form.nickname} onChange={(event) => update("nickname", event.target.value)} maxLength={40} autoComplete="nickname" required /></label>
          <label><span>邮箱（不公开）</span><input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} maxLength={120} autoComplete="email" /></label>
          <label><span>个人网站</span><input type="url" value={form.website} onChange={(event) => update("website", event.target.value)} placeholder="https://" autoComplete="url" /></label>
        </div>
        <label className="comment-form-content"><span>内容 *</span><textarea value={form.content} onChange={(event) => update("content", event.target.value)} minLength={2} maxLength={2000} rows={6} required /></label>
        <label className="comment-honeypot" aria-hidden="true">公司<input value={form.company} onChange={(event) => update("company", event.target.value)} tabIndex={-1} autoComplete="off" /></label>
        <footer>
          <p className={error ? "is-error" : success ? "is-success" : ""} role="status">
            {error || success || "请保持友善；邮箱仅用于辨识，不会公开。"}
          </p>
          <ShimmerButton type="submit" disabled={submitting}>
            {submitting ? <LoaderCircle className="spin" aria-hidden="true" /> : success ? <Check aria-hidden="true" /> : <Send aria-hidden="true" />}
            {submitting ? "发布中" : "发布"}
          </ShimmerButton>
        </footer>
      </form>

      {loading ? (
        <div className="comment-loading" role="status"><LoaderCircle className="spin" aria-hidden="true" /><span>正在读取</span></div>
      ) : comments.length ? (
        <AnimatedList className="comment-list">
          {comments.map((comment) => (
            <AnimatedListItem className="comment-item" key={comment.id}>
              <header>
                <span className="comment-initial" aria-hidden="true">{comment.nickname.slice(0, 1).toUpperCase()}</span>
                <div>
                  {comment.website ? <a href={comment.website} target="_blank" rel="nofollow noreferrer">{comment.nickname}<ExternalLink aria-hidden="true" /></a> : <strong>{comment.nickname}</strong>}
                  <time dateTime={comment.createdAt}>{formatter.format(new Date(comment.createdAt))}</time>
                </div>
              </header>
              <p>{comment.content}</p>
            </AnimatedListItem>
          ))}
        </AnimatedList>
      ) : (
        <div className="comment-empty"><MessageSquareText aria-hidden="true" /><p>这里还没有内容，来写第一条吧。</p></div>
      )}
    </section>
  )
}
