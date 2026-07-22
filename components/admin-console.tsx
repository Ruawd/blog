"use client"

import { useState } from "react"
import { Clapperboard, FilePenLine, LayoutTemplate, MessagesSquare } from "lucide-react"

import { AdminBangumiSettings } from "@/components/admin-bangumi-settings"
import { AdminCommentManager } from "@/components/admin-comment-manager"
import { AdminEditor } from "@/components/admin-editor"
import { AdminPageEditor } from "@/components/admin-page-editor"

type Section = "articles" | "pages" | "bangumi" | "comments"

const sections = [
  { key: "articles" as const, label: "文章", description: "写作与发布", icon: FilePenLine },
  { key: "pages" as const, label: "页面内容", description: "编辑站内页面", icon: LayoutTemplate },
  { key: "bangumi" as const, label: "番组 API", description: "同步 Bangumi", icon: Clapperboard },
  { key: "comments" as const, label: "留言与评论", description: "审核互动内容", icon: MessagesSquare },
]

export function AdminConsole({ displayName }: { displayName: string }) {
  const [section, setSection] = useState<Section>("articles")
  return (
    <>
      <nav className="admin-section-tabs" aria-label="后台功能">
        {sections.map((item) => {
          const Icon = item.icon
          return (
            <button
              type="button"
              className={section === item.key ? "is-active" : ""}
              aria-current={section === item.key ? "page" : undefined}
              onClick={() => setSection(item.key)}
              key={item.key}
            >
              <Icon aria-hidden="true" />
              <span><strong>{item.label}</strong><small>{item.description}</small></span>
            </button>
          )
        })}
      </nav>
      <div className="admin-section-stage" key={section}>
        {section === "articles" ? <AdminEditor displayName={displayName} /> : null}
        {section === "pages" ? <AdminPageEditor /> : null}
        {section === "bangumi" ? <AdminBangumiSettings /> : null}
        {section === "comments" ? <AdminCommentManager /> : null}
      </div>
    </>
  )
}
