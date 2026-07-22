"use client"

import { FormEvent, useState } from "react"
import { KeyRound, LockKeyhole } from "lucide-react"

import { ArticleMarkdown } from "@/components/article-markdown"
import { decryptArticleContent } from "@/lib/article-crypto"
import type { EncryptedBlogContent } from "@/lib/blog-posts.generated"

type ProtectedArticleProps = {
  encrypted: EncryptedBlogContent
  passwordHint?: string
}

export function ProtectedArticle({ encrypted, passwordHint }: ProtectedArticleProps) {
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [isUnlocking, setIsUnlocking] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const password = new FormData(form).get("password")?.toString() || ""

    setError("")
    setIsUnlocking(true)
    try {
      setContent(await decryptArticleContent(encrypted, password))
      form.reset()
    } catch {
      setError("密码不正确，请重新输入。")
    } finally {
      setIsUnlocking(false)
    }
  }

  if (content) return <ArticleMarkdown content={content} />

  return (
    <section className="article-lock" aria-labelledby="article-lock-title">
      <LockKeyhole aria-hidden="true" />
      <p className="section-kicker">PROTECTED ARTICLE</p>
      <h2 id="article-lock-title">这篇文章受密码保护</h2>
      <p>保护方式已从旧博客保留。正文只会在你的浏览器里解密。</p>
      {passwordHint ? <p className="article-password-hint">提示：{passwordHint}</p> : null}
      <form onSubmit={handleSubmit}>
        <label htmlFor="article-password">文章密码</label>
        <div>
          <input
            id="article-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-describedby={error ? "article-password-error" : undefined}
          />
          <button type="submit" disabled={isUnlocking}>
            <KeyRound aria-hidden="true" />
            {isUnlocking ? "正在解锁" : "解锁文章"}
          </button>
        </div>
        {error ? <p id="article-password-error" role="alert">{error}</p> : null}
      </form>
    </section>
  )
}
