import {
  getApprovedCommentEmail,
  type CommentNotificationContext,
} from "@/lib/comment-repository"
import { siteConfig } from "@/lib/site"

function commentUrl(comment: CommentNotificationContext): string {
  const path = comment.scope === "article" ? `/blog/${comment.target}` : "/message"
  return new URL(`${path}#comment-${comment.id}`, siteConfig.url).toString()
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

async function postWebhook(comment: CommentNotificationContext): Promise<void> {
  const endpoint = process.env.COMMENT_NOTIFICATION_WEBHOOK_URL?.trim()
  if (!endpoint) return
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      event: comment.parentId ? "comment.reply" : "comment.created",
      comment: {
        id: comment.id,
        scope: comment.scope,
        target: comment.target,
        nickname: comment.nickname,
        content: comment.content,
        url: commentUrl(comment),
      },
    }),
    signal: AbortSignal.timeout(7_000),
  })
  if (!response.ok) throw new Error(`Webhook returned ${response.status}`)
}

async function postTelegram(comment: CommentNotificationContext): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim()
  if (!token || !chatId) return
  const title = comment.parentId ? "个人主页收到新回复" : "个人主页收到新评论"
  const text = [
    `<b>${escapeHtml(title)}</b>`,
    `<b>${escapeHtml(comment.nickname)}</b>：${escapeHtml(comment.content.slice(0, 800))}`,
    `<a href="${escapeHtml(commentUrl(comment))}">打开评论</a>`,
  ].join("\n\n")
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    signal: AbortSignal.timeout(7_000),
  })
  if (!response.ok) throw new Error(`Telegram returned ${response.status}`)
}

async function sendReplyEmail(comment: CommentNotificationContext): Promise<void> {
  if (!comment.parentId) return
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.COMMENT_FROM_EMAIL?.trim()
  const recipient = getApprovedCommentEmail(comment.parentId)
  if (!apiKey || !from || !recipient || recipient === comment.email) return
  const url = commentUrl(comment)
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [recipient],
      subject: `${comment.nickname} 回复了你在 Ruawd 个人主页的评论`,
      text: `${comment.nickname} 回复了你：\n\n${comment.content}\n\n查看回复：${url}\n\n这是一封由你在评论中填写的邮箱触发的回复提醒。`,
    }),
    signal: AbortSignal.timeout(7_000),
  })
  if (!response.ok) throw new Error(`Resend returned ${response.status}`)
}

export async function notifyCommentPublished(comment: CommentNotificationContext): Promise<void> {
  await Promise.allSettled([
    postWebhook(comment),
    postTelegram(comment),
    sendReplyEmail(comment),
  ])
}
