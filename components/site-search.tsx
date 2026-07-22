"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { ArrowRight, FileText, LoaderCircle, Search, X } from "lucide-react"

type SearchResult = {
  type: "article" | "page"
  title: string
  description: string
  meta: string
  href: string
}

export function SiteSearch() {
  const router = useRouter()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  function close(restoreFocus = true) {
    setOpen(false)
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus())
  }

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    document.addEventListener("keydown", shortcut)
    return () => document.removeEventListener("keydown", shortcut)
  }, [])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        })
        const payload = await response.json() as { results?: SearchResult[] }
        if (!response.ok) throw new Error()
        setResults(payload.results || [])
        setActiveIndex(0)
      } catch (error) {
        if ((error as Error).name !== "AbortError") setResults([])
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, query ? 180 : 0)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [open, query])

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault()
      close()
      return
    }
    if (event.key === "Tab") {
      const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>(
        'input, a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => element.offsetParent !== null)
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (first && last && event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (first && last && !event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
      return
    }
    if (!results.length) return
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % results.length)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((current) => (current - 1 + results.length) % results.length)
    } else if (event.key === "Enter") {
      event.preventDefault()
      const result = results[activeIndex]
      if (result) {
        close(false)
        router.push(result.href)
      }
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        className="site-search-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="搜索全站内容"
        onClick={() => setOpen(true)}
      >
        <Search aria-hidden="true" />
        <span>搜索</span>
        <kbd>⌘K</kbd>
      </button>

      {open ? (
        <div className="site-search-layer" role="presentation">
          <button className="site-search-backdrop" type="button" aria-label="关闭搜索" onClick={() => close()} />
          <div
            className="site-search-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="全站搜索"
            onKeyDown={handleDialogKeyDown}
          >
            <header className="site-search-box">
              {loading ? <LoaderCircle className="spin" aria-hidden="true" /> : <Search aria-hidden="true" />}
              <label className="sr-only" htmlFor="site-search-input">搜索文章和页面</label>
              <input
                ref={inputRef}
                id="site-search-input"
                type="search"
                value={query}
                placeholder="搜索文章、相册、页面或拼音…"
                autoComplete="off"
                onChange={(event) => setQuery(event.target.value)}
              />
              <button type="button" aria-label="关闭搜索" onClick={() => close()}><X aria-hidden="true" /></button>
            </header>

            <div className="site-search-results" role="listbox" aria-label="搜索结果">
              {results.length ? results.map((result, index) => (
                <Link
                  className={index === activeIndex ? "is-active" : ""}
                  href={result.href}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => close(false)}
                  key={`${result.type}:${result.href}`}
                >
                  <span className="site-search-result-icon">
                    {result.type === "article" ? <FileText aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
                  </span>
                  <span>
                    <strong>{result.title}</strong>
                    <small>{result.description}</small>
                  </span>
                  <em>{result.meta}</em>
                </Link>
              )) : (
                <div className="site-search-empty" role="status">
                  <Search aria-hidden="true" />
                  <p>{loading ? "正在搜索…" : query ? "没有找到匹配内容" : "暂时没有可搜索的内容"}</p>
                </div>
              )}
            </div>

            <footer className="site-search-help">
              <span><kbd>↑</kbd><kbd>↓</kbd>选择</span>
              <span><kbd>Enter</kbd>打开</span>
              <span><kbd>Esc</kbd>关闭</span>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  )
}
