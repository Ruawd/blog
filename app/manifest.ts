import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ruawd 个人主页",
    short_name: "Ruawd",
    description: "文章、相册、番组、友链与数字生活。",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f7",
    theme_color: "#111111",
    lang: "zh-CN",
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
    ],
  }
}
