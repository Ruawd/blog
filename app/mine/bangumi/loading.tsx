import { SiteHeader } from "@/components/site-header"

export default function BangumiLoading() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <div className="bangumi-route-loading" role="status" aria-label="正在读取番组计划">
        <div className="bangumi-loading-hero"><span /><strong /><i /></div>
        <div className="bangumi-loading-tabs">{Array.from({ length: 4 }, (_, index) => <span key={index} />)}</div>
        <div className="bangumi-loading-grid">{Array.from({ length: 10 }, (_, index) => <span key={index} />)}</div>
      </div>
    </div>
  )
}
