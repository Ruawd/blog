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
    default: "Ruawd · 个人主页",
    template: "%s | Ruawd",
  },
  description: siteConfig.description,
  applicationName: "Ruawd 个人主页",
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
    title: "Ruawd · 个人主页",
    description: siteConfig.description,
    type: "website",
    locale: "zh_CN",
    url: "/",
    siteName: "Ruawd 个人主页",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Ruawd 个人主页" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ruawd · 个人主页",
    description: siteConfig.description,
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

const profileJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  name: "Ruawd 的个人主页",
  url: siteConfig.url,
  description: siteConfig.description,
  mainEntity: {
    "@type": "Person",
    name: siteConfig.name,
    url: siteConfig.url,
    image: new URL(siteConfig.avatar, siteConfig.url).toString(),
    sameAs: [siteConfig.github, siteConfig.bilibili],
  },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(profileJsonLd).replaceAll("<", "\\u003c") }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  )
}
