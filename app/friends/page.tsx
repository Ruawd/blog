import type { Metadata } from "next"
import { ArrowUpRight } from "lucide-react"

import { SiteFrame } from "@/components/site-frame"
import { friends } from "@/lib/migrated-content"
import { siteConfig } from "@/lib/site"

export const metadata: Metadata = {
  title: "友链",
  description: "Ruawd Blog 的友情链接与友链申请说明。",
}

export default function FriendsPage() {
  return (
    <SiteFrame
      eyebrow="NEIGHBORS / FRIENDS"
      title="友链"
      description="把旧博客里收藏的网络邻居原样带到这里。"
    >
      <section className="page-section" aria-labelledby="friends-title">
        <div className="page-section-heading">
          <div>
            <p className="section-kicker">GOOD PLACES</p>
            <h2 id="friends-title">值得拜访的邻居</h2>
          </div>
          <p>友链名称、介绍和地址均迁移自原博客。</p>
        </div>

        <div className="friend-grid">
          {friends.map((friend, index) => (
            <article className="friend-card" key={friend.url}>
              <header className="friend-card-header">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="friend-avatar" src={friend.image} alt="" loading="lazy" />
                <span className="friend-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </header>
              <div className="friend-copy">
                <h3>{friend.name}</h3>
                <p>{friend.description}</p>
              </div>
              <a href={friend.url} target="_blank" rel="noreferrer">
                <span>{new URL(friend.url).hostname}</span>
                <ArrowUpRight aria-hidden="true" />
                <span className="sr-only">，在新窗口访问{friend.name}</span>
              </a>
            </article>
          ))}
        </div>

        <aside className="friend-note" aria-labelledby="friend-note-title">
          <div>
            <p className="section-kicker">EXCHANGE LINKS</p>
            <h2 id="friend-note-title">申请友链</h2>
          </div>
          <p>请先添加本站，并附上站点名称、介绍、链接和头像。站点需支持 HTTPS、可正常访问，并以原创内容为主。</p>
          <a href={`mailto:${siteConfig.email}?subject=${encodeURIComponent("友链申请 - [站点名称]")}`}>
            发邮件申请<ArrowUpRight aria-hidden="true" />
          </a>
        </aside>
      </section>
    </SiteFrame>
  )
}
