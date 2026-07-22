import type { Metadata } from "next"
import { ArrowUpRight, MessageSquareText } from "lucide-react"

import { SiteFrame } from "@/components/site-frame"
import { siteConfig } from "@/lib/site"

export const metadata: Metadata = {
  title: "留言",
  description: "在这里留下你的足迹，或通过邮件联系 Ruawd。",
}

const notes = [
  "请保持友善和尊重，营造良好的交流氛围。",
  "欢迎分享你的想法，也可以提出对网站的建议。",
  "请不要发送电话、住址、密码等敏感信息。",
] as const

export default function MessagePage() {
  return (
    <SiteFrame
      eyebrow="GUESTBOOK / MESSAGE"
      title="留言"
      description="在这里留下你的足迹。留言服务接入前，可以先通过邮件和我交流。"
    >
      <section className="empty-state guestbook-empty" aria-labelledby="guestbook-title">
        <MessageSquareText aria-hidden="true" />
        <p className="section-kicker">GUESTBOOK</p>
        <h2 id="guestbook-title">留言功能正在迁移</h2>
        <p>旧博客的留言页说明已经保留，但评论服务暂未接入这个新站点。</p>
        <ul>
          {notes.map((note) => <li key={note}>{note}</li>)}
        </ul>
        <a href={`mailto:${siteConfig.email}?subject=${encodeURIComponent("来自 Ruawd Blog 的留言")}`}>
          发一封邮件<ArrowUpRight aria-hidden="true" />
        </a>
      </section>
    </SiteFrame>
  )
}
