export const commentReactionOptions = [
  { kind: "heart", emoji: "❤️", label: "喜欢" },
  { kind: "laugh", emoji: "😂", label: "好笑" },
  { kind: "surprised", emoji: "😮", label: "惊讶" },
  { kind: "support", emoji: "🎉", label: "支持" },
] as const

export type CommentReactionKind = typeof commentReactionOptions[number]["kind"]
export type CommentInteractionKind = "like" | CommentReactionKind

const interactionKinds = new Set<CommentInteractionKind>([
  "like",
  ...commentReactionOptions.map((option) => option.kind),
])

export function isCommentInteractionKind(value: unknown): value is CommentInteractionKind {
  return typeof value === "string" && interactionKinds.has(value as CommentInteractionKind)
}
