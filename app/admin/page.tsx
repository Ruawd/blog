import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { AdminEditor } from "@/components/admin-editor"
import { AdminLogoutButton } from "@/components/admin-logout-button"
import { requireAdminSession } from "@/lib/admin-session"
import { siteConfig } from "@/lib/site"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "文章管理",
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
  const user = await requireAdminSession("/admin")

  return (
    <div className="admin-page">
      <a className="skip-link" href="#admin-main">跳到文章编辑区</a>
      <header className="admin-header">
        <Link className="admin-brand" href="/" aria-label="返回网站主页">
          <Image src={siteConfig.avatar} alt="" width={34} height={34} unoptimized />
          <span>{siteConfig.name}</span>
          <small>内容管理</small>
        </Link>
        <nav aria-label="管理页快捷操作">
          <Link href="/blog" target="_blank">
            查看博客 <ArrowUpRight aria-hidden="true" />
          </Link>
          <AdminLogoutButton />
        </nav>
      </header>

      <main className="admin-main" id="admin-main">
        <header className="admin-intro">
          <div>
            <p className="section-kicker">EDITORIAL / CONSOLE</p>
            <h1>文章管理</h1>
          </div>
          <p>
            写作、编辑与实时预览都在这里完成。草稿不会出现在博客中，发布后前台立即可见。
          </p>
        </header>
        <AdminEditor displayName={user.username} />
      </main>
    </div>
  )
}
