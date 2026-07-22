import type { Metadata } from "next"
import Image from "next/image"

import { SiteFrame } from "@/components/site-frame"
import { ManagedPageBody } from "@/components/managed-page-body"
import { getPageContent } from "@/lib/page-content"

export const metadata: Metadata = {
  title: "打赏",
  description: "支持 Ruawd Blog 的服务器维护、内容创作和功能开发。",
}

export const dynamic = "force-dynamic"

const supportMethods = [
  {
    name: "支付宝",
    src: "/blog-media/sponsor/alipay.png",
    description: "使用支付宝扫码赞助",
  },
  {
    name: "微信",
    src: "/blog-media/sponsor/wechat.png",
    description: "使用微信扫码赞助",
  },
] as const

export default async function SupportPage() {
  const page = await getPageContent("support")
  return (
    <SiteFrame
      eyebrow={page.eyebrow}
      title={page.title}
      description={page.description}
    >
      <ManagedPageBody content={page.body} />
      <section className="support-intro" aria-labelledby="support-principle-title">
        <div>
          <p className="section-kicker">A SMALL NOTE</p>
          <h2 id="support-principle-title">谢谢你愿意支持这个小站。</h2>
        </div>
        <div className="support-copy">
          <p>所有公开内容都可以自由阅读，赞助完全自愿，也不会影响文章访问。</p>
          <p>请量力而行，付款前确认收款信息，不要在备注里填写敏感个人资料。</p>
        </div>
      </section>

      <section className="support-methods" aria-labelledby="support-methods-title">
        <header className="page-section-heading">
          <p className="section-kicker">PAYMENT METHODS</p>
          <h2 id="support-methods-title">选择一种方式</h2>
          <p>付款前请核对扫码后显示的收款方信息。</p>
        </header>

        <div className="support-grid">
          {supportMethods.map((method) => (
            <article className="support-card" key={method.name}>
              <Image
                className="support-qr"
                src={method.src}
                alt={`${method.name}赞助二维码`}
                width={640}
                height={640}
                unoptimized
              />
              <div className="support-card-copy">
                <p className="section-kicker">{method.name}</p>
                <h3>{method.description}</h3>
              </div>
            </article>
          ))}
        </div>
      </section>
    </SiteFrame>
  )
}
