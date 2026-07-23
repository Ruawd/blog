export const siteConfig = {
  name: "Ruawd",
  initials: "R",
  title: "个人主页",
  description: "Ruawd 的个人主页，收录文章、项目、相册、番组与数字生活。",
  tagline: "把文章、项目、影像、兴趣和数字生活认真留在自己的页面里。",
  email: "admin@ruawd.de",
  url: "https://blog.ruawd.de",
  friendBacklinkTargets: ["https://p8.nz", "https://blog.ruawd.de"],
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
  { label: "此刻", href: "/now", description: "最近在做与刚刚更新的内容" },
  { label: "项目", href: "/projects", description: "正在维护的数字作品" },
  { label: "相册", href: "/mine/album", description: "日常与远方的切片" },
  { label: "番组计划", href: "/mine/bangumi", description: "正在看与想看的动画" },
  { label: "使用清单", href: "/uses", description: "工具、服务与技术栈" },
] as const

export const aboutItems = [
  { label: "打赏", href: "/about/support", description: "请我喝一杯咖啡" },
  { label: "关于我", href: "/about/me", description: "认识屏幕后的这个人" },
] as const
