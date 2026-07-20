import type { Metadata } from "next"

import { SiteFrame } from "@/components/site-frame"

export const metadata: Metadata = {
  title: "关于我",
  description: "认识这个个人网站背后的创作者，以及小站一路走来的简单记录。",
}

const facts = [
  ["身份", "独立创作者 / Web 开发者"],
  ["常驻", "中国 · 你的城市"],
  ["兴趣", "网页、摄影、动画与咖啡"],
  ["正在做", "把喜欢的事情慢慢做成作品"],
  ["联系", "hello@example.com"],
] as const

const moments = [
  {
    date: "2018",
    title: "开始记录",
    description: "写下第一篇公开笔记，尝试把学习过程和生活片段留在互联网上。",
  },
  {
    date: "2021",
    title: "重新整理",
    description: "把零散内容搬回自己的域名，也开始认真学习设计与前端开发。",
  },
  {
    date: "2024",
    title: "让兴趣相遇",
    description: "博客、照片和番组记录逐渐汇到一起，小站有了更完整的模样。",
  },
  {
    date: "现在",
    dateTime: "2026",
    title: "持续更新中",
    description: "保持好奇，记录真实的体验，也继续做一些轻巧、耐用的小东西。",
  },
] as const

export default function AboutMePage() {
  return (
    <SiteFrame
      eyebrow="ABOUT / 关于我"
      title="屏幕后的普通人"
      description="一个喜欢把生活整理成文字、照片与网页的人。这里是简短的自我介绍。"
    >
      <div className="about-layout">
        <article className="about-story" aria-labelledby="about-story-title">
          <p className="section-kicker">HELLO, THERE</p>
          <h2 id="about-story-title">你好，我是「你的名字」。</h2>
          <p>
            白天和代码、界面打交道，空闲时拍照、看动画，也会为一杯咖啡走很远的路。
            我喜欢简单但有细节的东西，希望这个网站也能保持这样的气质。
          </p>
          <p>
            建站不是为了塑造一个完美的人设，而是给自己的思考留一块长期生长的地方。
            博客记录学到的知识和当下的感受，相册保存途中遇见的光，番组计划则收纳那些陪伴过我的故事。
          </p>
          <blockquote>
            <p>认真生活，也认真记录。慢一点没关系，只要还在往前走。</p>
          </blockquote>
        </article>

        <aside className="about-facts" aria-labelledby="about-facts-title">
          <p className="section-kicker">QUICK FACTS</p>
          <h2 id="about-facts-title">一些快速信息</h2>
          <dl>
            {facts.map(([term, detail]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{detail}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>

      <section className="timeline" aria-labelledby="timeline-title">
        <header className="page-section-heading">
          <p className="section-kicker">A SHORT TIMELINE</p>
          <h2 id="timeline-title">小站与我的时间线</h2>
          <p>不是履历，只是几段值得记住的过程。</p>
        </header>

        <ol>
          {moments.map((moment) => (
            <li key={moment.date}>
              <time dateTime={"dateTime" in moment ? moment.dateTime : moment.date}>
                {moment.date}
              </time>
              <div>
                <h3>{moment.title}</h3>
                <p>{moment.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </SiteFrame>
  )
}
