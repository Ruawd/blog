export type ArticleHeading = {
  id: string
  label: string
  level: 1 | 2 | 3
}

function cleanHeadingLabel(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[`*_~]/g, "")
    .replace(/\\([\\`*{}\[\]()#+\-.!_>])/g, "$1")
    .trim()
}

export function createUniqueHeadingId(label: string, usedIds: Map<string, number>) {
  const base = label
    .normalize("NFKC")
    .toLocaleLowerCase("zh-CN")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") || "section"
  const occurrence = (usedIds.get(base) ?? 0) + 1
  usedIds.set(base, occurrence)
  return occurrence === 1 ? base : `${base}-${occurrence}`
}

export function extractArticleHeadings(markdown: string): ArticleHeading[] {
  const headings: ArticleHeading[] = []
  const usedIds = new Map<string, number>()
  let fenceMarker = ""

  for (const line of markdown.split(/\r?\n/)) {
    const fence = line.match(/^\s*(`{3,}|~{3,})/)
    if (fence) {
      const marker = fence[1][0]
      fenceMarker = fenceMarker === marker ? "" : marker
      continue
    }
    if (fenceMarker) continue

    const match = line.match(/^\s{0,3}(#{1,3})\s+(.+?)\s*#*\s*$/)
    if (!match) continue

    const label = cleanHeadingLabel(match[2])
    if (!label) continue
    headings.push({
      id: createUniqueHeadingId(label, usedIds),
      label,
      level: match[1].length as 1 | 2 | 3,
    })
  }

  return headings
}
