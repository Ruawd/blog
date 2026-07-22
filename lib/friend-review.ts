import { siteConfig } from "@/lib/site"
import {
  safeProbeImage,
  safeReadHtml,
  UnsafeRemoteUrlError,
} from "@/lib/safe-remote-resource"

export type FriendReviewCandidate = {
  url: string
  avatarUrl: string
  backlinkUrl: string
}

export type FriendReviewResult = {
  approved: boolean
  message: string
  checkedAt: string
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
}

function normalizedHostname(value: string): string {
  return value.toLowerCase().replace(/^www\./, "")
}

export function htmlContainsFriendBacklink(html: string, pageUrl: string): boolean {
  const allowedHosts = new Set(siteConfig.friendBacklinkTargets.map((target) => (
    normalizedHostname(new URL(target).hostname)
  )))
  const searchableHtml = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|template|textarea|xmp|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
  const pattern = /<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>`]+))/gi
  for (const match of searchableHtml.matchAll(pattern)) {
    const href = decodeHtmlAttribute(match[1] || match[2] || match[3] || "").trim()
    if (!href || href.startsWith("#") || /^javascript:/i.test(href)) continue
    try {
      const target = new URL(href, pageUrl)
      if (target.protocol === "https:" && allowedHosts.has(normalizedHostname(target.hostname))) return true
    } catch {}
  }
  return false
}

export async function reviewFriendCandidate(candidate: FriendReviewCandidate): Promise<FriendReviewResult> {
  const checkedAt = new Date().toISOString()
  try {
    const ownHosts = new Set(siteConfig.friendBacklinkTargets.map((target) => normalizedHostname(new URL(target).hostname)))
    const submittedSiteHost = normalizedHostname(new URL(candidate.url).hostname)
    const submittedBacklinkHost = normalizedHostname(new URL(candidate.backlinkUrl).hostname)
    if (ownHosts.has(submittedSiteHost)) {
      throw new UnsafeRemoteUrlError("不能提交本站自身作为友链")
    }
    if (submittedSiteHost !== submittedBacklinkHost) {
      return {
        approved: false,
        message: "友链页面需要与站点地址使用同一域名",
        checkedAt,
      }
    }
    const samePage = candidate.url === candidate.backlinkUrl
    const sitePromise = safeReadHtml(candidate.url, "站点首页")
    const backlinkPromise = samePage ? sitePromise : safeReadHtml(candidate.backlinkUrl, "友链页面")
    const avatarPromise = candidate.avatarUrl
      ? safeProbeImage(candidate.avatarUrl, "头像")
      : Promise.resolve()
    const [site, backlink] = await Promise.all([sitePromise, backlinkPromise, avatarPromise])

    const acceptedSiteHosts = new Set([
      submittedSiteHost,
      normalizedHostname(new URL(site.finalUrl).hostname),
    ])
    if (!acceptedSiteHosts.has(normalizedHostname(new URL(backlink.finalUrl).hostname))) {
      return {
        approved: false,
        message: "友链页面重定向到了与站点地址不同的域名",
        checkedAt,
      }
    }

    if (!htmlContainsFriendBacklink(backlink.html, backlink.finalUrl)) {
      return {
        approved: false,
        message: `未在友链页面检测到本站链接（${siteConfig.friendBacklinkTargets.join(" 或 ")}）`,
        checkedAt,
      }
    }
    return {
      approved: true,
      message: "站点、头像与双向链接验证通过，已自动收录",
      checkedAt,
    }
  } catch (error) {
    if (error instanceof UnsafeRemoteUrlError) throw error
    return {
      approved: false,
      message: error instanceof Error ? error.message : "自动审核暂时无法完成",
      checkedAt,
    }
  }
}
