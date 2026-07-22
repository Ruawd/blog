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
      description="保留旧博客的番组入口；原数据列表目前还没有添加条目。"
    >
      <section className="empty-state" aria-labelledby="bangumi-empty-title">
        <Clapperboard aria-hidden="true" />
        <p className="section-kicker">NO ENTRIES YET</p>
        <h2 id="bangumi-empty-title">片单还是空的</h2>
        <p>旧博客的 <code>anime-list.json</code> 目前没有条目，因此这里不再展示虚构的占位番组。</p>
      </section>
    </SiteFrame>
  )
}
