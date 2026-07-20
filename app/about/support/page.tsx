import type { Metadata } from "next"

import { SiteFrame } from "@/components/site-frame"

export const metadata: Metadata = {
  title: "打赏",
  description: "自愿支持这个小站继续更新；没有门槛，也不影响任何内容的阅读。",
}

const supportMethods = [
  {
    name: "微信",
    label: "微信赞赏码",
    note: "请将这里替换为你的微信收款码。",
  },
  {
    name: "支付宝",
    label: "支付宝收款码",
    note: "请将这里替换为你的支付宝收款码。",
  },
] as const

export default function SupportPage() {
  return (
    <SiteFrame
      eyebrow="SUPPORT / 自愿支持"
      title="请我喝杯咖啡"
      description="如果这里的某篇文字、照片或小工具恰好帮到了你，可以自愿支持小站继续更新。"
    >
      <section className="support-intro" aria-labelledby="support-principle-title">
        <div>
          <p className="section-kicker">A SMALL NOTE</p>
          <h2 id="support-principle-title">喜欢就常来看看，已经足够。</h2>
        </div>
        <div className="support-copy">
          <p>
            这里的公开内容不会因为是否打赏而区别对待。支持完全自愿，也无需留下姓名或联系方式；
            阅读、留言和分享，本身就是对这个小站最好的鼓励。
          </p>
          <p>
            收到的支持将优先用于域名、服务器与创作工具等基础开销。请量力而行，也请不要使用借款或未成年人的零花钱打赏。
          </p>
        </div>
      </section>

      <section className="support-methods" aria-labelledby="support-methods-title">
        <header className="page-section-heading">
          <p className="section-kicker">PAYMENT PLACEHOLDERS</p>
          <h2 id="support-methods-title">选择一种方式</h2>
          <p>以下二维码目前仅作版式展示，尚未接入真实收款信息。</p>
        </header>

        <div className="support-grid">
          {supportMethods.map((method) => (
            <article className="support-card" key={method.name}>
              <div
                className="qr-placeholder"
                role="img"
                aria-label={`${method.label}占位图，当前不可用`}
              >
                <span aria-hidden="true">QR</span>
                <small>占位图 · 暂不可用</small>
              </div>
              <div className="support-card-copy">
                <p className="section-kicker">{method.name}</p>
                <h3>{method.label}</h3>
                <p>{method.note}</p>
              </div>
            </article>
          ))}
        </div>

        <p className="support-footnote" role="note">
          请勿在转账备注中填写敏感个人信息。页面接入真实二维码后，仍请先确认收款方名称再付款。
        </p>
      </section>
    </SiteFrame>
  )
}
