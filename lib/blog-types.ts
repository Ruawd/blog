import type { EncryptedBlogContent } from "@/lib/blog-posts.generated"

export type ArticleStatus = "draft" | "scheduled" | "published"

export type ArticleSource = "database" | "static"

export type EditableArticle = {
  slug: string
  title: string
  description: string
  content: string
  category: string
  tags: string[]
  image: string
  sourceLink: string
  status: ArticleStatus
  published: string
  scheduledAt: string
  updated: string
  readingMinutes: number
  source: ArticleSource
  editable: boolean
  protected: boolean
  passwordHint: string
  encrypted?: EncryptedBlogContent
}

export type ArticleSummary = Omit<EditableArticle, "content" | "sourceLink" | "encrypted">

export type ArticleInput = Pick<
  EditableArticle,
  | "slug"
  | "title"
  | "description"
  | "content"
  | "category"
  | "tags"
  | "image"
  | "sourceLink"
  | "status"
  | "published"
  | "scheduledAt"
  | "protected"
  | "passwordHint"
  | "readingMinutes"
> & {
  encrypted?: EncryptedBlogContent
}
