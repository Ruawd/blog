import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { siteConfig } from "@/lib/site"

import "./globals.css"
import "./enhancements.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Ruawd Blog",
    template: "%s | Ruawd Blog",
  },
  description: "Ruawd 的个人博客，记录技术实践、VPS 测评与数字生活。",
  applicationName: "Ruawd Blog",
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
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
    url: "/",
    siteName: "Ruawd Blog",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Ruawd Blog" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ruawd Blog",
    description: "记录技术实践、VPS 测评与数字生活。",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f7" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (() => {
            try {
              const saved = localStorage.getItem('ruawd-theme');
              const theme = saved === 'dark' || saved === 'light'
                ? saved
                : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              document.documentElement.classList.toggle('dark', theme === 'dark');
              document.documentElement.dataset.theme = theme;
              document.documentElement.style.colorScheme = theme;
            } catch {}
          })();
        ` }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  )
}
