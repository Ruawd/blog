"use client"

import { useEffect, useState } from "react"
import {
  Check,
  CircleAlert,
  ExternalLink,
  KeyRound,
  LoaderCircle,
  PlugZap,
  Save,
} from "lucide-react"

import { BorderBeam } from "@/components/ui/border-beam"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import type { BangumiAdminSettings, BangumiCategory } from "@/lib/bangumi-settings"

const categories: Array<{ id: BangumiCategory; label: string; description: string }> = [
  { id: "anime", label: "动画", description: "动画、剧场版与 OVA" },
  { id: "book", label: "书籍", description: "漫画、小说与读物" },
  { id: "music", label: "音乐", description: "专辑、原声与单曲" },
  { id: "game", label: "游戏", description: "主机、PC 与移动游戏" },
]

type FormState = BangumiAdminSettings & {
  accessToken: string
  removeAccessToken: boolean
}

type TestResult = {
  userId: string
  total: number
  sections: Array<{ id: BangumiCategory; label: string; count: number }>
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error || "请求失败")
  return body
}

function toForm(settings: BangumiAdminSettings): FormState {
  return { ...settings, accessToken: "", removeAccessToken: false }
}

export function AdminBangumiSettings() {
  const [form, setForm] = useState<FormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await readJson<{ settings: BangumiAdminSettings }>(
          await fetch("/api/admin/bangumi", { cache: "no-store" }),
        )
        if (!cancelled) setForm(toForm(data.settings))
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Bangumi 配置读取失败")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => current ? { ...current, [key]: value } : current)
    setError("")
    setMessage("")
    setTestResult(null)
  }

  function toggleCategory(category: BangumiCategory) {
    if (!form) return
    const enabledCategories = form.enabledCategories.includes(category)
      ? form.enabledCategories.filter((item) => item !== category)
      : [...form.enabledCategories, category]
    update("enabledCategories", enabledCategories)
  }

  async function testConnection() {
    if (!form || testing || saving) return
    setTesting(true)
    setError("")
    setMessage("")
    setTestResult(null)
    try {
      const result = await readJson<TestResult>(await fetch("/api/admin/bangumi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      }))
      setTestResult(result)
      setMessage(`连接成功，共读取 ${result.total} 个条目`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Bangumi API 连接失败")
    } finally {
      setTesting(false)
    }
  }

  async function save() {
    if (!form || testing || saving) return
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const data = await readJson<{ settings: BangumiAdminSettings }>(await fetch("/api/admin/bangumi", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      }))
      setForm(toForm(data.settings))
      setMessage("Bangumi 配置已保存，前台缓存已刷新")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Bangumi 配置保存失败")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="admin-bangumi-loading"><LoaderCircle className="spin" aria-hidden="true" />正在读取 Bangumi 配置</div>
  }

  if (!form) {
    return <div className="admin-bangumi-loading is-error"><CircleAlert aria-hidden="true" />{error || "Bangumi 配置不可用"}</div>
  }

  return (
    <section className="admin-bangumi-settings magic-surface" aria-labelledby="admin-bangumi-title">
      <BorderBeam size={160} duration={11} colorFrom="#111111" colorTo="#b7b7b7" borderWidth={1} />
      <header className="admin-bangumi-heading">
        <div>
          <p className="section-kicker">BANGUMI / API</p>
          <h2 id="admin-bangumi-title">番组 API</h2>
          <p>配置服务端读取方式。访问令牌只在服务器使用，不会发送到前台。</p>
        </div>
        <a href="/mine/bangumi" target="_blank" rel="noreferrer">查看番组计划<ExternalLink aria-hidden="true" /></a>
      </header>

      {form.accessTokenError ? (
        <div className="admin-bangumi-warning" role="alert"><CircleAlert aria-hidden="true" />已保存的令牌无法解密，请重新填写后保存。</div>
      ) : null}

      <div className="admin-bangumi-grid">
        <div className="admin-bangumi-fields">
          <div className="admin-field-grid">
            <div className="admin-field">
              <label htmlFor="bangumi-user-id">Bangumi 用户 ID</label>
              <input id="bangumi-user-id" value={form.userId} onChange={(event) => update("userId", event.target.value)} maxLength={80} autoComplete="off" />
              <small>例如 ruawd，对应 bgm.tv/user/ruawd。</small>
            </div>
            <div className="admin-field">
              <label htmlFor="bangumi-cache">缓存时间（秒）</label>
              <input id="bangumi-cache" type="number" min={60} max={86400} step={60} value={form.cacheTtlSeconds} onChange={(event) => update("cacheTtlSeconds", Number(event.target.value))} />
              <small>建议 900 秒，减少 Bangumi API 请求频率。</small>
            </div>
          </div>

          <div className="admin-field">
            <label htmlFor="bangumi-api-url">API 根地址</label>
            <input id="bangumi-api-url" type="url" value={form.apiBaseUrl} onChange={(event) => update("apiBaseUrl", event.target.value)} spellCheck={false} />
            <small>默认 https://api.bgm.tv，不要在末尾填写 /v0。</small>
          </div>

          <div className="admin-field">
            <label htmlFor="bangumi-subject-url">条目链接地址</label>
            <input id="bangumi-subject-url" type="url" value={form.subjectBaseUrl} onChange={(event) => update("subjectBaseUrl", event.target.value)} spellCheck={false} />
            <small>卡片点击后跳转的地址，默认 https://bgm.tv/subject/。</small>
          </div>

          <div className="admin-field">
            <label htmlFor="bangumi-user-agent">User-Agent</label>
            <input id="bangumi-user-agent" value={form.userAgent} onChange={(event) => update("userAgent", event.target.value)} maxLength={200} spellCheck={false} />
            <small>Bangumi 官方要求填写可识别的应用名称与站点地址。</small>
          </div>

          <fieldset className="admin-bangumi-categories">
            <legend>展示分类</legend>
            <div>
              {categories.map((category) => (
                <label className={form.enabledCategories.includes(category.id) ? "is-selected" : ""} key={category.id}>
                  <input type="checkbox" checked={form.enabledCategories.includes(category.id)} onChange={() => toggleCategory(category.id)} />
                  <span><strong>{category.label}</strong><small>{category.description}</small></span>
                  <Check aria-hidden="true" />
                </label>
              ))}
            </div>
          </fieldset>

          <div className="admin-field admin-token-field">
            <label htmlFor="bangumi-token"><KeyRound aria-hidden="true" />访问令牌（可选）</label>
            <input
              id="bangumi-token"
              type="password"
              value={form.accessToken}
              onChange={(event) => update("accessToken", event.target.value)}
              placeholder={form.accessTokenConfigured ? "已配置；留空会保留现有令牌" : "公开收藏无需令牌"}
              autoComplete="new-password"
            />
            <small>只有私有账户或需要读取私有收藏时才需要。保存前会使用 AES-256-GCM 加密。<a href="https://next.bgm.tv/demo/access-token" target="_blank" rel="noreferrer">生成令牌</a></small>
          </div>

          {form.accessTokenConfigured ? (
            <label className="admin-bangumi-switch">
              <input type="checkbox" checked={form.removeAccessToken} onChange={(event) => update("removeAccessToken", event.target.checked)} />
              <span><strong>删除已保存的令牌</strong><small>下次保存配置时生效</small></span>
            </label>
          ) : null}

          <label className="admin-bangumi-switch">
            <input type="checkbox" checked={form.includePrivate} onChange={(event) => update("includePrivate", event.target.checked)} />
            <span><strong>在公开网页显示私有收藏</strong><small>默认关闭；开启后私有条目也会出现在访客可见的页面上</small></span>
          </label>
        </div>

        <aside className="admin-bangumi-summary" aria-label="Bangumi 配置说明">
          <PlugZap aria-hidden="true" />
          <p className="section-kicker">SERVER SIDE</p>
          <h3>{form.userId || "未填写用户"}</h3>
          <dl>
            <div><dt>分类</dt><dd>{form.enabledCategories.length}</dd></div>
            <div><dt>缓存</dt><dd>{form.cacheTtlSeconds}s</dd></div>
            <div><dt>令牌</dt><dd>{form.removeAccessToken ? "将删除" : form.accessToken || form.accessTokenConfigured ? "已配置" : "未配置"}</dd></div>
          </dl>
          {testResult ? (
            <div className="admin-bangumi-test-result">
              <strong>本次读取</strong>
              {testResult.sections.map((section) => <span key={section.id}>{section.label}<b>{section.count}</b></span>)}
            </div>
          ) : (
            <p>测试连接不会保存配置；确认结果后再点击保存。</p>
          )}
        </aside>
      </div>

      <footer className="admin-bangumi-footer">
        <p className={error ? "is-error" : message ? "is-success" : ""} role="status">{error || message || "修改 API 地址后建议先测试连接。"}</p>
        <div>
          <button className="admin-bangumi-test" type="button" onClick={() => void testConnection()} disabled={testing || saving}>
            {testing ? <LoaderCircle className="spin" aria-hidden="true" /> : <PlugZap aria-hidden="true" />}{testing ? "测试中" : "测试连接"}
          </button>
          <ShimmerButton type="button" onClick={() => void save()} disabled={saving || testing}>
            {saving ? <LoaderCircle className="spin" aria-hidden="true" /> : message && !testResult ? <Check aria-hidden="true" /> : <Save aria-hidden="true" />}{saving ? "保存中" : "保存配置"}
          </ShimmerButton>
        </div>
      </footer>
    </section>
  )
}
