"use client"

import { useMemo, useState } from "react"
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Gamepad2,
  ListFilter,
  Music2,
  Play,
  Star,
} from "lucide-react"

import { ResilientImage } from "@/components/resilient-image"
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list"
import { BorderBeam } from "@/components/ui/border-beam"
import type {
  BangumiCollectionItem,
  BangumiLibrary,
} from "@/lib/bangumi-api"
import type { BangumiCategory } from "@/lib/bangumi-settings"

const categoryIcons = {
  anime: Play,
  book: BookOpen,
  music: Music2,
  game: Gamepad2,
} satisfies Record<BangumiCategory, typeof Play>

const statusOrder = [1, 3, 2, 4, 5] as const
const itemsPerPage = 18

function statusLabel(category: BangumiCategory, status: number): string {
  const contextual = {
    anime: { 1: "想看", 2: "看过", 3: "在看" },
    book: { 1: "想读", 2: "读过", 3: "在读" },
    music: { 1: "想听", 2: "听过", 3: "在听" },
    game: { 1: "想玩", 2: "玩过", 3: "在玩" },
  }[category] as Record<number, string>
  return contextual[status] || ({ 4: "搁置", 5: "抛弃" } as Record<number, string>)[status] || "未分类"
}

function collectionProgress(item: BangumiCollectionItem, category: BangumiCategory) {
  const isBook = category === "book"
  const current = isBook ? item.vol_status : item.ep_status
  const total = isBook ? item.subject.volumes : item.subject.eps
  if (!total) return null
  const resolvedCurrent = item.type === 2 && current === 0 ? total : current
  return {
    current: resolvedCurrent,
    total,
    unit: isBook ? "卷" : "话",
    percent: Math.min(100, Math.max(0, resolvedCurrent / total * 100)),
  }
}

function BangumiCard({
  item,
  category,
  subjectBaseUrl,
}: {
  item: BangumiCollectionItem
  category: BangumiCategory
  subjectBaseUrl: string
}) {
  const title = item.subject.name_cn || item.subject.name
  const originalTitle = item.subject.name_cn ? item.subject.name : ""
  const image = item.subject.images?.common || item.subject.images?.medium || item.subject.images?.large || ""
  const progress = collectionProgress(item, category)
  const tags = (item.tags.length ? item.tags : item.subject.tags.map((tag) => tag.name)).slice(0, 3)
  const year = item.subject.date?.slice(0, 4)

  return (
    <article className="bangumi-entry">
      <a href={`${subjectBaseUrl}${item.subject_id}`} target="_blank" rel="noreferrer nofollow" aria-label={`在 Bangumi 查看 ${title}`}>
        <div className="bangumi-entry-cover">
          <ResilientImage src={image || "/blog-media/image-unavailable.svg"} alt={`${title} 封面`} loading="lazy" decoding="async" />
          <span className={`bangumi-status is-${item.type}`}>{statusLabel(category, item.type)}</span>
          {item.subject.score > 0 ? <span className="bangumi-score"><Star aria-hidden="true" />{item.subject.score.toFixed(1)}</span> : null}
          {item.private ? <span className="bangumi-private">私有</span> : null}
          <ExternalLink className="bangumi-entry-external" aria-hidden="true" />
        </div>
        <div className="bangumi-entry-copy">
          <div>
            <h3>{title}</h3>
            {originalTitle ? <p title={originalTitle}>{originalTitle}</p> : null}
          </div>
          <div className="bangumi-entry-meta">
            {year ? <span><CalendarDays aria-hidden="true" />{year}</span> : <span>日期未定</span>}
            {item.rate > 0 ? <span>我的评分 {item.rate}</span> : null}
          </div>
          {progress ? (
            <div className="bangumi-entry-progress" aria-label={`进度 ${progress.current} / ${progress.total} ${progress.unit}`}>
              <div><span style={{ width: `${progress.percent}%` }} /></div>
              <small>{progress.current} / {progress.total} {progress.unit}</small>
            </div>
          ) : null}
          {item.comment ? <blockquote>{item.comment}</blockquote> : null}
          {tags.length ? <ul className="bangumi-entry-tags">{tags.map((tag) => <li key={tag}>{tag}</li>)}</ul> : null}
        </div>
      </a>
    </article>
  )
}

export function BangumiBoard({ library }: { library: BangumiLibrary }) {
  const [activeCategory, setActiveCategory] = useState<BangumiCategory>(library.sections[0]?.id || "anime")
  const [activeStatus, setActiveStatus] = useState<number | "all">("all")
  const [page, setPage] = useState(1)
  const section = library.sections.find((item) => item.id === activeCategory) || library.sections[0]

  const statusCounts = useMemo(() => {
    const counts = new Map<number, number>()
    for (const item of section?.items || []) counts.set(item.type, (counts.get(item.type) || 0) + 1)
    return counts
  }, [section])

  const filteredItems = useMemo(
    () => (section?.items || []).filter((item) => activeStatus === "all" || item.type === activeStatus),
    [activeStatus, section],
  )
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage))
  const safePage = Math.min(page, pageCount)
  const visibleItems = filteredItems.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage)
  const activeIcon = section ? categoryIcons[section.id] : Play
  const ActiveIcon = activeIcon

  function selectCategory(id: BangumiCategory) {
    setActiveCategory(id)
    setActiveStatus("all")
    setPage(1)
  }

  function selectStatus(status: number | "all") {
    setActiveStatus(status)
    setPage(1)
  }

  return (
    <section className="bangumi-library" aria-labelledby="bangumi-library-title">
      <div className="bangumi-overview magic-surface">
        <BorderBeam size={150} duration={10} colorFrom="#111111" colorTo="#b4b4b4" borderWidth={1} />
        <div>
          <ActiveIcon aria-hidden="true" />
          <span><small>同步自 Bangumi</small><strong id="bangumi-library-title">{library.total} 个收藏条目</strong></span>
        </div>
        <a href={library.profileUrl} target="_blank" rel="noreferrer nofollow">@{library.userId}<ExternalLink aria-hidden="true" /></a>
      </div>

      <nav className="bangumi-category-tabs" aria-label="番组分类">
        {library.sections.map((item) => {
          const Icon = categoryIcons[item.id]
          return (
            <button type="button" className={item.id === section?.id ? "is-active" : ""} aria-pressed={item.id === section?.id} onClick={() => selectCategory(item.id)} key={item.id}>
              <Icon aria-hidden="true" /><span>{item.label}</span><small>{item.count}</small>
            </button>
          )
        })}
      </nav>

      {section ? (
        <>
          <header className="bangumi-section-heading">
            <div><p className="section-kicker">COLLECTION / {section.id.toUpperCase()}</p><h2>{section.label}</h2></div>
            <p>{filteredItems.length} / {section.count} 个条目</p>
          </header>

          <div className="bangumi-status-filters" role="group" aria-label={`${section.label}收藏状态筛选`}>
            <ListFilter aria-hidden="true" />
            <button type="button" className={activeStatus === "all" ? "is-active" : ""} aria-pressed={activeStatus === "all"} onClick={() => selectStatus("all")}>全部 <span>{section.count}</span></button>
            {statusOrder.filter((status) => statusCounts.has(status)).map((status) => (
              <button type="button" className={activeStatus === status ? "is-active" : ""} aria-pressed={activeStatus === status} onClick={() => selectStatus(status)} key={status}>
                {statusLabel(section.id, status)} <span>{statusCounts.get(status)}</span>
              </button>
            ))}
          </div>

          {visibleItems.length ? (
            <AnimatedList className="bangumi-entry-grid" key={`${section.id}-${activeStatus}-${safePage}`}>
              {visibleItems.map((item) => (
                <AnimatedListItem key={item.subject_id}>
                  <BangumiCard item={item} category={section.id} subjectBaseUrl={library.subjectBaseUrl} />
                </AnimatedListItem>
              ))}
            </AnimatedList>
          ) : (
            <div className="bangumi-no-results" role="status"><ListFilter aria-hidden="true" /><h3>这个状态还没有条目</h3><p>换一个收藏状态看看。</p></div>
          )}

          {pageCount > 1 ? (
            <nav className="bangumi-pagination" aria-label="番组列表分页">
              <button type="button" onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage === 1} aria-label="上一页"><ChevronLeft aria-hidden="true" /></button>
              <span><b>{safePage}</b> / {pageCount}</span>
              <button type="button" onClick={() => setPage(Math.min(pageCount, safePage + 1))} disabled={safePage === pageCount} aria-label="下一页"><ChevronRight aria-hidden="true" /></button>
            </nav>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
