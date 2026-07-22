import { sql } from "drizzle-orm"
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex, type AnySQLiteColumn } from "drizzle-orm/sqlite-core"

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
    status: text("status", { enum: ["draft", "scheduled", "published"] }).notNull().default("draft"),
    publishedAt: text("published_at").notNull(),
    scheduledAt: text("scheduled_at"),
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

export const albumCollections = sqliteTable(
  "album_collections",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    period: text("period").notNull().default(""),
    coverSrc: text("cover_src").notNull().default(""),
    sortOrder: integer("sort_order").notNull(),
    updatedBy: text("updated_by").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("album_collections_slug_unique").on(table.slug),
    uniqueIndex("album_collections_sort_order_unique").on(table.sortOrder),
  ],
)

export const albumPhotos = sqliteTable(
  "album_photos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    albumSlug: text("album_slug").notNull().default("firefly"),
    src: text("src").notNull(),
    alt: text("alt").notNull(),
    caption: text("caption").notNull().default(""),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    takenAt: text("taken_at").notNull().default(""),
    originalName: text("original_name").notNull().default(""),
    sortOrder: integer("sort_order").notNull(),
    updatedBy: text("updated_by").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("album_photos_album_order_unique").on(table.albumSlug, table.sortOrder),
    index("album_photos_album_idx").on(table.albumSlug),
  ],
)

export const friendLinks = sqliteTable(
  "friend_links",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    avatarUrl: text("avatar_url").notNull().default(""),
    description: text("description").notNull().default(""),
    backlinkUrl: text("backlink_url").notNull().default(""),
    status: text("status", { enum: ["pending", "approved", "rejected", "hidden"] }).notNull().default("pending"),
    sortOrder: integer("sort_order").notNull(),
    reviewMessage: text("review_message").notNull().default(""),
    lastCheckedAt: text("last_checked_at"),
    submittedIpHash: text("submitted_ip_hash").notNull().default(""),
    updatedBy: text("updated_by").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("friend_links_url_unique").on(table.url),
    index("friend_links_status_order_idx").on(table.status, table.sortOrder),
  ],
)

export const comments = sqliteTable(
  "comments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    scope: text("scope", { enum: ["guestbook", "article"] }).notNull(),
    target: text("target").notNull(),
    nickname: text("nickname").notNull(),
    email: text("email"),
    website: text("website"),
    avatarUrl: text("avatar_url"),
    parentId: integer("parent_id").references((): AnySQLiteColumn => comments.id, { onDelete: "set null" }),
    content: text("content").notNull(),
    status: text("status", { enum: ["approved", "hidden"] }).notNull().default("approved"),
    ipHash: text("ip_hash").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("comments_scope_target_idx").on(table.scope, table.target, table.status, table.createdAt),
    index("comments_parent_status_idx").on(table.parentId, table.status, table.createdAt),
  ],
)

export const commentInteractions = sqliteTable(
  "comment_interactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    commentId: integer("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" }),
    actorHash: text("actor_hash").notNull(),
    kind: text("kind", { enum: ["like", "heart", "laugh", "surprised", "support"] }).notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("comment_interactions_actor_kind_unique").on(table.commentId, table.actorHash, table.kind),
    index("comment_interactions_comment_kind_idx").on(table.commentId, table.kind),
  ],
)

export const postRevisions = sqliteTable(
  "post_revisions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    snapshotJson: text("snapshot_json").notNull(),
    updatedBy: text("updated_by").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("post_revisions_slug_created_idx").on(table.slug, table.createdAt, table.id)],
)

export const postAutosaves = sqliteTable("post_autosaves", {
  slug: text("slug").primaryKey(),
  snapshotJson: text("snapshot_json").notNull(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const postViews = sqliteTable("post_views", {
  slug: text("slug").primaryKey(),
  viewCount: integer("view_count").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const postViewEvents = sqliteTable(
  "post_view_events",
  {
    slug: text("slug").notNull(),
    actorHash: text("actor_hash").notNull(),
    viewedDay: text("viewed_day").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.slug, table.actorHash, table.viewedDay] }),
    index("post_view_events_day_idx").on(table.viewedDay),
  ],
)

export const requestRateLimits = sqliteTable(
  "request_rate_limits",
  {
    action: text("action").notNull(),
    actorHash: text("actor_hash").notNull(),
    windowStarted: integer("window_started").notNull(),
    attempts: integer("attempts").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.action, table.actorHash] }),
    index("request_rate_limits_window_idx").on(table.windowStarted),
  ],
)
