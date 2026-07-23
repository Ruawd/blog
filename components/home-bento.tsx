import Link from "next/link"
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Camera,
  CircleUserRound,
  Clapperboard,
  Eye,
  FolderKanban,
  Layers3,
  Wrench,
} from "lucide-react"

import { ResilientImage } from "@/components/resilient-image"
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid"
import { BlurFade } from "@/components/ui/blur-fade"
import { BorderBeam } from "@/components/ui/border-beam"
import { DotPattern } from "@/components/ui/dot-pattern"
import { MagicCard } from "@/components/ui/magic-card"
import { NumberTicker } from "@/components/ui/number-ticker"
import { cn } from "@/lib/utils"

import styles from "./home-bento.module.css"

type LatestPost = {
  slug: string
  title: string
  description: string
  category: string
  published: string
}

type LatestAlbum = {
  slug: string
  title: string
  description: string
  coverSrc: string
  photoCount: number
}

type HomeBentoProps = {
  postCount: number
  totalViews: number
  albumCount: number
  photoCount: number
  projectCount: number
  latestPost: LatestPost | null
  latestAlbum: LatestAlbum | null
}

const fadeDelay = (index: number) => Math.min(index * 0.045, 0.24)

export function HomeBento({
  postCount,
  totalViews,
  albumCount,
  photoCount,
  projectCount,
  latestPost,
  latestAlbum,
}: HomeBentoProps) {
  return (
    <section className={styles.section} id="home-explore" aria-labelledby="home-bento-title">
      <header className={styles.heading}>
        <div>
          <p>PERSONAL HUB</p>
          <h2 id="home-bento-title">我的数字生活</h2>
        </div>
        <p>从最近在做的事，到写下的文章、留下的照片和持续维护的项目。</p>
      </header>

      <BentoGrid className={styles.grid}>
        <BlurFade className={cn(styles.item, styles.introItem)} delay={fadeDelay(0)} inView>
          <BentoGridItem className={styles.itemInner}>
            <MagicCard className={cn(styles.magicCard, styles.introCard)}>
              <DotPattern className={styles.dotPattern} />
              <Link className={styles.cardLink} href="/about/me">
                <span className={styles.iconBox}><CircleUserRound aria-hidden="true" /></span>
                <div className={styles.cardCopy}>
                  <p className={styles.kicker}>ABOUT / RUAWD</p>
                  <h3>这里不只是一间博客。</h3>
                  <p>文章、影像、番组、项目与自托管服务，都在这里慢慢组成属于自己的页面。</p>
                </div>
                <span className={styles.action}>认识我<ArrowUpRight aria-hidden="true" /></span>
              </Link>
              <BorderBeam size={130} duration={9} colorFrom="var(--background)" colorTo="var(--muted-foreground)" borderWidth={1} />
            </MagicCard>
          </BentoGridItem>
        </BlurFade>

        <BlurFade className={cn(styles.item, styles.nowItem)} delay={fadeDelay(1)} inView>
          <BentoGridItem className={styles.itemInner}>
            <MagicCard className={styles.magicCard}>
              <Link className={styles.cardLink} href="/now">
                <span className={styles.statusLine}><i aria-hidden="true" />NOW / 此刻</span>
                <div className={styles.cardCopy}>
                  <h3>正在完善个人页</h3>
                  <p>整理内容结构、交互体验和自托管服务入口。</p>
                </div>
                <span className={styles.action}>查看近况<ArrowUpRight aria-hidden="true" /></span>
              </Link>
            </MagicCard>
          </BentoGridItem>
        </BlurFade>

        <BlurFade className={cn(styles.item, styles.statsItem)} delay={fadeDelay(2)} inView>
          <BentoGridItem className={cn(styles.itemInner, styles.statsCard)}>
            <header><Activity aria-hidden="true" /><span>站点数据</span></header>
            <dl className={styles.statsGrid}>
              <div><dt>文章</dt><dd><NumberTicker value={postCount} /></dd></div>
              <div><dt>浏览</dt><dd><NumberTicker value={totalViews} /></dd></div>
              <div><dt>相册</dt><dd><NumberTicker value={albumCount} /></dd></div>
              <div><dt>图片</dt><dd><NumberTicker value={photoCount} /></dd></div>
            </dl>
          </BentoGridItem>
        </BlurFade>

        <BlurFade className={cn(styles.item, styles.articleItem)} delay={fadeDelay(3)} inView>
          <BentoGridItem className={styles.itemInner}>
            <MagicCard className={styles.magicCard}>
              <Link className={styles.cardLink} href={latestPost ? `/blog/${latestPost.slug}` : "/blog"}>
                <span className={styles.iconBox}><BookOpen aria-hidden="true" /></span>
                <div className={styles.cardCopy}>
                  <p className={styles.kicker}>{latestPost ? `${latestPost.category} · ${latestPost.published}` : "JOURNAL / BLOG"}</p>
                  <h3>{latestPost?.title || "文章与记录"}</h3>
                  <p>{latestPost?.description || "记录技术实践、VPS 使用体验和数字生活。"}</p>
                </div>
                <span className={styles.action}>阅读最新文章<ArrowUpRight aria-hidden="true" /></span>
              </Link>
            </MagicCard>
          </BentoGridItem>
        </BlurFade>

        <BlurFade className={cn(styles.item, styles.albumItem)} delay={fadeDelay(4)} inView>
          <BentoGridItem className={styles.itemInner}>
            <MagicCard className={cn(styles.magicCard, styles.mediaCard)}>
              <Link className={styles.cardLink} href={latestAlbum ? `/mine/album/${latestAlbum.slug}` : "/mine/album"}>
                {latestAlbum?.coverSrc ? (
                  <span className={styles.albumPreview}>
                    <ResilientImage src={latestAlbum.coverSrc} alt="" loading="lazy" />
                  </span>
                ) : <span className={styles.albumFallback}><Camera aria-hidden="true" /></span>}
                <div className={styles.cardCopy}>
                  <p className={styles.kicker}>ALBUM / {latestAlbum?.photoCount || photoCount} PHOTOS</p>
                  <h3>{latestAlbum?.title || "相册"}</h3>
                  <p>{latestAlbum?.description || "完整保留比例的影像与插画收藏。"}</p>
                </div>
                <span className={styles.action}>打开相册<ArrowUpRight aria-hidden="true" /></span>
              </Link>
            </MagicCard>
          </BentoGridItem>
        </BlurFade>

        <BlurFade className={cn(styles.item, styles.projectItem)} delay={fadeDelay(5)} inView>
          <BentoGridItem className={styles.itemInner}>
            <MagicCard className={styles.magicCard}>
              <Link className={styles.cardLink} href="/projects">
                <span className={styles.iconBox}><FolderKanban aria-hidden="true" /></span>
                <div className={styles.cardCopy}>
                  <p className={styles.kicker}>PROJECTS / {projectCount}</p>
                  <h3>正在维护的项目</h3>
                  <p>个人页、图床、统一认证与其他自托管服务。</p>
                </div>
                <span className={styles.action}>查看项目<ArrowUpRight aria-hidden="true" /></span>
              </Link>
            </MagicCard>
          </BentoGridItem>
        </BlurFade>

        <BlurFade className={cn(styles.item, styles.usesItem)} delay={fadeDelay(6)} inView>
          <BentoGridItem className={styles.itemInner}>
            <MagicCard className={styles.magicCard}>
              <Link className={styles.cardLink} href="/uses">
                <span className={styles.iconBox}><Wrench aria-hidden="true" /></span>
                <div className={styles.cardCopy}>
                  <p className={styles.kicker}>USES / STACK</p>
                  <h3>工具与技术栈</h3>
                  <p>构建这个个人空间时正在使用的技术与服务。</p>
                </div>
                <span className={styles.action}>查看清单<ArrowUpRight aria-hidden="true" /></span>
              </Link>
            </MagicCard>
          </BentoGridItem>
        </BlurFade>

        <BlurFade className={cn(styles.item, styles.bangumiItem)} delay={fadeDelay(7)} inView>
          <BentoGridItem className={styles.itemInner}>
            <MagicCard className={styles.magicCard}>
              <Link className={styles.cardLink} href="/mine/bangumi">
                <span className={styles.iconBox}><Clapperboard aria-hidden="true" /></span>
                <div className={styles.cardCopy}>
                  <p className={styles.kicker}>BANGUMI / LIBRARY</p>
                  <h3>最近在看的内容</h3>
                  <p>动画、书籍、音乐和游戏的收藏与进度。</p>
                </div>
                <span className={styles.action}>打开番组计划<ArrowUpRight aria-hidden="true" /></span>
              </Link>
            </MagicCard>
          </BentoGridItem>
        </BlurFade>

        <BlurFade className={cn(styles.item, styles.overviewItem)} delay={fadeDelay(8)} inView>
          <BentoGridItem className={cn(styles.itemInner, styles.overviewCard)}>
            <div><Layers3 aria-hidden="true" /><span>内容总览</span></div>
            <strong><NumberTicker value={postCount + photoCount + projectCount} /></strong>
            <p>篇文章、张图片与个项目共同组成这个个人空间。</p>
            <Link href="/blog">全部内容<Eye aria-hidden="true" /></Link>
          </BentoGridItem>
        </BlurFade>
      </BentoGrid>
    </section>
  )
}
