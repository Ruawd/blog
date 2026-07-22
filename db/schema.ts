import { sql } from "drizzle-orm"
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

export const posts = sqliteTable(
  "posts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    content: text("content").notNull().default(""),
    category: text("category").notNull().default("随笔"),
    tagsJson: text("tags_json").notNull().default("[]"),
    image: text("image"),
    sourceLink: text("source_link"),
    status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
    publishedAt: text("published_at").notNull(),
    readingMinutes: integer("reading_minutes").notNull().default(1),
    authorEmail: text("author_email").notNull(),
    updatedBy: text("updated_by").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("posts_slug_unique").on(table.slug),
    index("posts_status_published_idx").on(table.status, table.publishedAt),
  ],
)

export const pageContents = sqliteTable("page_contents", {
  key: text("key").primaryKey(),
  eyebrow: text("eyebrow").notNull().default(""),
  title: text("title").notNull().default(""),
  description: text("description").notNull().default(""),
  body: text("body").notNull().default(""),
  updatedBy: text("updated_by").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const bangumiSettings = sqliteTable("bangumi_settings", {
  id: integer("id").primaryKey(),
  userId: text("user_id").notNull(),
  apiBaseUrl: text("api_base_url").notNull(),
  subjectBaseUrl: text("subject_base_url").notNull(),
  userAgent: text("user_agent").notNull(),
  enabledCategoriesJson: text("enabled_categories_json").notNull().default('["anime","book","music","game"]'),
  cacheTtlSeconds: integer("cache_ttl_seconds").notNull().default(900),
  includePrivate: integer("include_private").notNull().default(0),
  encryptedAccessToken: text("encrypted_access_token").notNull().default(""),
  updatedBy: text("updated_by").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const comments = sqliteTable(
  "comments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    scope: text("scope", { enum: ["guestbook", "article"] }).notNull(),
    target: text("target").notNull(),
    nickname: text("nickname").notNull(),
    email: text("email"),
    website: text("website"),
    content: text("content").notNull(),
    status: text("status", { enum: ["approved", "hidden"] }).notNull().default("approved"),
    ipHash: text("ip_hash").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("comments_scope_target_idx").on(table.scope, table.target, table.status, table.createdAt)],
)
