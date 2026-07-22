"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUp, Check, Link2, MessageSquare } from "lucide-react"

import type { ArticleHeading } from "@/lib/article-headings"

type ArticleReadingToolsProps = {
  headings: ArticleHeading[]
}

function headingsMatch(current: ArticleHeading[], next: ArticleHeading[]) {
  return current.length === next.length && current.every((item, index) => (
    item.id === next[index]?.id && item.label === next[index]?.label && item.level === next[index]?.level
  ))
}

export function ArticleReadingTools({ headings }: ArticleReadingToolsProps) {
  const [tocItems, setTocItems] = useState(headings)
  const [activeId, setActiveId] = useState(headings[0]?.id ?? "")
  const [progress, setProgress] = useState(0)
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<number | null>(null)

  useEffect(() => {
    const articleColumn = document.querySelector<HTMLElement>(".article-reading-column")
    if (!articleColumn) return

    const syncHeadings = () => {
      const next = Array.from(
        articleColumn.querySelectorAll<HTMLElement>(".article-prose h1[id], .article-prose h2[id], .article-prose h3[id]"),
      ).map((heading) => ({
        id: heading.id,
        label: heading.textContent?.trim() || heading.id,
        level: Number(heading.tagName.slice(1)) as 1 | 2 | 3,
      }))
      setTocItems((current) => headingsMatch(current, next) ? current : next)
    }

    syncHeadings()
    const observer = new MutationObserver(syncHeadings)
    observer.observe(articleColumn, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let frame = 0
    const updateReadingState = () => {
      const documentElement = document.documentElement
      const headerHeight = Number.parseFloat(
        getComputedStyle(documentElement).getPropertyValue("--header-height"),
      ) || 72
      const article = document.querySelector<HTMLElement>(".article-page")
      if (article) {
        const articleTop = window.scrollY + article.getBoundingClientRect().top - headerHeight
        const readableDistance = Math.max(article.offsetHeight - window.innerHeight + headerHeight, 1)
        setProgress(Math.min(1, Math.max(0, (window.scrollY - articleTop) / readableDistance)))
      }

      if (tocItems.length) {
        let currentId = tocItems[0].id
        for (const item of tocItems) {
          const heading = document.getElementById(item.id)
          if (!heading || heading.getBoundingClientRect().top > headerHeight + 72) break
          currentId = item.id
        }
        setActiveId(currentId)
      }
      frame = 0
    }
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateReadingState)
    }

    requestUpdate()
    window.addEventListener("scroll", requestUpdate, { passive: true })
    window.addEventListener("resize", requestUpdate)
    return () => {
      window.removeEventListener("scroll", requestUpdate)
      window.removeEventListener("resize", requestUpdate)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [tocItems])

  useEffect(() => () => {
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current)
  }, [])

  function scrollToTop() {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" })
  }

  function scrollToComments() {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    document.getElementById("article-comments")?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    })
    document.getElementById("article-comments-title")?.focus({ preventScroll: true })
  }

  async function copyLink() {
    const pageUrl = `${window.location.origin}${window.location.pathname}`
    try {
      await navigator.clipboard.writeText(pageUrl)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = pageUrl
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      textarea.remove()
    }
    setCopied(true)
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current)
    copiedTimer.current = window.setTimeout(() => setCopied(false), 2200)
  }

  return (
    <>
      <div
        className="article-progress"
        role="progressbar"
        aria-label="文章阅读进度"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>

      {tocItems.length ? (
        <aside className="article-toc" aria-label="文章目录">
          <p>本页目录</p>
          <nav>
            <ol>
              {tocItems.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    data-level={item.level}
                    aria-current={activeId === item.id ? "location" : undefined}
                    onClick={() => setActiveId(item.id)}
                  >
                    <span aria-hidden="true">#</span>{item.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>
      ) : null}

      <div className="article-actions" aria-label="文章快捷操作">
        <button type="button" onClick={scrollToTop} aria-label="返回顶部" title="返回顶部">
          <ArrowUp aria-hidden="true" />
          <span className="article-action-label" aria-hidden="true">返回顶部</span>
        </button>
        <button type="button" onClick={scrollToComments} aria-label="直达评论" title="直达评论">
          <MessageSquare aria-hidden="true" />
          <span className="article-action-label" aria-hidden="true">直达评论</span>
        </button>
        <button type="button" onClick={copyLink} aria-label={copied ? "链接已复制" : "复制文章链接"} title="复制文章链接">
          {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
          <span className="article-action-label" aria-hidden="true">{copied ? "已复制" : "复制链接"}</span>
        </button>
        <span className="sr-only" aria-live="polite">{copied ? "文章链接已复制" : ""}</span>
      </div>
    </>
  )
}
