export const siteConfig = {
  name: "Ruawd",
  initials: "R",
  title: "独立博客",
  description: "Ruawd 的个人博客，记录技术实践、VPS 测评与数字生活。",
  tagline: "把踩过的坑、用过的服务和想留下的内容认真记录下来。",
  email: "admin@ruawd.de",
  url: "https://blog.ruawd.de",
  avatar: "/blog-media/profile/avatar.webp",
  github: "https://github.com/Ruawd",
  bilibili: "https://space.bilibili.com/180370037",
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
