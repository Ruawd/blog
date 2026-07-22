"use client"

import { FormEvent, useState } from "react"
import { KeyRound, LockKeyhole } from "lucide-react"

import { ArticleMarkdown } from "@/components/article-markdown"
import type { EncryptedBlogContent } from "@/lib/blog-posts.generated"

type ProtectedArticleProps = {
  encrypted: EncryptedBlogContent
  passwordHint?: string
}

function decodeBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

async function decryptArticle(encrypted: EncryptedBlogContent, password: string) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  )
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: decodeBase64(encrypted.salt),
      iterations: encrypted.iterations,
    },
    keyMaterial,
    { name: encrypted.algorithm, length: 256 },
    false,
    ["decrypt"],
  )
  const plainBuffer = await crypto.subtle.decrypt(
    { name: encrypted.algorithm, iv: decodeBase64(encrypted.iv) },
    key,
    decodeBase64(encrypted.payload),
  )
  return new TextDecoder().decode(plainBuffer)
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
      setContent(await decryptArticle(encrypted, password))
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
