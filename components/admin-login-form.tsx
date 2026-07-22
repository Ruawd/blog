"use client"

import { useState } from "react"
import { ArrowRight, LoaderCircle, LockKeyhole } from "lucide-react"

type AdminLoginFormProps = {
  configured: boolean
  returnTo: string
  username: string
}

export function AdminLoginForm({ configured, returnTo, username: initialUsername }: AdminLoginFormProps) {
  const [username, setUsername] = useState(initialUsername)
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!configured || pending) return
    setPending(true)
    setError("")

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const body = await response.json() as { error?: string }
      if (!response.ok) throw new Error(body.error || "登录失败，请稍后重试")
      window.location.assign(returnTo)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "登录失败，请稍后重试")
      setPending(false)
    }
  }

  return (
    <form className="admin-login-form" onSubmit={(event) => void submit(event)}>
      <div className="admin-login-icon"><LockKeyhole aria-hidden="true" /></div>
      <div className="admin-field">
        <label htmlFor="admin-username">管理员账号</label>
        <input
          id="admin-username"
          name="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          disabled={!configured || pending}
          required
        />
      </div>
      <div className="admin-field">
        <label htmlFor="admin-password">密码</label>
        <input
          id="admin-password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          disabled={!configured || pending}
          required
          autoFocus
        />
      </div>

      {!configured ? (
        <p className="admin-login-error" role="alert">
          服务器尚未配置管理员密码，请先完成环境变量配置。
        </p>
      ) : null}
      {error ? <p className="admin-login-error" role="alert">{error}</p> : null}

      <button type="submit" disabled={!configured || pending}>
        {pending ? <LoaderCircle aria-hidden="true" /> : null}
        <span>{pending ? "正在登录" : "进入管理后台"}</span>
        {!pending ? <ArrowRight aria-hidden="true" /> : null}
      </button>
    </form>
  )
}
