import { createHash } from "node:crypto"
import type { DatabaseSync } from "node:sqlite"
import { unstable_cache } from "next/cache"

import { getDatabase } from "@/db"
import { publicCacheTags } from "@/lib/public-cache"
import { normalizePublicHttpsUrl } from "@/lib/safe-remote-resource"

export type ProjectStatus = "draft" | "published" | "archived"

export type Project = {
  id: number
  slug: string
  title: string
  description: string
  url: string
  repoUrl: string
  imageUrl: string
  tags: string[]
  status: ProjectStatus
  featured: boolean
  sortOrder: number
  updatedAt: string
}

export type ProjectInput = Pick<
  Project,
  "slug" | "title" | "description" | "url" | "repoUrl" | "imageUrl" | "tags" | "status" | "featured"
> & { id?: number }

export class ProjectRevisionConflictError extends Error {
  constructor() {
    super("项目列表已在其他页面更新，请刷新后再保存")
    this.name = "ProjectRevisionConflictError"
  }
}

type ProjectRow = Omit<Project, "tags" | "featured"> & {
  tagsJson: string
  featured: number
}

type ProjectMetaRow = {
  id: number
  createdAt: string
}

const projectStatuses = new Set<ProjectStatus>(["draft", "published", "archived"])

const defaultProjects: ProjectInput[] = [
  {
    slug: "personal-page",
    title: "Ruawd 个人页",
    description: "集中展示文章、相册、番组与数字生活的个人主页。",
    url: "https://blog.ruawd.de/",
    repoUrl: "https://github.com/Ruawd/blog",
    imageUrl: "",
    tags: ["Next.js", "SQLite", "Magic UI"],
    status: "published",
    featured: true,
  },
  {
    slug: "sls-image-hosting",
    title: "SLS 图床",
    description: "用于图片上传、管理与稳定外链的个人图床服务。",
    url: "https://sls.ruawd.de/",
    repoUrl: "",
    imageUrl: "",
    tags: ["Image Hosting", "Storage"],
    status: "published",
    featured: false,
  },
  {
    slug: "meow-auth",
    title: "Meow Auth",
    description: "基于 Casdoor 的统一认证与单点登录入口。",
    url: "https://casdoor.ruawd.de/",
    repoUrl: "",
    imageUrl: "",
    tags: ["Casdoor", "SSO", "OIDC"],
    status: "published",
    featured: false,
  },
]

let schemaReady = false

function tableExists(db: DatabaseSync, name: string): boolean {
  return Boolean(db.prepare(`
    SELECT 1 FROM sqlite_master
    WHERE type = 'table' AND name = ?
    LIMIT 1
  `).get(name))
}

function seedDefaultProjects(db: DatabaseSync): void {
  const insert = db.prepare(`
    INSERT INTO projects (
      slug, title, description, url, repo_url, image_url, tags_json,
      status, featured, sort_order, updated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'bootstrap', ?, ?)
  `)
  const now = new Date().toISOString()
  defaultProjects.forEach((project, index) => {
    insert.run(
      project.slug,
      project.title,
      project.description,
      project.url,
      project.repoUrl,
      project.imageUrl,
      JSON.stringify(project.tags),
      project.status,
      project.featured ? 1 : 0,
      index,
      now,
      now,
    )
  })
}

function ensureProjectSchema(): DatabaseSync {
  const db = getDatabase()
  if (schemaReady) return db

  const existed = tableExists(db, "projects")
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL,
      repo_url TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      tags_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
      sort_order INTEGER NOT NULL,
      updated_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS projects_slug_unique ON projects (slug);
    CREATE UNIQUE INDEX IF NOT EXISTS projects_sort_order_unique ON projects (sort_order);
    CREATE INDEX IF NOT EXISTS projects_status_order_idx ON projects (status, sort_order);
  `)

  if (!existed) {
    db.exec("BEGIN IMMEDIATE")
    try {
      seedDefaultProjects(db)
      db.exec("COMMIT")
    } catch (error) {
      db.exec("ROLLBACK")
      throw error
    }
  }

  schemaReady = true
  return db
}

function normalizeText(value: unknown, label: string, maxLength: number, required = false): string {
  const text = typeof value === "string" ? value.trim() : ""
  if (required && !text) throw new Error(`${label}不能为空`)
  if (text.length > maxLength) throw new Error(`${label}不能超过 ${maxLength} 个字符`)
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) {
    throw new Error(`${label}包含无效字符`)
  }
  return text
}

function normalizeProjectId(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null) return undefined
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id < 1) throw new Error(`${label}编号不正确`)
  return id
}

function normalizeStatus(value: unknown, label: string): ProjectStatus {
  if (typeof value !== "string" || !projectStatuses.has(value as ProjectStatus)) {
    throw new Error(`${label}公开状态不正确`)
  }
  return value as ProjectStatus
}

function normalizeImageUrl(value: unknown, label: string): string {
  const source = typeof value === "string" ? value.trim() : ""
  if (!source) return ""
  if (source.startsWith("/")) {
    if (
      source.length > 2_048
      || source.startsWith("//")
      || /[\u0000-\u001f\\]/.test(source)
      || /(^|\/)\.\.?($|[/?#])/.test(source)
    ) {
      throw new Error(`${label}站内路径格式不正确`)
    }
    return source
  }
  return normalizePublicHttpsUrl(source, label)
}

function normalizeTags(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${label}标签格式不正确`)
  if (value.length > 10) throw new Error(`${label}最多填写 10 个标签`)

  const tags = value.map((item, index) => normalizeText(item, `${label}第 ${index + 1} 个标签`, 30, true))
  const seen = new Set<string>()
  for (const tag of tags) {
    const key = tag.toLocaleLowerCase("zh-CN")
    if (seen.has(key)) throw new Error(`${label}存在重复标签“${tag}”`)
    seen.add(key)
  }
  return tags
}

export function normalizeProjects(value: unknown): ProjectInput[] {
  if (!Array.isArray(value)) throw new Error("项目数据格式不正确")
  if (value.length > 60) throw new Error("最多保存 60 个项目")

  const projects = value.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`第 ${index + 1} 个项目格式不正确`)
    const input = item as Record<string, unknown>
    const label = `第 ${index + 1} 个项目`
    const slug = normalizeText(input.slug, `${label}链接标识`, 80, true).toLowerCase()
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error(`${label}链接标识只能使用小写字母、数字和连字符`)
    }
    if (typeof input.featured !== "boolean") throw new Error(`${label}精选状态不正确`)

    return {
      id: normalizeProjectId(input.id, label),
      slug,
      title: normalizeText(input.title, `${label}标题`, 100, true),
      description: normalizeText(input.description, `${label}说明`, 600, true),
      url: normalizePublicHttpsUrl(input.url, `${label}访问地址`),
      repoUrl: normalizePublicHttpsUrl(input.repoUrl, `${label}仓库地址`, true),
      imageUrl: normalizeImageUrl(input.imageUrl, `${label}封面地址`),
      tags: normalizeTags(input.tags, label),
      status: normalizeStatus(input.status, label),
      featured: input.featured,
    }
  })

  const ids = new Set<number>()
  const slugs = new Set<string>()
  const urls = new Set<string>()
  for (const project of projects) {
    if (project.id !== undefined) {
      if (ids.has(project.id)) throw new Error(`项目编号 ${project.id} 重复`)
      ids.add(project.id)
    }
    if (slugs.has(project.slug)) throw new Error(`项目链接标识 ${project.slug} 重复`)
    slugs.add(project.slug)
    if (urls.has(project.url)) throw new Error(`项目访问地址 ${project.url} 重复`)
    urls.add(project.url)
  }

  return projects
}

function parseTags(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : []
  } catch {
    return []
  }
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    url: row.url,
    repoUrl: row.repoUrl,
    imageUrl: row.imageUrl,
    tags: parseTags(row.tagsJson),
    status: row.status,
    featured: row.featured === 1,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt,
  }
}

function projectRevision(projects: Project[]): string {
  return createHash("sha256").update(JSON.stringify(projects.map((project) => ({
    id: project.id,
    slug: project.slug,
    title: project.title,
    description: project.description,
    url: project.url,
    repoUrl: project.repoUrl,
    imageUrl: project.imageUrl,
    tags: project.tags,
    status: project.status,
    featured: project.featured,
    sortOrder: project.sortOrder,
    updatedAt: project.updatedAt,
  })))).digest("hex")
}

function readProjects(publishedOnly = false): Project[] {
  const db = ensureProjectSchema()
  const rows = db.prepare(`
    SELECT
      id,
      slug,
      title,
      description,
      url,
      repo_url AS repoUrl,
      image_url AS imageUrl,
      tags_json AS tagsJson,
      status,
      featured,
      sort_order AS sortOrder,
      updated_at AS updatedAt
    FROM projects
    ${publishedOnly ? "WHERE status = 'published'" : ""}
    ORDER BY ${publishedOnly ? "featured DESC," : ""} sort_order ASC, id ASC
  `).all() as unknown as ProjectRow[]
  return rows.map(toProject)
}

export function listProjects(): Project[] {
  return readProjects()
}

export function getProjectsRevision(projects?: Project[]): string {
  return projectRevision(projects ?? listProjects())
}

const listPublishedProjectsCached = unstable_cache(
  async () => readProjects(true),
  ["public-projects-v1"],
  { revalidate: 300, tags: [publicCacheTags.projects] },
)

export async function listPublishedProjects(): Promise<Project[]> {
  return listPublishedProjectsCached()
}

export function saveProjects(value: unknown, usernameValue: string, expectedRevisionValue: unknown): Project[] {
  const projects = normalizeProjects(value)
  const username = normalizeText(usernameValue, "管理员账号", 120, true)
  const expectedRevision = normalizeText(expectedRevisionValue, "项目版本", 64, true).toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(expectedRevision)) throw new Error("项目版本格式不正确")
  const db = ensureProjectSchema()
  const insert = db.prepare(`
    INSERT INTO projects (
      id, slug, title, description, url, repo_url, image_url, tags_json,
      status, featured, sort_order, updated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const now = new Date().toISOString()

  db.exec("BEGIN IMMEDIATE")
  try {
    if (projectRevision(readProjects()) !== expectedRevision) throw new ProjectRevisionConflictError()
    const existingRows = db.prepare(`
      SELECT id, created_at AS createdAt FROM projects
    `).all() as unknown as ProjectMetaRow[]
    const existing = new Map(existingRows.map((row) => [row.id, row.createdAt]))
    for (const project of projects) {
      if (project.id !== undefined && !existing.has(project.id)) {
        throw new Error(`项目编号 ${project.id} 已不存在，请刷新列表后重试`)
      }
    }
    db.prepare("DELETE FROM projects").run()
    projects.forEach((project, index) => {
      insert.run(
        project.id ?? null,
        project.slug,
        project.title,
        project.description,
        project.url,
        project.repoUrl,
        project.imageUrl,
        JSON.stringify(project.tags),
        project.status,
        project.featured ? 1 : 0,
        index,
        username,
        project.id ? existing.get(project.id) || now : now,
        now,
      )
    })
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }

  return listProjects()
}
