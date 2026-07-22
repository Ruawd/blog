import type { Metadata } from "next"
import { ArrowUpRight } from "lucide-react"

import { SiteFrame } from "@/components/site-frame"
import { siteConfig } from "@/lib/site"

export const metadata: Metadata = {
  title: "留言",
  description: "在个人网站的留言板上，留下问候、想法与偶然经过的痕迹。",
}

const messages = [
  {
    author: "晴川",
    initials: "QC",
    date: "2026-07-12",
    displayDate: "2026.07.12",
    content: "很喜欢这里安静又有个性的感觉。愿你一直保有记录生活的兴致，也期待看到更多照片。",
  },
  {
    author: "北岛信箱",
    initials: "BX",
    date: "2026-06-29",
    displayDate: "2026.06.29",
    content: "路过留个脚印。网页里的留白和节奏都很舒服，像一本可以慢慢翻的电子杂志。",
  },
  {
    author: "白昼梦",
    initials: "BD",
    date: "2026-06-15",
    displayDate: "2026.06.15",
    content: "因为共同喜欢的动画来到这里，希望以后有机会交换片单，也祝小站长长久久。",
  },
] as const

export default function MessagePage() {
  return (
    <SiteFrame
      eyebrow="GUESTBOOK / MESSAGE"
      title="留言"
      description="如果你恰好路过，欢迎留下一句话。所有真诚的相遇都值得被认真收藏。"
    >
      <section className="page-section guestbook-layout" aria-labelledby="guestbook-title">
        <aside className="guestbook-note">
          <p className="section-kicker">BEFORE YOU WRITE</p>
          <h2 id="guestbook-title">写给未来的留言板</h2>
          <p>
            留言提交功能还在准备中。正式开放前，你可以先通过邮件和我打个招呼；这里展示的是未来留言板的样子。
          </p>
          <a href={`mailto:${siteConfig.email}?subject=${encodeURIComponent("来自个人网站的留言")}`}>
            发一封邮件
            <ArrowUpRight aria-hidden="true" />
          </a>
          <small>请不要在公开留言中留下电话、住址等敏感信息。</small>
        </aside>

        <div className="guestbook-board">
          <div className="page-section-heading">
            <div>
              <p className="section-kicker">RECENT WORDS</p>
              <h2 id="message-list-title">最近的问候</h2>
            </div>
            <p>当前为静态示例内容，不会收集或保存任何信息。</p>
          </div>

          <div className="message-list" aria-labelledby="message-list-title">
            {messages.map((message) => (
              <article className="message-card" key={`${message.author}-${message.date}`}>
                <header className="message-card-header">
                  <span className="message-avatar" aria-hidden="true">{message.initials}</span>
                  <div>
                    <h3>{message.author}</h3>
                    <time dateTime={message.date}>{message.displayDate}</time>
                  </div>
                </header>
                <p>{message.content}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </SiteFrame>
  )
}
