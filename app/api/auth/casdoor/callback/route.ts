import { NextRequest, NextResponse } from "next/server"

import {
  CASDOOR_FLOW_COOKIE,
  casdoorFlowCookieOptions,
  casdoorStateMatches,
  decodeCasdoorFlow,
  exchangeCasdoorCode,
  getCasdoorUsername,
} from "@/lib/casdoor-auth"
import { getCasdoorConfig } from "@/lib/casdoor-config"
import { createAdminSessionCookie } from "@/lib/admin-session"

export const dynamic = "force-dynamic"

function clearFlowCookie(response: NextResponse) {
  response.cookies.set(CASDOOR_FLOW_COOKIE, "", { ...casdoorFlowCookieOptions(), maxAge: 0 })
  return response
}

function loginError(request: NextRequest, error: string) {
  const config = getCasdoorConfig()
  const loginUrl = new URL("/admin/login", config?.redirectUri || request.url)
  loginUrl.searchParams.set("error", error)
  return clearFlowCookie(NextResponse.redirect(loginUrl))
}

export async function GET(request: NextRequest) {
  const config = getCasdoorConfig()
  if (!config) return loginError(request, "configuration")
  if (request.nextUrl.searchParams.get("error")) return loginError(request, "casdoor")

  const flow = decodeCasdoorFlow(request.cookies.get(CASDOOR_FLOW_COOKIE)?.value)
  const state = request.nextUrl.searchParams.get("state")
  const code = request.nextUrl.searchParams.get("code")
  if (!flow || !code || !casdoorStateMatches(flow, state)) return loginError(request, "state")

  try {
    const accessToken = await exchangeCasdoorCode(code, flow.verifier)
    const username = await getCasdoorUsername(accessToken)
    if (username !== config.allowedUsername) return loginError(request, "forbidden")

    const destination = new URL(flow.returnTo, config.redirectUri)
    const response = clearFlowCookie(NextResponse.redirect(destination))
    const session = createAdminSessionCookie(username)
    response.cookies.set(session.name, session.value, session.options)
    return response
  } catch {
    return loginError(request, "casdoor")
  }
}
