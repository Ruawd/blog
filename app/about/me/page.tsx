import type { Metadata } from "next"
import Image from "next/image"
import { Code2, Mail } from "lucide-react"

import { SiteFrame } from "@/components/site-frame"
import { siteConfig } from "@/lib/site"

export const metadata: Metadata = {
  title: "关于我",
  description: "关于 Ruawd 与 Ruawd Blog。",
}

export default function AboutMePage() {
  return (
    <SiteFrame
      eyebrow="ABOUT / 关于我"
      title="你好，我是 Ruawd"
      description="Hello, I'm Ruawd. 欢迎来到我的个人博客。"
    >
      <div className="about-layout migrated-about">
        <article className="about-story" aria-labelledby="about-story-title">
          <p className="section-kicker">ABOUT THIS SITE</p>
          <h2 id="about-story-title">记录技术实践，也记录真实使用体验。</h2>
          <p>
            这里主要整理自建服务、服务器部署、VPS 测评和实际使用中遇到的问题。
            文章从原来的 Firefly 博客迁移而来，并继续在这个 Next.js 站点更新。
          </p>
          <p>
            旧站自 2025 年 10 月 22 日开始记录。迁移后，原文的发布时间、分类、标签、配图和密码保护均被保留。
          </p>
          <div className="about-contact-links">
            <a href={siteConfig.github} target="_blank" rel="noreferrer"><Code2 aria-hidden="true" />GitHub</a>
            <a href={`mailto:${siteConfig.email}`}><Mail aria-hidden="true" />{siteConfig.email}</a>
          </div>
        </article>

        <aside className="about-profile-card" aria-label="Ruawd 的个人资料">
          <Image src={siteConfig.avatar} alt="Ruawd 的头像" width={520} height={520} priority />
          <p className="section-kicker">PROFILE</p>
          <h2>Ruawd</h2>
          <p>Hello, I&apos;m Ruawd.</p>
          <dl>
            <div><dt>博客</dt><dd>{siteConfig.url}</dd></div>
            <div><dt>语言</dt><dd>简体中文</dd></div>
            <div><dt>开始记录</dt><dd>2025.10.22</dd></div>
          </dl>
        </aside>
      </div>
    </SiteFrame>
  )
}
