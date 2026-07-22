"use client"

import { useState } from "react"
import { LoaderCircle, LogOut } from "lucide-react"

export function AdminLogoutButton() {
  const [pending, setPending] = useState(false)

  async function logout() {
    setPending(true)
    try {
      await fetch("/api/admin/session", { method: "DELETE" })
    } finally {
      window.location.assign("/")
    }
  }

  return (
    <button className="admin-logout" type="button" onClick={() => void logout()} disabled={pending}>
      退出 {pending ? <LoaderCircle aria-hidden="true" /> : <LogOut aria-hidden="true" />}
    </button>
  )
}
