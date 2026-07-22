import type { Metadata } from "next"
import { Clapperboard } from "lucide-react"

import { SiteFrame } from "@/components/site-frame"
import { ManagedPageBody } from "@/components/managed-page-body"
import { getPageContent } from "@/lib/page-content"

export const metadata: Metadata = {
  title: "番组计划",
  description: "Ruawd 的番组计划。",
}

export const dynamic = "force-dynamic"

export default async function BangumiPage() {
  const page = await getPageContent("bangumi")
  return (
    <SiteFrame
      eyebrow={page.eyebrow}
      title={page.title}
      description={page.description}
    >
      <ManagedPageBody content={page.body} />
      <section className="empty-state" aria-labelledby="bangumi-empty-title">
        <Clapperboard aria-hidden="true" />
        <p className="section-kicker">NO ENTRIES YET</p>
        <h2 id="bangumi-empty-title">片单还是空的</h2>
        <p>之后会在这里整理想看、在看和看过的番组。</p>
      </section>
    </SiteFrame>
  )
}
