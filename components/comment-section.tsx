"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  Check,
  CircleAlert,
  ExternalLink,
  Heart,
  Laugh,
  LoaderCircle,
  MessageSquareText,
  PartyPopper,
  Reply,
  Send,
  ThumbsUp,
  X,
} from "lucide-react"

import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list"
import { BorderBeam } from "@/components/ui/border-beam"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import type {
  CommentInteractionUpdate,
  CommentScope,
  PublicComment,
} from "@/lib/comment-repository"
import {
  commentReactionOptions,
  type CommentInteractionKind,
  type CommentReactionKind,
} from "@/lib/comment-reactions"

type CommentSectionProps = {
  scope: CommentScope
  target: string
  title?: string
}

type ProfileData = {
  nickname: string
  email: string
  website: string
  avatarUrl: string
}

type CommentNode = {
  comment: PublicComment
  children: CommentNode[]
}

const emptyProfile: ProfileData = { nickname: "", email: "", website: "", avatarUrl: "" }

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error || "请求失败，请稍后重试")
  return body
}

const formatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
})

function buildCommentTree(comments: PublicComment[]): CommentNode[] {
  const nodes = new Map(comments.map((comment) => [comment.id, { comment, children: [] as CommentNode[] }]))
  const roots: CommentNode[] = []
  for (const node of nodes.values()) {
    const parent = node.comment.parentId ? nodes.get(node.comment.parentId) : null
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  const createdAt = (node: CommentNode) => new Date(node.comment.createdAt).getTime()
  roots.sort((left, right) => createdAt(right) - createdAt(left) || right.comment.id - left.comment.id)
  const sortChildren = (node: CommentNode) => {
    node.children.sort((left, right) => createdAt(left) - createdAt(right) || left.comment.id - right.comment.id)
    node.children.forEach(sortChildren)
  }
  roots.forEach(sortChildren)
  return roots
}

function CommentAvatar({ nickname, src }: { nickname: string; src: string }) {
  const [failedSrc, setFailedSrc] = useState("")
  if (!src || failedSrc === src) {
    return <span className="comment-initial" aria-hidden="true">{nickname.slice(0, 1).toUpperCase()}</span>
  }

  return (
    <span className="comment-avatar">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(src)}
      />
    </span>
  )
}

function ReactionIcon({ kind }: { kind: CommentReactionKind }) {
  if (kind === "heart") return <Heart aria-hidden="true" />
  if (kind === "laugh") return <Laugh aria-hidden="true" />
  if (kind === "surprised") return <CircleAlert aria-hidden="true" />
  return <PartyPopper aria-hidden="true" />
}

function CommentThreadNode({
  node,
  depth,
  replyingTo,
  busyInteraction,
  onReply,
  onInteraction,
  renderReplyForm,
}: {
  node: CommentNode
  depth: number
  replyingTo: number | null
  busyInteraction: string
  onReply: (comment: PublicComment) => void
  onInteraction: (comment: PublicComment, kind: CommentInteractionKind) => void
  renderReplyForm: (comment: PublicComment) => ReactNode
}) {
  const comment = node.comment
  return (
    <div className={`comment-thread-node${depth >= 3 ? " is-deep" : ""}`} data-depth={depth}>
      <article className="comment-item">
        <header>
          <CommentAvatar nickname={comment.nickname} src={comment.avatarUrl} />
          <div>
            {comment.website ? (
              <a href={comment.website} target="_blank" rel="nofollow noreferrer">
                {comment.nickname}<ExternalLink aria-hidden="true" />
              </a>
            ) : <strong>{comment.nickname}</strong>}
            <time dateTime={comment.createdAt}>{formatter.format(new Date(comment.createdAt))}</time>
          </div>
        </header>

        {comment.replyToNickname ? (
          <p className="comment-reply-context"><Reply aria-hidden="true" />回复 <strong>@{comment.replyToNickname}</strong></p>
        ) : null}
        <p className="comment-content">{comment.content}</p>

        <footer className="comment-actions">
          <div className="comment-primary-actions">
            <button
              type="button"
              className={replyingTo === comment.id ? "is-active" : ""}
              aria-expanded={replyingTo === comment.id}
              onClick={() => onReply(comment)}
            >
              <Reply aria-hidden="true" /><span>回复</span>
            </button>
            <button
              type="button"
              className={comment.likes.active ? "is-active" : ""}
              aria-pressed={comment.likes.active}
              disabled={busyInteraction === `${comment.id}:like`}
              onClick={() => onInteraction(comment, "like")}
            >
              {busyInteraction === `${comment.id}:like`
                ? <LoaderCircle className="spin" aria-hidden="true" />
                : <ThumbsUp aria-hidden="true" />}
              <span>赞</span>{comment.likes.count ? <b>{comment.likes.count}</b> : null}
            </button>
          </div>

          <div className="comment-reaction-actions" aria-label={`回应 ${comment.nickname} 的评论`}>
            <span>回应</span>
            {commentReactionOptions.map((option) => {
              const reaction = comment.reactions.find((item) => item.kind === option.kind)
              const busy = busyInteraction === `${comment.id}:${option.kind}`
              return (
                <button
                  type="button"
                  className={reaction?.active ? "is-active" : ""}
                  aria-label={`${option.label}${reaction?.count ? `，${reaction.count} 人` : ""}`}
                  aria-pressed={reaction?.active || false}
                  title={option.label}
                  disabled={busy}
                  onClick={() => onInteraction(comment, option.kind)}
                  key={option.kind}
                >
                  {busy ? <LoaderCircle className="spin" aria-hidden="true" /> : <ReactionIcon kind={option.kind} />}
                  {reaction?.count ? <b>{reaction.count}</b> : null}
                </button>
              )
            })}
          </div>
        </footer>

        {replyingTo === comment.id ? renderReplyForm(comment) : null}
      </article>

      {node.children.length ? (
        <div className="comment-thread-children" aria-label={`${comment.nickname} 的回复`}>
          {node.children.map((child) => (
            <CommentThreadNode
              node={child}
              depth={depth + 1}
              replyingTo={replyingTo}
              busyInteraction={busyInteraction}
              onReply={onReply}
              onInteraction={onInteraction}
              renderReplyForm={renderReplyForm}
              key={child.comment.id}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function CommentSection({ scope, target, title = scope === "guestbook" ? "留言簿" : "评论" }: CommentSectionProps) {
  const [comments, setComments] = useState<PublicComment[]>([])
  const [profile, setProfile] = useState<ProfileData>(emptyProfile)
  const [content, setContent] = useState("")
  const [company, setCompany] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [replyCompany, setReplyCompany] = useState("")
  const [replySubmitting, setReplySubmitting] = useState(false)
  const [replyError, setReplyError] = useState("")
  const [threadMessage, setThreadMessage] = useState("")
  const [threadError, setThreadError] = useState("")
  const [busyInteraction, setBusyInteraction] = useState("")

  const endpoint = useMemo(() => `/api/comments?scope=${scope}&target=${encodeURIComponent(target)}`, [scope, target])
  const threads = useMemo(() => buildCommentTree(comments), [comments])

  useEffect(() => {
    let timer: number | undefined
    try {
      const saved = JSON.parse(window.localStorage.getItem("ruawd-comment-profile") || "{}") as Partial<ProfileData>
      timer = window.setTimeout(() => setProfile({
        nickname: saved.nickname || "",
        email: saved.email || "",
        website: saved.website || "",
        avatarUrl: saved.avatarUrl || "",
      }), 0)
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

  function updateProfile<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setProfile((current) => ({ ...current, [key]: value }))
    setError("")
    setReplyError("")
    setSuccess("")
  }

  function persistProfile() {
    window.localStorage.setItem("ruawd-comment-profile", JSON.stringify(profile))
  }

  async function submitRoot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError("")
    setSuccess("")
    try {
      const { comment } = await readJson<{ comment: PublicComment }>(await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...profile, content, company, parentId: null, scope, target }),
      }))
      setComments((current) => [...current, comment])
      setSuccess(scope === "guestbook" ? "留言已发布" : "评论已发布")
      setContent("")
      setCompany("")
      persistProfile()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "提交失败")
    } finally {
      setSubmitting(false)
    }
  }

  function startReply(comment: PublicComment) {
    if (replyingTo === comment.id) {
      setReplyingTo(null)
      setReplyError("")
      return
    }
    setReplyingTo(comment.id)
    setReplyContent("")
    setReplyCompany("")
    setReplyError("")
    setThreadError("")
    setThreadMessage("")
  }

  async function submitReply(event: React.FormEvent<HTMLFormElement>, parent: PublicComment) {
    event.preventDefault()
    if (replySubmitting) return
    setReplySubmitting(true)
    setReplyError("")
    setThreadMessage("")
    try {
      const { comment } = await readJson<{ comment: PublicComment }>(await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...profile, content: replyContent, company: replyCompany, parentId: parent.id, scope, target }),
      }))
      setComments((current) => [...current, comment])
      setReplyingTo(null)
      setReplyContent("")
      setReplyCompany("")
      setThreadMessage(`已回复 @${parent.nickname}`)
      persistProfile()
    } catch (reason) {
      setReplyError(reason instanceof Error ? reason.message : "回复失败")
    } finally {
      setReplySubmitting(false)
    }
  }

  async function toggleInteraction(comment: PublicComment, kind: CommentInteractionKind) {
    const busyKey = `${comment.id}:${kind}`
    if (busyInteraction) return
    setBusyInteraction(busyKey)
    setThreadError("")
    setThreadMessage("")
    try {
      const data = await readJson<{ interaction: CommentInteractionUpdate }>(await fetch(`/api/comments/${comment.id}/interactions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind }),
      }))
      setComments((current) => current.map((item) => {
        if (item.id !== comment.id) return item
        if (data.interaction.kind === "like") {
          return { ...item, likes: { count: data.interaction.count, active: data.interaction.active } }
        }
        return {
          ...item,
          reactions: item.reactions.map((reaction) => reaction.kind === data.interaction.kind
            ? { ...reaction, count: data.interaction.count, active: data.interaction.active }
            : reaction),
        }
      }))
    } catch (reason) {
      setThreadError(reason instanceof Error ? reason.message : "回应失败")
    } finally {
      setBusyInteraction("")
    }
  }

  function renderReplyForm(parent: PublicComment) {
    return (
      <form className="comment-reply-form" onSubmit={(event) => void submitReply(event, parent)}>
        <header>
          <div><Reply aria-hidden="true" /><span>回复 <strong>@{parent.nickname}</strong></span></div>
          <button type="button" onClick={() => setReplyingTo(null)} aria-label="取消回复"><X aria-hidden="true" /></button>
        </header>
        <div className="comment-reply-profile">
          <label><span>昵称 *</span><input value={profile.nickname} onChange={(event) => updateProfile("nickname", event.target.value)} maxLength={40} autoComplete="nickname" required /></label>
          <label><span>邮箱（不公开）</span><input type="email" value={profile.email} onChange={(event) => updateProfile("email", event.target.value)} maxLength={120} autoComplete="email" /></label>
        </div>
        <details className="comment-reply-extras">
          <summary>网站与头像（可选）</summary>
          <div className="comment-reply-profile">
            <label><span>个人网站</span><input type="url" value={profile.website} onChange={(event) => updateProfile("website", event.target.value)} placeholder="https://" autoComplete="url" /></label>
            <label><span>头像链接</span><input type="url" value={profile.avatarUrl} onChange={(event) => updateProfile("avatarUrl", event.target.value)} placeholder="https://example.com/avatar.jpg" maxLength={1000} inputMode="url" /></label>
          </div>
        </details>
        <label className="comment-reply-content"><span>回复内容 *</span><textarea value={replyContent} onChange={(event) => { setReplyContent(event.target.value); setReplyError("") }} minLength={2} maxLength={2000} rows={4} autoFocus required /></label>
        <label className="comment-honeypot" aria-hidden="true">公司<input value={replyCompany} onChange={(event) => setReplyCompany(event.target.value)} tabIndex={-1} autoComplete="off" /></label>
        <footer>
          <p className={replyError ? "is-error" : ""} role="status">{replyError || "回复将显示在当前评论下方。"}</p>
          <div>
            <button type="button" onClick={() => setReplyingTo(null)}>取消</button>
            <ShimmerButton type="submit" disabled={replySubmitting}>
              {replySubmitting ? <LoaderCircle className="spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
              {replySubmitting ? "发布中" : "发布回复"}
            </ShimmerButton>
          </div>
        </footer>
      </form>
    )
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

      <form className="comment-form magic-surface" onSubmit={(event) => void submitRoot(event)}>
        <BorderBeam size={110} duration={10} colorFrom="#111111" colorTo="#b7b7b7" borderWidth={1} />
        <div className="comment-form-grid">
          <label><span>昵称 *</span><input value={profile.nickname} onChange={(event) => updateProfile("nickname", event.target.value)} maxLength={40} autoComplete="nickname" required /></label>
          <label><span>邮箱（不公开，可匹配头像）</span><input type="email" value={profile.email} onChange={(event) => updateProfile("email", event.target.value)} maxLength={120} autoComplete="email" /></label>
          <label><span>个人网站</span><input type="url" value={profile.website} onChange={(event) => updateProfile("website", event.target.value)} placeholder="https://" autoComplete="url" /></label>
          <label>
            <span>头像链接</span>
            <input type="url" value={profile.avatarUrl} onChange={(event) => updateProfile("avatarUrl", event.target.value)} placeholder="https://example.com/avatar.jpg" maxLength={1000} inputMode="url" />
            <small>仅支持 HTTPS；留空时会尝试使用 QQ 头像或 Gravatar。</small>
          </label>
        </div>
        <label className="comment-form-content"><span>内容 *</span><textarea value={content} onChange={(event) => { setContent(event.target.value); setError(""); setSuccess("") }} minLength={2} maxLength={2000} rows={6} required /></label>
        <label className="comment-honeypot" aria-hidden="true">公司<input value={company} onChange={(event) => setCompany(event.target.value)} tabIndex={-1} autoComplete="off" /></label>
        <footer>
          <p className={error ? "is-error" : success ? "is-success" : ""} role="status">
            {error || success || "支持楼中楼回复、点赞和表情回应；邮箱不会公开。"}
          </p>
          <ShimmerButton type="submit" disabled={submitting}>
            {submitting ? <LoaderCircle className="spin" aria-hidden="true" /> : success ? <Check aria-hidden="true" /> : <Send aria-hidden="true" />}
            {submitting ? "发布中" : "发布"}
          </ShimmerButton>
        </footer>
      </form>

      {threadError || threadMessage ? (
        <p className={`comment-thread-feedback${threadError ? " is-error" : " is-success"}`} role={threadError ? "alert" : "status"}>
          {threadError || threadMessage}
        </p>
      ) : null}

      {loading ? (
        <div className="comment-loading" role="status"><LoaderCircle className="spin" aria-hidden="true" /><span>正在读取</span></div>
      ) : threads.length ? (
        <AnimatedList className="comment-list comment-thread-list">
          {threads.map((node) => (
            <AnimatedListItem className="comment-thread-root" key={node.comment.id}>
              <CommentThreadNode
                node={node}
                depth={0}
                replyingTo={replyingTo}
                busyInteraction={busyInteraction}
                onReply={startReply}
                onInteraction={(comment, kind) => void toggleInteraction(comment, kind)}
                renderReplyForm={renderReplyForm}
              />
            </AnimatedListItem>
          ))}
        </AnimatedList>
      ) : (
        <div className="comment-empty"><MessageSquareText aria-hidden="true" /><p>这里还没有内容，来写第一条吧。</p></div>
      )}
    </section>
  )
}
