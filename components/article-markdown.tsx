import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { ResilientImage } from "@/components/resilient-image"

type ArticleMarkdownProps = {
  content: string
}

export function ArticleMarkdown({ content }: ArticleMarkdownProps) {
  return (
    <div className="article-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
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
