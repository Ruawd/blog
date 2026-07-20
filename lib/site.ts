export const siteConfig = {
  name: "你的名字",
  initials: "ME",
  title: "个人主页",
  description: "记录生活、兴趣与持续发生的小事。",
  tagline: "认真生活，也认真记录。",
  email: "hello@example.com",
}

export const navItems = [
  { label: "主页", href: "/" },
  { label: "博客", href: "/blog" },
  { label: "留言", href: "/message" },
  { label: "友链", href: "/friends" },
] as const

export const mineItems = [
  { label: "相册", href: "/mine/album", description: "日常与远方的切片" },
  { label: "番组计划", href: "/mine/bangumi", description: "正在看与想看的动画" },
] as const

export const aboutItems = [
  { label: "打赏", href: "/about/support", description: "请我喝一杯咖啡" },
  { label: "关于我", href: "/about/me", description: "认识屏幕后的这个人" },
] as const
