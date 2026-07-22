import type { Metadata } from "next"
import { ArrowUpRight } from "lucide-react"

import { FriendApplicationForm } from "@/components/friend-application-form"
import { ResilientImage } from "@/components/resilient-image"
import { SiteFrame } from "@/components/site-frame"
import { ManagedPageBody } from "@/components/managed-page-body"
import { listPublicFriendLinks } from "@/lib/friend-repository"
import { getPageContent } from "@/lib/page-content"
import { siteConfig } from "@/lib/site"

export const metadata: Metadata = {
  title: "友链",
  description: "Ruawd Blog 的友情链接与友链申请说明。",
}

export const dynamic = "force-dynamic"

export default async function FriendsPage() {
  const page = await getPageContent("friends")
  const friends = listPublicFriendLinks()
  return (
    <SiteFrame
      eyebrow={page.eyebrow}
      title={page.title}
      description={page.description}
    >
      <ManagedPageBody content={page.body} />
      <section className="page-section" aria-labelledby="friends-title">
        <div className="page-section-heading">
          <div>
            <p className="section-kicker">GOOD PLACES</p>
            <h2 id="friends-title">值得拜访的邻居</h2>
          </div>
          <p>欢迎沿着这些链接，拜访互联网里的好邻居。</p>
        </div>

        <div className="friend-grid">
          {friends.map((friend, index) => (
            <article className="friend-card" key={friend.url}>
              <header className="friend-card-header">
                {friend.avatarUrl ? (
                  <ResilientImage className="friend-avatar" src={friend.avatarUrl} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="friend-avatar friend-avatar-fallback" aria-hidden="true">{friend.name.slice(0, 1)}</span>
                )}
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
          <p>请先在你的友链页面添加本站。提交后系统会验证 HTTPS 可达性、头像与双向链接，通过后自动展示。</p>
          <a href="#friend-application">
            在线申请<ArrowUpRight aria-hidden="true" />
          </a>
        </aside>

        <FriendApplicationForm targets={siteConfig.friendBacklinkTargets} />
      </section>
    </SiteFrame>
  )
}
