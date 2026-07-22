import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ruawd Blog",
    short_name: "Ruawd",
    description: "记录技术实践、VPS 测评与数字生活。",
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
