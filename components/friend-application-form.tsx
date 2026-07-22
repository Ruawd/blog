"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  Check,
  CircleAlert,
  Globe2,
  ImageIcon,
  Link2,
  LoaderCircle,
  ScanSearch,
  Send,
} from "lucide-react"

import { ShimmerButton } from "@/components/ui/shimmer-button"

type FormState = {
  name: string
  url: string
  avatarUrl: string
  description: string
  backlinkUrl: string
  company: string
}

type ApplicationResult = {
  status: "pending" | "approved" | "rejected" | "hidden"
  reviewMessage: string
}

const initialForm: FormState = {
  name: "",
  url: "",
  avatarUrl: "",
  description: "",
  backlinkUrl: "",
  company: "",
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error || "提交失败")
  return body
}

export function FriendApplicationForm({ targets }: { targets: readonly string[] }) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<ApplicationResult | null>(null)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setError("")
    setResult(null)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError("")
    setResult(null)
    try {
      const data = await readJson<{ application: ApplicationResult }>(await fetch("/api/friend-applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      }))
      setResult(data.application)
      if (data.application.status === "approved") {
        setForm(initialForm)
        router.refresh()
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "友链申请提交失败")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="friend-application" id="friend-application" aria-labelledby="friend-application-title">
      <header>
        <div>
          <p className="section-kicker">AUTOMATIC REVIEW</p>
          <h2 id="friend-application-title">申请友链</h2>
        </div>
        <p>提交后服务器会自动检查站点、头像和双向链接。全部通过后立即展示，无需等待人工审核。</p>
      </header>

      <div className="friend-review-rules">
        <div><Globe2 aria-hidden="true" /><span><strong>站点可达</strong><small>首页需使用公网 HTTPS 并正常返回</small></span></div>
        <div><ImageIcon aria-hidden="true" /><span><strong>头像可选</strong><small>填写后需能返回有效图片内容</small></span></div>
        <div><Link2 aria-hidden="true" /><span><strong>双向链接</strong><small>同域友链页面必须包含本站 HTTPS 链接</small></span></div>
      </div>

      <div className="friend-backlink-targets">
        <ScanSearch aria-hidden="true" />
        <div>
          <strong>自动审核识别以下本站地址</strong>
          <p>{targets.join(" 或 ")}</p>
        </div>
      </div>

      <form onSubmit={(event) => void submit(event)}>
        <div className="friend-application-grid">
          <label>
            <span>站点名称 *</span>
            <input value={form.name} onChange={(event) => update("name", event.target.value)} minLength={1} maxLength={60} required />
          </label>
          <label>
            <span>站点地址 *</span>
            <input type="url" value={form.url} onChange={(event) => update("url", event.target.value)} placeholder="https://example.com" required spellCheck={false} />
          </label>
          <label>
            <span>头像地址</span>
            <input type="url" value={form.avatarUrl} onChange={(event) => update("avatarUrl", event.target.value)} placeholder="https://example.com/avatar.webp" spellCheck={false} />
          </label>
          <label>
            <span>友链页面 *</span>
            <input type="url" value={form.backlinkUrl} onChange={(event) => update("backlinkUrl", event.target.value)} placeholder="https://example.com/friends" required spellCheck={false} />
          </label>
        </div>
        <label className="friend-application-description">
          <span>站点介绍</span>
          <textarea value={form.description} onChange={(event) => update("description", event.target.value)} rows={4} maxLength={240} placeholder="简单介绍一下你的网站" />
        </label>
        <label className="friend-application-honeypot" aria-hidden="true">
          Company<input value={form.company} onChange={(event) => update("company", event.target.value)} tabIndex={-1} autoComplete="off" />
        </label>

        {error ? (
          <div className="friend-application-result is-error" role="alert"><CircleAlert aria-hidden="true" /><span><strong>提交失败</strong><small>{error}</small></span></div>
        ) : null}
        {result ? (
          <div className={`friend-application-result ${result.status === "approved" ? "is-success" : "is-pending"}`} role="status">
            {result.status === "approved" ? <Check aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
            <span>
              <strong>{result.status === "approved" ? "自动审核通过" : "申请已保存为待审核"}</strong>
              <small>{result.reviewMessage}</small>
            </span>
          </div>
        ) : null}

        <footer>
          <p>自动审核最多需要数秒。若双向链接尚未生效，修复后可使用相同站点地址重新提交。</p>
          <ShimmerButton type="submit" disabled={submitting}>
            {submitting ? <LoaderCircle className="spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
            {submitting ? "自动审核中" : "提交并自动审核"}
          </ShimmerButton>
        </footer>
      </form>
    </section>
  )
}
