import type { Metadata } from "next"
import { CircleAlert, RefreshCw } from "lucide-react"

import { BangumiBoard } from "@/components/bangumi-board"
import { SiteFrame } from "@/components/site-frame"
import { ManagedPageBody } from "@/components/managed-page-body"
import { getBangumiLibrary } from "@/lib/bangumi-api"
import { getBangumiSettings } from "@/lib/bangumi-settings"
import { getPageContent } from "@/lib/page-content"

export const metadata: Metadata = {
  title: "番组计划",
  description: "Ruawd 的番组计划。",
}

export const dynamic = "force-dynamic"

export default async function BangumiPage() {
  const page = await getPageContent("bangumi")
  const settings = getBangumiSettings()
  let library = null
  let error = ""
  try {
    library = await getBangumiLibrary(settings)
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Bangumi 数据暂时无法读取"
  }
  return (
    <SiteFrame
      eyebrow={page.eyebrow}
      title={page.title}
      description={page.description}
    >
      {page.body.trim() ? <ManagedPageBody content={page.body} /> : null}
      {library ? <BangumiBoard library={library} /> : (
        <section className="bangumi-error-state" role="alert">
          <CircleAlert aria-hidden="true" />
          <p className="section-kicker">BANGUMI API</p>
          <h2>番组数据暂时无法读取</h2>
          <p>{error}</p>
          <a href="/mine/bangumi"><RefreshCw aria-hidden="true" />重新加载</a>
        </section>
      )}
    </SiteFrame>
  )
}
