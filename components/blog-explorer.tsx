"use client"

import Link from "next/link"
import { useDeferredValue, useMemo, useState } from "react"
import { ArrowRight, LockKeyhole, Search, SearchX, X } from "lucide-react"

import { ResilientImage } from "@/components/resilient-image"
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list"

export type BlogExplorerPost = {
  slug: string
  title: string
  published: string
  description: string
  image?: string
  tags: string[]
  category: string
  readingMinutes: number
  protected: boolean
  searchAliases: string[]
}

type SearchablePost = {
  post: BlogExplorerPost
  haystacks: string[]
}

const ALL_CATEGORIES = "__all__"

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

function normalizeSearchText(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("zh-CN")
    .replace(/[\p{P}\p{S}\s]+/gu, "")
}

function createSearchablePost(post: BlogExplorerPost): SearchablePost {
  return {
    post,
    haystacks: post.searchAliases.map(normalizeSearchText),
  }
}

export function BlogExplorer({ posts, initialCategory }: { posts: BlogExplorerPost[]; initialCategory?: string }) {
  const [query, setQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState(() => (
    initialCategory && posts.some((post) => post.category === initialCategory)
      ? initialCategory
      : ALL_CATEGORIES
  ))
  const deferredQuery = useDeferredValue(query)

  const searchablePosts = useMemo(() => posts.map(createSearchablePost), [posts])
  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    posts.forEach((post) => counts.set(post.category, (counts.get(post.category) || 0) + 1))
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
  }, [posts])
  const visibleCategories = useMemo(() => {
    if (activeCategory === ALL_CATEGORIES) return categories.slice(0, 4)
    const activeEntry = categories.find(([category]) => category === activeCategory)
    if (!activeEntry) return categories.slice(0, 4)
    return [activeEntry, ...categories.filter(([category]) => category !== activeCategory).slice(0, 3)]
  }, [activeCategory, categories])

  const queryTokens = deferredQuery
    .trim()
    .split(/\s+/)
    .map(normalizeSearchText)
    .filter(Boolean)

  const filteredPosts = searchablePosts
    .filter(({ post, haystacks }) => {
      const matchesCategory = activeCategory === ALL_CATEGORIES || post.category === activeCategory
      const matchesQuery = queryTokens.every((token) => haystacks.some((haystack) => haystack.includes(token)))
      return matchesCategory && matchesQuery
    })
    .map(({ post }) => post)

  const hasFilters = query.trim().length > 0 || activeCategory !== ALL_CATEGORIES

  function selectCategory(category: string) {
    setActiveCategory(category)
    const url = new URL(window.location.href)
    if (category === ALL_CATEGORIES) url.searchParams.delete("category")
    else url.searchParams.set("category", category)
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`)
  }

  function resetFilters() {
    setQuery("")
    selectCategory(ALL_CATEGORIES)
  }

  return (
    <div className="blog-explorer">
      <div className="blog-filter-panel">
        <form className="blog-search" role="search" onSubmit={(event) => event.preventDefault()}>
          <Search aria-hidden="true" />
          <label className="sr-only" htmlFor="blog-search-input">搜索博客文章</label>
          <input
            id="blog-search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题、分类、标签、中文或拼音…"
            autoComplete="off"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="清空搜索">
              <X aria-hidden="true" />
            </button>
          ) : null}
        </form>

        <div className="blog-filter-summary" aria-live="polite">
          <strong>{filteredPosts.length}</strong>
          <span>/ {posts.length} 篇文章</span>
        </div>
      </div>

      <nav className="blog-category-filter" aria-label="文章分类筛选">
        <div className="blog-category-options" role="group" aria-label="按分类筛选文章">
          <button
            type="button"
            data-active={activeCategory === ALL_CATEGORIES}
            aria-pressed={activeCategory === ALL_CATEGORIES}
            onClick={() => selectCategory(ALL_CATEGORIES)}
          >
            全部 <span>{posts.length}</span>
          </button>
          {visibleCategories.map(([category, count], index) => (
            <button
              className="blog-category-option"
              type="button"
              data-slot={index + 1}
              data-active={activeCategory === category}
              aria-pressed={activeCategory === category}
              onClick={() => selectCategory(category)}
              key={category}
            >
              {category} <span>{count}</span>
            </button>
          ))}
        </div>
        <Link className="blog-category-more" href="/blog/categories">
          <span>更多</span>
          <ArrowRight aria-hidden="true" />
        </Link>
      </nav>

      {filteredPosts.length ? (
        <AnimatedList className="post-list">
          {filteredPosts.map((post, index) => (
            <AnimatedListItem className="post-list-item" key={post.slug}>
              <article className="post-card">
                <header className="post-meta">
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <time dateTime={post.published}>
                    {dateFormatter.format(new Date(`${post.published}T00:00:00+08:00`))}
                  </time>
                  <span>{post.category}</span>
                </header>

                <div className="post-copy">
                  <h3>
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                  </h3>
                  <p>{post.description}</p>
                </div>

                {post.image ? (
                  <Link
                    className="post-cover-link"
                    href={`/blog/${post.slug}`}
                    aria-label={`阅读《${post.title}》`}
                    tabIndex={-1}
                  >
                    <ResilientImage
                      className="post-cover"
                      src={post.image}
                      alt=""
                      width={800}
                      height={600}
                      loading={index < 3 ? "eager" : "lazy"}
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </Link>
                ) : null}

                <footer className="post-footer">
                  <ul className="post-tags" aria-label="文章标签">
                    {post.tags.map((tag) => <li key={tag}>#{tag}</li>)}
                  </ul>
                  <Link className="post-read-link" href={`/blog/${post.slug}`}>
                    {post.protected ? <LockKeyhole aria-hidden="true" /> : null}
                    <span>{post.protected ? "密码保护" : `约 ${post.readingMinutes} 分钟`}</span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </footer>
              </article>
            </AnimatedListItem>
          ))}
        </AnimatedList>
      ) : (
        <div className="blog-empty-state" role="status">
          <SearchX aria-hidden="true" />
          <h3>没有匹配的文章</h3>
          <p>换一个关键词，或清除当前分类筛选。</p>
          {hasFilters ? <button type="button" onClick={resetFilters}>清除筛选</button> : null}
        </div>
      )}
    </div>
  )
}
