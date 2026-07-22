import Image from "next/image"

import { HomeParticleBackground } from "@/components/home-background-switcher"
import { SiteHeader } from "@/components/site-header"
import { siteConfig } from "@/lib/site"

export default function Home() {
  return (
    <div className="site-shell home-shell">
      <a className="skip-link" href="#main">跳到主要内容</a>
      <SiteHeader showBrand={false} />
      <main id="main" className="home-main">
        <section className="home-profile" aria-labelledby="home-title">
          <HomeParticleBackground />
          <h1 className="sr-only" id="home-title">Ruawd</h1>
          <Image
            className="home-avatar-only"
            src={siteConfig.avatar}
            alt="Ruawd 的头像"
            width={320}
            height={320}
            priority
          />
        </section>
      </main>
    </div>
  )
}
