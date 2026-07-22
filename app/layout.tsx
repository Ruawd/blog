import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { siteConfig } from "@/lib/site"

import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "Ruawd Blog",
    template: "%s | Ruawd Blog",
  },
  description: "Ruawd 的个人博客，记录技术实践、VPS 测评与数字生活。",
  icons: {
    icon: [{ url: siteConfig.avatar, type: "image/webp" }],
    shortcut: siteConfig.avatar,
    apple: siteConfig.avatar,
  },
  openGraph: {
    title: "Ruawd Blog",
    description: "记录技术实践、VPS 测评与数字生活。",
    type: "website",
    locale: "zh_CN",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  )
}
