import type { Metadata } from "next"

import { SiteFrame } from "@/components/site-frame"

export const metadata: Metadata = {
  title: "链接",
  description: "按用途整理的常用网站、创作工具与灵感来源。",
}

const linkGroups = [
  {
    id: "build",
    title: "设计与开发",
    description: "写代码、查资料和打磨界面时经常打开的地方。",
    links: [
      {
        name: "Next.js",
        href: "https://nextjs.org/docs",
        domain: "nextjs.org",
        description: "React 全栈框架的官方文档与学习资源。",
      },
      {
        name: "Magic UI",
        href: "https://magicui.design/",
        domain: "magicui.design",
        description: "适合快速组合动效与视觉细节的组件库。",
      },
      {
        name: "MDN Web Docs",
        href: "https://developer.mozilla.org/zh-CN/",
        domain: "developer.mozilla.org",
        description: "可靠、完整的 Web 平台参考资料。",
      },
      {
        name: "GitHub",
        href: "https://github.com/",
        domain: "github.com",
        description: "托管代码，也发现值得学习的开源项目。",
      },
    ],
  },
  {
    id: "inspiration",
    title: "灵感与阅读",
    description: "寻找视觉线索、阅读长文，以及让思路重新流动。",
    links: [
      {
        name: "2x.nz",
        href: "https://2x.nz/",
        domain: "2x.nz",
        description: "这个小站在排版与氛围上的灵感起点。",
      },
      {
        name: "Are.na",
        href: "https://www.are.na/",
        domain: "are.na",
        description: "把图像、文字和链接整理成长期生长的灵感板。",
      },
      {
        name: "Smashing Magazine",
        href: "https://www.smashingmagazine.com/",
        domain: "smashingmagazine.com",
        description: "关于设计、前端与用户体验的深度文章。",
      },
    ],
  },
  {
    id: "daily",
    title: "日常去处",
    description: "兴趣收藏、影音标记与旧网页漫游。",
    links: [
      {
        name: "Bangumi",
        href: "https://bgm.tv/",
        domain: "bgm.tv",
        description: "管理动画进度，也看看同好们的短评。",
      },
      {
        name: "豆瓣",
        href: "https://www.douban.com/",
        domain: "douban.com",
        description: "为读过、看过和听过的内容留下标记。",
      },
      {
        name: "Internet Archive",
        href: "https://archive.org/",
        domain: "archive.org",
        description: "在互联网档案里寻找消失的网页与数字记忆。",
      },
    ],
  },
] as const

export default function LinksPage() {
  return (
    <SiteFrame
      eyebrow="LINKS / 常用链接"
      title="通往别处的入口"
      description="这里整理了我常用的工具、喜欢的网站和偶尔漫游的网络角落。所有链接都会在新标签页打开。"
    >
      <div className="link-groups">
        {linkGroups.map((group) => (
          <section
            className="link-group"
            aria-labelledby={`link-group-${group.id}`}
            key={group.id}
          >
            <header>
              <p className="section-kicker">{group.id.toUpperCase()}</p>
              <h2 id={`link-group-${group.id}`}>{group.title}</h2>
              <p>{group.description}</p>
            </header>

            <div className="link-grid">
              {group.links.map((link) => (
                <a
                  className="link-card"
                  href={link.href}
                  key={link.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${link.name}（在新标签页打开）`}
                >
                  <span className="link-card-title">
                    <strong>{link.name}</strong>
                    <span aria-hidden="true">↗</span>
                  </span>
                  <span className="link-card-description">{link.description}</span>
                  <span className="link-card-domain">{link.domain}</span>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </SiteFrame>
  )
}
