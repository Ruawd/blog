"use client"

import { useEffect, useState } from "react"
import { Eye } from "lucide-react"

import { NumberTicker } from "@/components/ui/number-ticker"

export function PostViewCount({
  slug,
  initialCount,
  track = false,
  showLabel = false,
}: {
  slug: string
  initialCount: number
  track?: boolean
  showLabel?: boolean
}) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    if (!track) return
    const controller = new AbortController()
    void fetch(`/api/posts/${encodeURIComponent(slug)}/view`, {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => response.ok ? response.json() as Promise<{ count?: number }> : null)
      .then((result) => {
        if (result && Number.isFinite(result.count)) setCount(Math.max(0, Number(result.count)))
      })
      .catch(() => {})
    return () => controller.abort()
  }, [slug, track])

  return (
    <span
      className={showLabel ? "post-view-count has-label" : "post-view-count"}
      data-view-slug={slug}
      data-view-count={count}
      title={`${count.toLocaleString("zh-CN")} 次浏览`}
      aria-live={track ? "polite" : undefined}
    >
      <Eye aria-hidden="true" />
      <NumberTicker className="post-view-number" value={count} decimals={1} notation="compact" />
      <span className={showLabel ? "post-view-label" : "sr-only"}>次浏览</span>
    </span>
  )
}
