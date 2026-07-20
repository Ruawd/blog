import type { Metadata } from "next"
import Image from "next/image"

import { SiteFrame } from "@/components/site-frame"

export const metadata: Metadata = {
  title: "相册",
  description: "收集旅途中、街巷里与寻常日子中值得记住的光影。",
}

const photos = [
  {
    src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85",
    alt: "清晨薄雾中的山坡与远处树林",
    title: "雾醒之前",
    location: "川西",
    date: "2026-06-18",
    displayDate: "2026.06.18",
  },
  {
    src: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1600&q=85",
    alt: "群山环绕的湖泊与湖畔木屋",
    title: "湖边住一晚",
    location: "大理",
    date: "2026-05-03",
    displayDate: "2026.05.03",
  },
  {
    src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=85",
    alt: "阳光穿过茂密树林洒在林间小路上",
    title: "树影有风",
    location: "杭州",
    date: "2026-04-12",
    displayDate: "2026.04.12",
  },
  {
    src: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1600&q=85",
    alt: "从高处俯瞰排列整齐的城市街区",
    title: "城市切片",
    location: "上海",
    date: "2026-03-29",
    displayDate: "2026.03.29",
  },
  {
    src: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1600&q=85",
    alt: "雪山脚下被暖光照亮的木屋",
    title: "山里亮灯了",
    location: "长白山",
    date: "2026-02-16",
    displayDate: "2026.02.16",
  },
  {
    src: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=85",
    alt: "荒野中延伸到群山方向的公路",
    title: "向远处去",
    location: "青海",
    date: "2025-10-07",
    displayDate: "2025.10.07",
  },
  {
    src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=85",
    alt: "徒步者站在山谷岩石旁眺望湖面",
    title: "路的尽头",
    location: "云南",
    date: "2025-08-22",
    displayDate: "2025.08.22",
  },
  {
    src: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1600&q=85",
    alt: "暮色里灯光初上的城市天际线",
    title: "蓝调时刻",
    location: "深圳",
    date: "2025-07-11",
    displayDate: "2025.07.11",
  },
] as const

export default function AlbumPage() {
  return (
    <SiteFrame
      eyebrow="MY / ALBUM"
      title="相册"
      description="用照片保存那些差一点就被忘记的天气、街道和远方。"
    >
      <section className="page-section" aria-labelledby="album-title">
        <header className="page-section-heading">
          <div>
            <p className="section-kicker">RECENT FRAMES</p>
            <h2 id="album-title">最近的光影</h2>
          </div>
          <p>这里暂时使用样片占位，之后会替换成我真正拍下的日常与旅途。</p>
        </header>

        <div className="album-grid">
          {photos.map((photo) => (
            <figure className="album-card" key={`${photo.date}-${photo.title}`}>
              <Image
                src={photo.src}
                alt={photo.alt}
                width={1600}
                height={1200}
                sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 42vw"
                unoptimized
                loading="lazy"
              />
              <figcaption>
                <span>{photo.title}</span>
                <span className="album-meta">
                  {photo.location} · <time dateTime={photo.date}>{photo.displayDate}</time>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </SiteFrame>
  )
}
