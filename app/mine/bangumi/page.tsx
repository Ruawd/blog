import type { Metadata } from "next"
import { Clapperboard } from "lucide-react"

import { SiteFrame } from "@/components/site-frame"

export const metadata: Metadata = {
  title: "番组计划",
  description: "Ruawd 的番组计划。",
}

export default function BangumiPage() {
  return (
    <SiteFrame
      eyebrow="MY / BANGUMI"
      title="番组计划"
      description="想看、在看与看过的动画记录；片单目前还没有添加条目。"
    >
      <section className="empty-state" aria-labelledby="bangumi-empty-title">
        <Clapperboard aria-hidden="true" />
        <p className="section-kicker">NO ENTRIES YET</p>
        <h2 id="bangumi-empty-title">片单还是空的</h2>
        <p>之后会在这里整理想看、在看和看过的番组。</p>
      </section>
    </SiteFrame>
  )
}
