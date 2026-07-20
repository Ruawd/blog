import type { CSSProperties } from "react"
import type { Metadata } from "next"

import { SiteFrame } from "@/components/site-frame"

export const metadata: Metadata = {
  title: "番组计划",
  description: "记录正在观看、准备观看与已经看完的动画。",
}

const shelves = [
  {
    id: "watching",
    title: "正在看",
    label: "WATCHING",
    items: [
      {
        title: "胆大党 第二季",
        subtitle: "每周等待新一集的快乐还在继续。",
        progress: 42,
        episode: "05 / 12 话",
        tags: ["奇幻", "喜剧", "热血"],
      },
      {
        title: "夏日重现",
        subtitle: "海岛、时间循环与逐渐收紧的悬念。",
        progress: 68,
        episode: "17 / 25 话",
        tags: ["悬疑", "轮回"],
      },
      {
        title: "摇曳露营△",
        subtitle: "适合在忙碌一天后慢慢看的温柔日常。",
        progress: 50,
        episode: "06 / 12 话",
        tags: ["日常", "旅行"],
      },
    ],
  },
  {
    id: "planned",
    title: "想看",
    label: "PLANNED",
    items: [
      {
        title: "迷宫饭",
        subtitle: "想在完整空闲的一周里，从头好好看完。",
        progress: 0,
        episode: "尚未开始",
        tags: ["冒险", "美食"],
      },
      {
        title: "葬送的芙莉莲",
        subtitle: "关于时间、记忆和漫长旅途的故事。",
        progress: 0,
        episode: "等待开看",
        tags: ["奇幻", "公路片"],
      },
      {
        title: "跃动青春",
        subtitle: "留给需要补充一点明亮能量的周末。",
        progress: 0,
        episode: "收藏中",
        tags: ["校园", "青春"],
      },
    ],
  },
  {
    id: "completed",
    title: "看过",
    label: "COMPLETED",
    items: [
      {
        title: "孤独摇滚！",
        subtitle: "紧张、好笑又真诚，歌单至今仍在循环。",
        progress: 100,
        episode: "12 / 12 话",
        tags: ["音乐", "喜剧"],
      },
      {
        title: "宇宙よりも遠い場所",
        subtitle: "去比宇宙更远的地方，也重新认识自己。",
        progress: 100,
        episode: "13 / 13 话",
        tags: ["旅行", "成长"],
      },
      {
        title: "乒乓 THE ANIMATION",
        subtitle: "短促、有力，关于天赋也关于如何成为自己。",
        progress: 100,
        episode: "11 / 11 话",
        tags: ["运动", "成长"],
      },
    ],
  },
] as const

export default function BangumiPage() {
  return (
    <SiteFrame
      eyebrow="MY / BANGUMI"
      title="番组计划"
      description="给看过的故事留一张清单，也给下一次打开播放器留一点期待。"
    >
      <section className="page-section" aria-labelledby="bangumi-title">
        <header className="page-section-heading">
          <div>
            <p className="section-kicker">ANIME SHELF</p>
            <h2 id="bangumi-title">我的观看清单</h2>
          </div>
          <p>以下是用于展示页面结构的占位记录，进度和条目会随着观看慢慢更新。</p>
        </header>

        <div className="bangumi-board">
          {shelves.map((shelf) => (
            <section className="bangumi-column" aria-labelledby={`${shelf.id}-title`} key={shelf.id}>
              <h2 id={`${shelf.id}-title`}>
                {shelf.label} / {shelf.title}
              </h2>

              {shelf.items.map((item) => (
                <article className="bangumi-card" key={item.title}>
                  <div className="bangumi-meta">
                    <span>{item.episode}</span>
                    <span aria-label="完成度">{item.progress}%</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.subtitle}</p>

                  <ul className="bangumi-tags" aria-label={`${item.title}的标签`}>
                    {item.tags.map((tag) => (
                      <li className="chip" key={tag}>{tag}</li>
                    ))}
                  </ul>

                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-label={`${item.title}观看进度`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={item.progress}
                    aria-valuetext={item.episode}
                  >
                    <span
                      className="progress-bar"
                      style={{ width: `${item.progress}%` } as CSSProperties}
                    />
                  </div>
                </article>
              ))}
            </section>
          ))}
        </div>
      </section>
    </SiteFrame>
  )
}
