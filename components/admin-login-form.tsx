import { ArrowRight, ShieldCheck } from "lucide-react"

type AdminLoginFormProps = {
  configured: boolean
  returnTo: string
  error?: string
}

const errorMessages: Record<string, string> = {
  configuration: "服务器尚未完成 Casdoor 配置。",
  state: "登录状态已失效，请重新发起登录。",
  forbidden: "当前 Casdoor 账号无权访问管理后台。",
  casdoor: "Casdoor 登录失败，请重试。",
}

export function AdminLoginForm({ configured, returnTo, error }: AdminLoginFormProps) {
  return (
    <form className="admin-login-form" action="/api/auth/casdoor/login" method="get">
      <input type="hidden" name="return_to" value={returnTo} />
      <div className="admin-login-icon"><ShieldCheck aria-hidden="true" /></div>
      <p className="admin-login-provider">
        通过统一身份认证进入后台，仅授权 Casdoor 用户 <strong>Ruawd</strong>。
      </p>

      {!configured ? (
        <p className="admin-login-error" role="alert">
          服务器尚未完成 Casdoor 配置。
        </p>
      ) : null}
      {error ? (
        <p className="admin-login-error" role="alert">
          {errorMessages[error] || errorMessages.casdoor}
        </p>
      ) : null}

      <button type="submit" disabled={!configured}>
        <span>使用 Casdoor 登录</span>
        <ArrowRight aria-hidden="true" />
      </button>
    </form>
  )
}
