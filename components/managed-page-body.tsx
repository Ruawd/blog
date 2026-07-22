import { ArticleMarkdown } from "@/components/article-markdown"

export function ManagedPageBody({ content }: { content: string }) {
  if (!content.trim()) return null
  return <section className="managed-page-body"><ArticleMarkdown content={content} /></section>
}
