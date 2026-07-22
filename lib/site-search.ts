import { pinyin } from "pinyin-pro"

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("zh-CN")
    .replace(/[\p{P}\p{S}\s]+/gu, "")
}

export function createSearchAliases(values: string[]): string[] {
  const source = values.filter(Boolean).join(" ")
  const fullPinyin = pinyin(source, {
    toneType: "none",
    pattern: "pinyin",
    separator: "",
    nonZh: "consecutive",
    v: true,
  })
  const initials = pinyin(source, {
    toneType: "none",
    pattern: "first",
    separator: "",
    nonZh: "consecutive",
    v: true,
  })

  return [...new Set([source, fullPinyin, initials].map(normalizeSearchText).filter(Boolean))]
}

export function searchTokens(value: string): string[] {
  return value.trim().split(/\s+/).map(normalizeSearchText).filter(Boolean)
}

export function aliasesMatch(aliases: string[], tokens: string[]): boolean {
  return tokens.every((token) => aliases.some((alias) => alias.includes(token)))
}
