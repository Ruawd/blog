import type { Metadata } from "next"
import Image from "next/image"
import { Code2, Mail } from "lucide-react"

import { SiteFrame } from "@/components/site-frame"
import { ManagedPageBody } from "@/components/managed-page-body"
import { Highlighter } from "@/components/ui/highlighter"
import { getPageContent } from "@/lib/page-content"
import { siteConfig } from "@/lib/site"

export const metadata: Metadata = {
  title: "关于我",
  description: "关于 Ruawd 与 Ruawd Blog。",
}

export const dynamic = "force-dynamic"

export default async function AboutMePage() {
  const page = await getPageContent("about")
  return (
    <SiteFrame
      eyebrow={page.eyebrow}
      title={page.title}
      description={page.description}
    >
      <ManagedPageBody content={page.body} />
      <div className="about-layout migrated-about">
        <article className="about-story" aria-labelledby="about-story-title">
          <p className="section-kicker">ABOUT THIS SITE</p>
          <h2 id="about-story-title">记录技术实践，也记录<Highlighter>真实使用体验</Highlighter>。</h2>
          <p>
            这里主要整理自建服务、服务器部署、VPS 测评和实际使用中遇到的问题。
            也会记录数字生活里值得留下的片段，以及亲自用过之后的真实感受。
          </p>
          <p>
            从 2025 年 10 月 22 日开始记录，希望这些踩坑过程和使用体验也能帮到后来的人。
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
