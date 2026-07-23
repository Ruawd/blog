import type { Metadata } from "next"

import { ManagedPageBody } from "@/components/managed-page-body"
import { SiteFrame } from "@/components/site-frame"
import { UsesGrid } from "@/components/uses-grid"
import { getPageContent } from "@/lib/page-content"

export const metadata: Metadata = {
  title: "使用清单",
  description: "Ruawd 个人页使用的工具、技术与服务。",
  alternates: { canonical: "/uses" },
}

export const dynamic = "force-dynamic"

export default async function UsesPage() {
  const page = await getPageContent("uses")
  return (
    <SiteFrame eyebrow={page.eyebrow} title={page.title} description={page.description}>
      <ManagedPageBody content={page.body} />
      <UsesGrid />
    </SiteFrame>
  )
}
