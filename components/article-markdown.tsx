import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

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
          img: ({ alt, ...props }) => (
            // Markdown image dimensions are not known at build time.
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={alt || "文章配图"} loading="lazy" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
