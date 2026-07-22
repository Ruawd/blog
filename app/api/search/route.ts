import { listPublishedBlogPosts } from "@/lib/blog-repository"
import { pageContentDefaults, getPageContent, type PageContentKey } from "@/lib/page-content"
import { aliasesMatch, createSearchAliases, searchTokens } from "@/lib/site-search"

export const dynamic = "force-dynamic"

const pageKeys = Object.keys(pageContentDefaults) as PageContentKey[]

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) || ""
  const tokens = searchTokens(query)
  const [posts, pages] = await Promise.all([
    listPublishedBlogPosts(),
    Promise.all(pageKeys.map(getPageContent)),
  ])

  const articleResults = posts
    .filter((post) => !tokens.length || aliasesMatch(createSearchAliases([
      post.title,
      post.description,
      post.category,
      post.tags.join(" "),
      post.slug,
    ]), tokens))
    .slice(0, tokens.length ? 8 : 5)
    .map((post) => ({
      type: "article" as const,
      title: post.title,
      description: post.description,
      meta: `${post.category} · ${post.readingMinutes} 分钟`,
      href: `/blog/${post.slug}`,
    }))

  const pageResults = pages
    .filter((page) => page.key !== "home")
    .filter((page) => !tokens.length || aliasesMatch(createSearchAliases([
      page.label,
      page.title,
      page.description,
      page.eyebrow,
    ]), tokens))
    .slice(0, tokens.length ? 5 : 4)
    .map((page) => ({
      type: "page" as const,
      title: page.title,
      description: page.description,
      meta: page.label,
      href: page.path,
    }))

  return Response.json(
    { query, results: [...articleResults, ...pageResults] },
    { headers: { "Cache-Control": query ? "private, no-store" : "public, max-age=60, stale-while-revalidate=300" } },
  )
}
