import Link from "next/link"
import {
  ArrowUpRight,
  BookOpen,
  Camera,
  CircleDot,
  FolderKanban,
  Radio,
  Sparkles,
} from "lucide-react"

import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list"
import { BlurFade } from "@/components/ui/blur-fade"
import { BorderBeam } from "@/components/ui/border-beam"
import { MagicCard } from "@/components/ui/magic-card"
import { NumberTicker } from "@/components/ui/number-ticker"

import styles from "./personal-hub.module.css"

type NowPost = {
  slug: string
  title: string
  category: string
  published: string
}

type NowAlbum = {
  slug: string
  title: string
  photoCount: number
  updatedAt: string
}

type NowDashboardProps = {
  posts: NowPost[]
  latestAlbum: NowAlbum | null
  postCount: number
  albumCount: number
  photoCount: number
}

export function NowDashboard({
  posts,
  latestAlbum,
  postCount,
  albumCount,
  photoCount,
}: NowDashboardProps) {
  const activities = [
    ...posts.slice(0, 4).map((post) => ({
      key: `post:${post.slug}`,
      href: `/blog/${post.slug}`,
      label: post.category,
      title: post.title,
      meta: post.published,
      icon: BookOpen,
    })),
    ...(latestAlbum ? [{
      key: `album:${latestAlbum.slug}`,
      href: `/mine/album/${latestAlbum.slug}`,
      label: "相册",
      title: `${latestAlbum.title} · ${latestAlbum.photoCount} 张图片`,
      meta: latestAlbum.updatedAt.slice(0, 10),
      icon: Camera,
    }] : []),
  ]

  return (
    <div className={styles.stack}>
      <section className={styles.nowGrid} aria-label="最近状态">
        <BlurFade className={styles.nowLead} inView>
          <MagicCard className={`${styles.surface} ${styles.leadSurface}`}>
            <article className={styles.leadCard}>
              <p className={styles.liveLabel}><i aria-hidden="true" />CURRENT FOCUS</p>
              <div>
                <h2>让个人页真正成为个人空间。</h2>
                <p>当前重点是整理首页信息层级、补全项目与工具页面，同时保持手机端流畅和内容优先。</p>
              </div>
              <div className={styles.chipRow} aria-label="当前关注主题">
                <span>个人主页</span>
                <span>自托管</span>
                <span>Magic UI</span>
              </div>
              <BorderBeam size={120} duration={10} colorFrom="var(--background)" colorTo="var(--muted-foreground)" borderWidth={1} />
            </article>
          </MagicCard>
        </BlurFade>

        <BlurFade className={styles.nowSide} delay={0.06} inView>
          <MagicCard className={styles.surface}>
            <Link className={styles.shortCard} href="/projects">
              <FolderKanban aria-hidden="true" />
              <div><span>正在建设</span><h3>项目展示与后台管理</h3></div>
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </MagicCard>
        </BlurFade>

        <BlurFade className={styles.nowSide} delay={0.1} inView>
          <article className={`${styles.surface} ${styles.metricCard}`}>
            <header><Radio aria-hidden="true" /><span>内容存量</span></header>
            <dl>
              <div><dt>文章</dt><dd><NumberTicker value={postCount} /></dd></div>
              <div><dt>相册</dt><dd><NumberTicker value={albumCount} /></dd></div>
              <div><dt>图片</dt><dd><NumberTicker value={photoCount} /></dd></div>
            </dl>
          </article>
        </BlurFade>
      </section>

      <section className={styles.activitySection} aria-labelledby="recent-activity-title">
        <header className={styles.sectionHeading}>
          <div><p>RECENT ACTIVITY</p><h2 id="recent-activity-title">最近留下的内容</h2></div>
          <p>这里自动汇总最近发布的文章和更新过的相册，不额外请求第三方接口。</p>
        </header>

        {activities.length ? (
          <AnimatedList className={styles.activityList}>
            {activities.map((activity) => {
              const Icon = activity.icon
              return (
                <AnimatedListItem className={styles.activityItem} key={activity.key}>
                  <Link href={activity.href}>
                    <span className={styles.activityIcon}><Icon aria-hidden="true" /></span>
                    <span className={styles.activityCopy}>
                      <small>{activity.label}</small>
                      <strong>{activity.title}</strong>
                    </span>
                    <time>{activity.meta}</time>
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                </AnimatedListItem>
              )
            })}
          </AnimatedList>
        ) : (
          <div className={styles.emptyState}>
            <CircleDot aria-hidden="true" />
            <h3>最近还没有公开更新</h3>
            <p>发布文章或添加相册后，动态会自动出现在这里。</p>
          </div>
        )}
      </section>

      <BlurFade inView>
        <aside className={styles.nextCard}>
          <Sparkles aria-hidden="true" />
          <div><p>NEXT STEP</p><h2>下一步会继续补全年度报告、订阅中心和离线阅读。</h2></div>
          <Link href="/uses">看看当前技术栈<ArrowUpRight aria-hidden="true" /></Link>
        </aside>
      </BlurFade>
    </div>
  )
}
