import type { Metadata } from "next"

import { SiteFrame } from "@/components/site-frame"

export const metadata: Metadata = {
  title: "博客",
  description: "收集生活随笔、数字生活与个人网站的阶段性记录。",
}

const posts = [
  {
    date: "2026-07-18",
    displayDate: "2026.07.18",
    category: "随笔",
    title: "把生活写成一个可以回来的地方",
    excerpt:
      "比起追赶即时的热闹，我更想把那些微小但确定的感受留下：一阵晚风、一段路，以及某天忽然想明白的事。",
    readingTime: "约 4 分钟",
    tags: ["生活", "记录"],
  },
  {
    date: "2026-07-06",
    displayDate: "2026.07.06",
    category: "数字生活",
    title: "少一点工具，多一点秩序",
    excerpt:
      "整理信息的关键不是找到万能软件，而是让每一条内容都有清晰的去处，也允许没有价值的东西自然消失。",
    readingTime: "约 6 分钟",
    tags: ["效率", "整理"],
  },
  {
    date: "2026-06-22",
    displayDate: "2026.06.22",
    category: "月度小结",
    title: "这个月看过、听过与记住的事",
    excerpt:
      "几部动画、两张循环播放的专辑，还有一场突如其来的雨。这里是六月留给我的一些片段。",
    readingTime: "约 5 分钟",
    tags: ["动画", "音乐", "日常"],
  },
  {
    date: "2026-06-08",
    displayDate: "2026.06.08",
    category: "建站手记",
    title: "为个人网站保留一点“不高效”",
    excerpt:
      "自己搭建一处小小的网络空间，也许不够快捷，却能让表达重新拥有形状、节奏和属于自己的边界。",
    readingTime: "约 7 分钟",
    tags: ["网站", "设计"],
  },
] as const

export default function BlogPage() {
  return (
    <SiteFrame
      eyebrow="JOURNAL / BLOG"
      title="博客"
      description="写下正在经历的生活，也整理那些值得再次翻开的想法。"
    >
      <section className="page-section" aria-labelledby="latest-posts-title">
        <div className="page-section-heading">
          <div>
            <p className="section-kicker">LATEST NOTES</p>
            <h2 id="latest-posts-title">最近写下的</h2>
          </div>
          <p>这里暂时放着一些文章样稿，之后会慢慢长成完整的博客。</p>
        </div>

        <div className="post-list">
          {posts.map((post, index) => (
            <article className="post-card" key={post.title}>
              <header className="post-meta">
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <time dateTime={post.date}>{post.displayDate}</time>
                <span>{post.category}</span>
              </header>

              <div className="post-copy">
                <h3>{post.title}</h3>
                <p>{post.excerpt}</p>
              </div>

              <footer className="post-footer">
                <ul className="post-tags" aria-label="文章标签">
                  {post.tags.map((tag) => (
                    <li key={tag}>#{tag}</li>
                  ))}
                </ul>
                <span>{post.readingTime}</span>
              </footer>
            </article>
          ))}
        </div>
      </section>
    </SiteFrame>
  )
}
