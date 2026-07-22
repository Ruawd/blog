import type { Metadata } from "next"
import { ArrowUpRight } from "lucide-react"

import { SiteFrame } from "@/components/site-frame"
import { personalLinks } from "@/lib/migrated-content"

export const metadata: Metadata = {
  title: "链接",
  description: "Ruawd 的个人链接与联系方式。",
}

export default function LinksPage() {
  return (
    <SiteFrame
      eyebrow="LINKS / 个人链接"
      title="在别处找到我"
      description="我的个人主页、联系方式与常用站外入口。"
    >
      <section className="link-group" aria-labelledby="personal-links-title">
        <header>
          <p className="section-kicker">PROFILE</p>
          <h2 id="personal-links-title">个人链接</h2>
          <p>所有外部链接都会在新标签页打开，邮件链接除外。</p>
        </header>
        <div className="link-grid">
          {personalLinks.map((link) => (
            <a
              className="link-card"
              href={link.href}
              key={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noreferrer" : undefined}
            >
              <span className="link-card-title"><strong>{link.name}</strong><ArrowUpRight aria-hidden="true" /></span>
              <span className="link-card-description">{link.description}</span>
              <span className="link-card-domain">{link.domain}</span>
            </a>
          ))}
        </div>
      </section>
    </SiteFrame>
  )
}
