import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"

import { AdminLoginForm } from "@/components/admin-login-form"
import { getAdminSession, isAdminConfigured } from "@/lib/admin-session"
import { siteConfig } from "@/lib/site"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "登录管理后台",
  robots: { index: false, follow: false },
}

function safeReturnTo(value: string | undefined): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/admin"
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string; error?: string }>
}) {
  const params = await searchParams
  const returnTo = safeReturnTo(params.return_to)
  if (await getAdminSession()) redirect(returnTo)

  return (
    <main className="admin-login-page">
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <Link className="admin-login-brand" href="/" aria-label="返回网站主页">
          <Image src={siteConfig.avatar} alt="" width={42} height={42} />
          <span>{siteConfig.name}</span>
        </Link>
        <header>
          <p className="section-kicker">ADMIN / SIGN IN</p>
          <h1 id="admin-login-title">登录后台</h1>
          <p>文章的新建、编辑、预览与发布通过 Casdoor 统一认证。</p>
        </header>
        <AdminLoginForm
          configured={isAdminConfigured()}
          returnTo={returnTo}
          error={params.error}
        />
      </section>
    </main>
  )
}
