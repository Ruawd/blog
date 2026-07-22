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
