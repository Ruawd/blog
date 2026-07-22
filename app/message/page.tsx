import type { Metadata } from "next"
import { CommentSection } from "@/components/comment-section"
import { ManagedPageBody } from "@/components/managed-page-body"
import { SiteFrame } from "@/components/site-frame"
import { getPageContent } from "@/lib/page-content"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "留言",
  description: "在这里留下你的足迹，或通过邮件联系 Ruawd。",
}

export default async function MessagePage() {
  const page = await getPageContent("message")
  return (
    <SiteFrame
      eyebrow={page.eyebrow}
      title={page.title}
      description={page.description}
    >
      <ManagedPageBody content={page.body} />
      <CommentSection scope="guestbook" target="guestbook" />
    </SiteFrame>
  )
}
