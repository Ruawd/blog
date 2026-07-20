import type { Metadata } from "next"

import { SiteFrame } from "@/components/site-frame"
import { siteConfig } from "@/lib/site"

export const metadata: Metadata = {
  title: "友链",
  description: "收藏在网络上遇见的有趣个人网站，也欢迎交换友情链接。",
}

const friends = [
  {
    name: "风从海上来",
    initials: "SEA",
    description: "记录旅行、胶片与海边生活的个人博客。",
    url: "https://example.com",
    domain: "example.com",
  },
  {
    name: "半格日记",
    initials: "HALF",
    description: "关于设计、前端和偶尔冒出的奇怪点子。",
    url: "https://example.org",
    domain: "example.org",
  },
  {
    name: "月球放映室",
    initials: "MOON",
    description: "动画观后感、旧电影与深夜播放清单。",
    url: "https://example.net",
    domain: "example.net",
  },
  {
    name: "第七码头",
    initials: "PIER",
    description: "一个持续更新的摄影与城市观察档案。",
    url: "https://example.com/#pier-seven",
    domain: "example.com/pier-seven",
  },
  {
    name: "纸上宇宙",
    initials: "PAPER",
    description: "读书笔记、短篇写作和生活里的微小发现。",
    url: "https://example.org/#paper-universe",
    domain: "example.org/paper-universe",
  },
  {
    name: "凌晨四点",
    initials: "04AM",
    description: "独立开发、数字生活，以及不定期的长篇絮语。",
    url: "https://example.net/#four-am",
    domain: "example.net/four-am",
  },
] as const

export default function FriendsPage() {
  return (
    <SiteFrame
      eyebrow="NEIGHBORS / FRIENDS"
      title="友链"
      description="互联网很大，但一条链接仍然可以让两个小小的角落彼此看见。"
    >
      <section className="page-section" aria-labelledby="friends-title">
        <div className="page-section-heading">
          <div>
            <p className="section-kicker">GOOD PLACES</p>
            <h2 id="friends-title">值得拜访的邻居</h2>
          </div>
          <p>以下均为版式占位内容，正式上线前会替换为真实的友链信息。</p>
        </div>

        <div className="friend-grid">
          {friends.map((friend, index) => (
            <article className="friend-card" key={friend.name}>
              <header className="friend-card-header">
                <span className="friend-mark" aria-hidden="true">{friend.initials}</span>
                <span className="friend-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </header>
              <div className="friend-copy">
                <h3>{friend.name}</h3>
                <p>{friend.description}</p>
              </div>
              <a href={friend.url} target="_blank" rel="noreferrer">
                <span>{friend.domain}</span>
                <span aria-hidden="true">↗</span>
                <span className="sr-only">，在新窗口访问{friend.name}</span>
              </a>
            </article>
          ))}
        </div>

        <aside className="friend-note" aria-labelledby="friend-note-title">
          <div>
            <p className="section-kicker">EXCHANGE LINKS</p>
            <h2 id="friend-note-title">想和我交换友链？</h2>
          </div>
          <p>来信时请附上网站名称、地址、一句话介绍和头像链接。我会在访问后尽快回复。</p>
          <a href={`mailto:${siteConfig.email}?subject=${encodeURIComponent("交换友链")}`}>
            发邮件申请
            <span aria-hidden="true">↗</span>
          </a>
        </aside>
      </section>
    </SiteFrame>
  )
}
