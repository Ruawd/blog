import { ImageResponse } from "next/og"
import { siteConfig } from "@/lib/site"

export const alt = "Ruawd 个人主页"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 82px",
        background: "#f7f7f7",
        color: "#111111",
        fontFamily: "sans-serif",
        border: "18px solid #111111",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, letterSpacing: "0.18em" }}>
        <span>RUAWD / PERSONAL SPACE</span>
        <span>EST. 2026</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 112, fontWeight: 700, letterSpacing: "-0.07em", lineHeight: 0.9 }}>Ruawd</div>
        <div style={{ fontSize: 34, color: "#555555" }}>文章 · 相册 · 番组 · 数字生活</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "#555555" }}>
        <span>把喜欢的内容留在自己的页面里。</span>
        <span>{new URL(siteConfig.url).hostname}</span>
      </div>
    </div>,
    size,
  )
}
