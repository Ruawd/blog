import type { DatabaseSync } from "node:sqlite"
import { unstable_cache } from "next/cache"

import { getDatabase } from "@/db"
import { publicCacheTags } from "@/lib/public-cache"

export const pageContentDefaults = {
  home: { path: "/", label: "主页", eyebrow: "PERSONAL / HOME", title: "Ruawd", description: "文章、相册、番组与数字生活，慢慢整理成自己的页面。", body: "" },
  blog: { path: "/blog", label: "博客", eyebrow: "JOURNAL / BLOG", title: "博客", description: "技术实践、VPS 测评与数字生活记录。", body: "" },
  message: { path: "/message", label: "留言", eyebrow: "GUESTBOOK / MESSAGE", title: "留言", description: "在这里留下你的足迹，也欢迎分享想法和建议。", body: "" },
  friends: { path: "/friends", label: "友链", eyebrow: "NEIGHBORS / FRIENDS", title: "友链", description: "在互联网上遇见的朋友与值得常去的网站。", body: "" },
  links: { path: "/links", label: "链接", eyebrow: "LINKS / 个人链接", title: "在别处找到我", description: "我的个人主页、联系方式与常用站外入口。", body: "" },
  album: { path: "/mine/album", label: "相册", eyebrow: "MY / ALBUMS", title: "相册", description: "按主题整理影像、插画与值得留下的视觉片段。", body: "" },
  bangumi: { path: "/mine/bangumi", label: "番组计划", eyebrow: "MY / BANGUMI", title: "番组计划", description: "想看、在看与看过的动画、书籍、音乐和游戏记录。", body: "" },
  now: { path: "/now", label: "此刻", eyebrow: "NOW / 此刻", title: "最近在做什么", description: "记录当前关注的事情、最近留下的内容，以及接下来准备继续完善的部分。", body: "" },
  projects: { path: "/projects", label: "项目", eyebrow: "WORK / PROJECTS", title: "正在维护的项目", description: "个人页面、自托管服务与持续打磨中的数字作品。", body: "" },
  uses: { path: "/uses", label: "使用清单", eyebrow: "USES / STACK", title: "工具、服务与技术栈", description: "这个个人空间正在使用的技术、服务与工作方式。", body: "" },
  support: { path: "/about/support", label: "打赏", eyebrow: "SUPPORT / 自愿支持", title: "支持这个小站", description: "你的赞助将用于服务器维护、内容创作和功能开发。", body: "" },
  about: { path: "/about/me", label: "关于我", eyebrow: "ABOUT / 关于我", title: "你好，我是 Ruawd", description: "Hello, I'm Ruawd. 欢迎来到我的个人主页。", body: "" },
} as const

export type PageContentKey = keyof typeof pageContentDefaults
export type PageContent = {
  key: PageContentKey
  path: string
  label: string
  eyebrow: string
  title: string
  description: string
  body: string
  updatedAt: string | null
}

type PageRow = Omit<PageContent, "path" | "label"> & { updatedAt: string }
let schemaReady = false

function ensurePageSchema(): DatabaseSync {
  const db = getDatabase()
  if (!schemaReady) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS page_contents (
        key TEXT PRIMARY KEY,
        eyebrow TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL DEFAULT '',
        updated_by TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
    schemaReady = true
  }
  return db
}

function isPageKey(value: string): value is PageContentKey {
  return Object.prototype.hasOwnProperty.call(pageContentDefaults, value)
}

export function normalizePageContent(value: unknown): Pick<PageContent, "key" | "eyebrow" | "title" | "description" | "body"> {
  if (!value || typeof value !== "object") throw new Error("页面内容格式不正确")
  const input = value as Record<string, unknown>
  const key = typeof input.key === "string" ? input.key : ""
  const field = (name: string) => typeof input[name] === "string" ? input[name].trim() : ""
  if (!isPageKey(key)) throw new Error("没有找到这个页面")
  const title = field("title")
  if (!title) throw new Error("页面标题不能为空")
  if (title.length > 120) throw new Error("页面标题不能超过 120 个字符")
  if (field("eyebrow").length > 80) throw new Error("页面抬头不能超过 80 个字符")
  if (field("description").length > 500) throw new Error("页面说明不能超过 500 个字符")
  const body = typeof input.body === "string" ? input.body : ""
  if (body.length > 200_000) throw new Error("页面正文不能超过 20 万个字符")
  return { key, eyebrow: field("eyebrow"), title, description: field("description"), body }
}

async function readPageContent(key: PageContentKey): Promise<PageContent> {
  const fallback = pageContentDefaults[key]
  const row = ensurePageSchema().prepare(`
    SELECT key, eyebrow, title, description, body, updated_at AS updatedAt
    FROM page_contents WHERE key = ? LIMIT 1
  `).get(key) as unknown as PageRow | undefined
  return row
    ? { ...row, path: fallback.path, label: fallback.label }
    : { key, ...fallback, updatedAt: null }
}

const getCachedPageContent = unstable_cache(
  readPageContent,
  ["managed-page-content-v2"],
  { revalidate: 300, tags: [publicCacheTags.pages] },
)

export async function getPageContent(key: PageContentKey): Promise<PageContent> {
  return getCachedPageContent(key)
}

export async function listPageContents(): Promise<PageContent[]> {
  return Promise.all((Object.keys(pageContentDefaults) as PageContentKey[]).map(getPageContent))
}

export async function savePageContent(value: unknown, username: string): Promise<PageContent> {
  const input = normalizePageContent(value)
  const now = new Date().toISOString()
  ensurePageSchema().prepare(`
    INSERT INTO page_contents (key, eyebrow, title, description, body, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      eyebrow = excluded.eyebrow,
      title = excluded.title,
      description = excluded.description,
      body = excluded.body,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at
  `).run(input.key, input.eyebrow, input.title, input.description, input.body, username, now)
  return readPageContent(input.key)
}
