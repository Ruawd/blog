import Link from "next/link"
import { ArrowUpRight, FolderKanban, GitBranch, Globe2 } from "lucide-react"

import { ResilientImage } from "@/components/resilient-image"
import { BlurFade } from "@/components/ui/blur-fade"
import { BorderBeam } from "@/components/ui/border-beam"
import { MagicCard } from "@/components/ui/magic-card"
import type { Project } from "@/lib/project-repository"

import styles from "./project-showcase.module.css"

export function ProjectShowcase({ projects }: { projects: Project[] }) {
  if (!projects.length) {
    return (
      <section className={styles.emptyState}>
        <FolderKanban aria-hidden="true" />
        <h2>项目正在整理中</h2>
        <p>公开项目会在后台发布后出现在这里。</p>
      </section>
    )
  }

  return (
    <section className={styles.section} aria-labelledby="project-list-title">
      <header className={styles.heading}>
        <div><p>SELECTED WORK</p><h2 id="project-list-title">项目与服务</h2></div>
        <p>这些条目由后台统一管理，可调整公开状态、精选标记和展示顺序。</p>
      </header>

      <div className={styles.grid}>
        {projects.map((project, index) => (
          <BlurFade
            className={project.featured ? styles.featuredItem : styles.item}
            delay={Math.min(index * 0.05, 0.25)}
            inView
            key={project.id}
          >
            <MagicCard className={`${styles.card} ${project.featured ? styles.featuredCard : ""}`}>
              <article>
                <div className={styles.cardTopline}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span>{project.featured ? "FEATURED" : "PROJECT"}</span>
                </div>

                {project.imageUrl ? (
                  <div className={styles.cover}>
                    <ResilientImage src={project.imageUrl} alt={`${project.title} 项目封面`} loading="lazy" />
                  </div>
                ) : (
                  <div className={styles.coverFallback} aria-hidden="true">
                    <FolderKanban />
                    <span>{project.title.slice(0, 1).toUpperCase()}</span>
                  </div>
                )}

                <div className={styles.copy}>
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                </div>

                <ul className={styles.tags} aria-label={`${project.title} 技术标签`}>
                  {project.tags.map((tag) => <li key={tag}>{tag}</li>)}
                </ul>

                <div className={styles.actions}>
                  <Link href={project.url} target="_blank" rel="noreferrer">
                    <Globe2 aria-hidden="true" />访问项目<ArrowUpRight aria-hidden="true" />
                  </Link>
                  {project.repoUrl ? (
                    <Link href={project.repoUrl} target="_blank" rel="noreferrer">
                      <GitBranch aria-hidden="true" />查看源码
                    </Link>
                  ) : null}
                </div>

                {project.featured ? (
                  <BorderBeam size={120} duration={10} colorFrom="var(--foreground)" colorTo="var(--muted-foreground)" borderWidth={1} />
                ) : null}
              </article>
            </MagicCard>
          </BlurFade>
        ))}
      </div>
    </section>
  )
}
