import { isValidElement, type ReactNode } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { ResilientImage } from "@/components/resilient-image"
import { createUniqueHeadingId } from "@/lib/article-headings"

type ArticleMarkdownProps = {
  content: string
}

function getHeadingText(value: ReactNode): string {
  if (typeof value === "string" || typeof value === "number") return String(value)
  if (Array.isArray(value)) return value.map(getHeadingText).join("")
  if (isValidElement<{ children?: ReactNode }>(value)) return getHeadingText(value.props.children)
  return ""
}

export function ArticleMarkdown({ content }: ArticleMarkdownProps) {
  const usedHeadingIds = new Map<string, number>()

  return (
    <div className="article-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children, node, ...props }) => {
            void node
            return <h1 id={createUniqueHeadingId(getHeadingText(children), usedHeadingIds)} {...props}>{children}</h1>
          },
          h2: ({ children, node, ...props }) => {
            void node
            return <h2 id={createUniqueHeadingId(getHeadingText(children), usedHeadingIds)} {...props}>{children}</h2>
          },
          h3: ({ children, node, ...props }) => {
            void node
            return <h3 id={createUniqueHeadingId(getHeadingText(children), usedHeadingIds)} {...props}>{children}</h3>
          },
          a: ({ href, children, ...props }) => {
            const external = href?.startsWith("http")
            return (
              <a
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer" : undefined}
                {...props}
              >
                {children}
              </a>
            )
          },
          img: ({ alt, src }) => src ? (
            <ResilientImage
              alt={alt || "文章配图"}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              src={src}
            />
          ) : null,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
