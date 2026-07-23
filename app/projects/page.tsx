import type { Metadata } from "next"

import { ManagedPageBody } from "@/components/managed-page-body"
import { ProjectShowcase } from "@/components/project-showcase"
import { SiteFrame } from "@/components/site-frame"
import { getPageContent } from "@/lib/page-content"
import { listPublishedProjects } from "@/lib/project-repository"

export const metadata: Metadata = {
  title: "项目",
  description: "Ruawd 正在维护的个人项目与自托管服务。",
  alternates: { canonical: "/projects" },
}

export const dynamic = "force-dynamic"

export default async function ProjectsPage() {
  const [page, projects] = await Promise.all([
    getPageContent("projects"),
    listPublishedProjects(),
  ])
  return (
    <SiteFrame eyebrow={page.eyebrow} title={page.title} description={page.description}>
      <ManagedPageBody content={page.body} />
      <ProjectShowcase projects={projects} />
    </SiteFrame>
  )
}
