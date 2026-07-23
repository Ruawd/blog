import { listPublishedBlogPosts } from "@/lib/blog-repository"
import { listCachedAlbumCollectionSummaries } from "@/lib/album-repository"
import { pageContentDefaults, getPageContent, type PageContentKey } from "@/lib/page-content"
import { listPublishedProjects } from "@/lib/project-repository"
import { aliasesMatch, createSearchAliases, searchTokens } from "@/lib/site-search"

export const dynamic = "force-dynamic"

const pageKeys = Object.keys(pageContentDefaults) as PageContentKey[]

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) || ""
  const tokens = searchTokens(query)
  const [posts, pages, albums, projects] = await Promise.all([
    listPublishedBlogPosts(),
    Promise.all(pageKeys.map(getPageContent)),
    listCachedAlbumCollectionSummaries(),
    listPublishedProjects(),
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

  const albumResults = albums
    .filter((album) => !tokens.length || aliasesMatch(createSearchAliases([
      album.title,
      album.description,
      album.period,
      album.slug,
    ]), tokens))
    .slice(0, tokens.length ? 4 : 2)
    .map((album) => ({
      type: "page" as const,
      title: album.title,
      description: album.description || `${album.photoCount} 张图片`,
      meta: `相册 · ${album.photoCount} 张`,
      href: `/mine/album/${album.slug}`,
    }))

  const projectResults = projects
    .filter((project) => !tokens.length || aliasesMatch(createSearchAliases([
      project.title,
      project.description,
      project.tags.join(" "),
      project.slug,
    ]), tokens))
    .slice(0, tokens.length ? 4 : 2)
    .map((project) => ({
      type: "page" as const,
      title: project.title,
      description: project.description,
      meta: "项目",
      href: "/projects",
    }))

  return Response.json(
    { query, results: [...articleResults, ...projectResults, ...albumResults, ...pageResults] },
    { headers: { "Cache-Control": query ? "private, no-store" : "public, max-age=60, stale-while-revalidate=300" } },
  )
}
