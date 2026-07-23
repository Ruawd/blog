"use client"

import { useState } from "react"
import { Clapperboard, DatabaseBackup, FilePenLine, Images, LayoutTemplate, Link2, MessagesSquare, PanelsTopLeft } from "lucide-react"

import { AdminAlbumEditor } from "@/components/admin-album-editor"
import { AdminBangumiSettings } from "@/components/admin-bangumi-settings"
import { AdminBackupManager } from "@/components/admin-backup-manager"
import { AdminCommentManager } from "@/components/admin-comment-manager"
import { AdminEditor } from "@/components/admin-editor"
import { AdminFriendEditor } from "@/components/admin-friend-editor"
import { AdminPageEditor } from "@/components/admin-page-editor"
import { AdminProjectEditor } from "@/components/admin-project-editor"

type Section = "articles" | "pages" | "projects" | "album" | "friends" | "bangumi" | "comments" | "backups"

const sections = [
  { key: "articles" as const, label: "文章", description: "写作与发布", icon: FilePenLine },
  { key: "pages" as const, label: "页面内容", description: "编辑站内页面", icon: LayoutTemplate },
  { key: "projects" as const, label: "项目", description: "作品与服务", icon: PanelsTopLeft },
  { key: "album" as const, label: "相册", description: "图片与顺序", icon: Images },
  { key: "friends" as const, label: "友链", description: "编辑与审核", icon: Link2 },
  { key: "bangumi" as const, label: "番组 API", description: "同步 Bangumi", icon: Clapperboard },
  { key: "comments" as const, label: "留言与评论", description: "审核互动内容", icon: MessagesSquare },
  { key: "backups" as const, label: "备份", description: "数据安全", icon: DatabaseBackup },
]

export function AdminConsole({ displayName }: { displayName: string }) {
  const [section, setSection] = useState<Section>("articles")
  const [projectDirty, setProjectDirty] = useState(false)

  function selectSection(nextSection: Section) {
    if (nextSection === section) return
    if (section === "projects" && projectDirty && !window.confirm("项目还有未保存的修改，确定离开并放弃吗？")) return
    if (section === "projects") setProjectDirty(false)
    setSection(nextSection)
  }

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
              onClick={() => selectSection(item.key)}
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
        {section === "projects" ? <AdminProjectEditor onDirtyChange={setProjectDirty} /> : null}
        {section === "album" ? <AdminAlbumEditor /> : null}
        {section === "friends" ? <AdminFriendEditor /> : null}
        {section === "bangumi" ? <AdminBangumiSettings /> : null}
        {section === "comments" ? <AdminCommentManager /> : null}
        {section === "backups" ? <AdminBackupManager /> : null}
      </div>
    </>
  )
}
