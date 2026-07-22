"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, Copy } from "lucide-react"
import { Prism } from "prism-react-renderer"

const languageAliases: Record<string, string> = {
  cjs: "javascript",
  html: "markup",
  js: "javascript",
  jsx: "jsx",
  md: "markdown",
  py: "python",
  sh: "bash",
  shell: "bash",
  ts: "typescript",
  tsx: "tsx",
  yml: "yaml",
}

function copyWithFallback(value: string) {
  const textarea = document.createElement("textarea")
  textarea.value = value
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand("copy")
  textarea.remove()
}

export function ArticleCodeBlock({ code, language = "text" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const normalizedLanguage = languageAliases[language.toLowerCase()] || language.toLowerCase() || "text"
  const lineNumbers = useMemo(
    () => code.split("\n").map((_, index) => index + 1).join("\n"),
    [code],
  )
  const highlightedCode = useMemo(() => {
    const grammar = Prism.languages[normalizedLanguage] || Prism.languages.plain
    return Prism.highlight(code, grammar, normalizedLanguage)
  }, [code, normalizedLanguage])

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current)
  }, [])

  async function copyCode() {
    setCopied(true)
    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setCopied(false), 1800)

    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(code)
      else copyWithFallback(code)
    } catch {
      try {
        copyWithFallback(code)
      } catch {
        // Clipboard access can be denied by the browser; the code remains selectable.
      }
    }
  }

  return (
    <div className="article-code-block">
      <div className="article-code-toolbar">
        <span className="article-code-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="article-code-language">{language || "text"}</span>
        <button type="button" onClick={() => void copyCode()} aria-label={copied ? "代码已复制" : "复制代码"}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          <span>{copied ? "已复制" : "复制"}</span>
        </button>
      </div>

      <pre className={`language-${normalizedLanguage} article-code-pre`}><span className="article-code-line-numbers" aria-hidden="true">{lineNumbers}</span><code className="article-code-content" dangerouslySetInnerHTML={{ __html: highlightedCode }} /></pre>
    </div>
  )
}
