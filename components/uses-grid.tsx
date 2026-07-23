import Link from "next/link"
import {
  ArrowUpRight,
  Boxes,
  Code2,
  Database,
  GitBranch,
  ImageIcon,
  KeyRound,
  Layers3,
  Palette,
  Server,
} from "lucide-react"

import { BlurFade } from "@/components/ui/blur-fade"
import { MagicCard } from "@/components/ui/magic-card"

import styles from "./personal-hub.module.css"

const groups = [
  {
    title: "网站前端",
    description: "用于构建内容、交互与响应式体验。",
    icon: Code2,
    items: ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS 4"],
  },
  {
    title: "界面与动效",
    description: "在不影响阅读和手机滚动的前提下增加层次。",
    icon: Palette,
    items: ["Magic UI", "Motion", "Lucide Icons", "Reduced Motion"],
  },
  {
    title: "数据与内容",
    description: "文章、相册、评论和后台内容都保留在自己的服务里。",
    icon: Database,
    items: ["SQLite", "Drizzle ORM", "Markdown / MDX", "RSS"],
  },
  {
    title: "部署与运行",
    description: "保持部署过程可复制，同时减少额外服务依赖。",
    icon: Server,
    items: ["Docker", "Node.js", "Standalone Build", "Reverse Proxy"],
  },
] as const

const services = [
  { name: "GitHub", detail: "源码与版本管理", href: "https://github.com/Ruawd", icon: GitBranch },
  { name: "SLS 图床", detail: "图片存储与管理", href: "https://sls.ruawd.de", icon: ImageIcon },
  { name: "Meow Auth", detail: "统一认证入口", href: "https://casdoor.ruawd.de", icon: KeyRound },
  { name: "Docker", detail: "应用容器化运行", href: "/projects", icon: Boxes },
] as const

export function UsesGrid() {
  return (
    <div className={styles.stack}>
      <section className={styles.usesSection} aria-labelledby="uses-stack-title">
        <header className={styles.sectionHeading}>
          <div><p>CURRENT STACK</p><h2 id="uses-stack-title">这个页面如何运转</h2></div>
          <p>这里只列当前实际使用的技术与服务；设备和工作流可以继续通过后台正文补充。</p>
        </header>

        <div className={styles.usesGrid}>
          {groups.map((group, index) => {
            const Icon = group.icon
            return (
              <BlurFade delay={index * 0.05} inView key={group.title}>
                <MagicCard className={`${styles.surface} ${styles.useCard}`}>
                  <article>
                    <span className={styles.useIcon}><Icon aria-hidden="true" /></span>
                    <div><h3>{group.title}</h3><p>{group.description}</p></div>
                    <ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul>
                  </article>
                </MagicCard>
              </BlurFade>
            )
          })}
        </div>
      </section>

      <section className={styles.serviceSection} aria-labelledby="uses-services-title">
        <header className={styles.sectionHeading}>
          <div><p>SERVICES</p><h2 id="uses-services-title">个人服务入口</h2></div>
          <p>公开入口只展示服务用途，不暴露后台地址、密钥或运行细节。</p>
        </header>

        <div className={styles.serviceList}>
          {services.map((service) => {
            const Icon = service.icon
            const external = service.href.startsWith("http")
            return (
              <Link
                href={service.href}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer" : undefined}
                key={service.name}
              >
                <span><Icon aria-hidden="true" /></span>
                <strong>{service.name}</strong>
                <small>{service.detail}</small>
                <ArrowUpRight aria-hidden="true" />
              </Link>
            )
          })}
        </div>
      </section>

      <aside className={styles.usesNote}>
        <Layers3 aria-hidden="true" />
        <p>清单会随实际使用情况调整，不做品牌堆砌，也不会放入私密设备信息。</p>
      </aside>
    </div>
  )
}
