export type ArticleStatus = "draft" | "published"

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
  updated: string
  readingMinutes: number
  source: ArticleSource
  editable: boolean
  protected: boolean
}

export type ArticleSummary = Omit<EditableArticle, "content" | "sourceLink">

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
>
