import { NextRequest, NextResponse } from "next/server"

import {
  CASDOOR_FLOW_COOKIE,
  casdoorFlowCookieOptions,
  createCasdoorFlow,
  safeAdminReturnTo,
} from "@/lib/casdoor-auth"
import { getCasdoorConfig } from "@/lib/casdoor-config"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const config = getCasdoorConfig()
  const loginUrl = new URL("/admin/login", request.url)
  if (!config) {
    loginUrl.searchParams.set("error", "configuration")
    return NextResponse.redirect(loginUrl)
  }

  const returnTo = safeAdminReturnTo(request.nextUrl.searchParams.get("return_to"))
  const flow = createCasdoorFlow(returnTo)
  if (!flow) {
    loginUrl.searchParams.set("error", "configuration")
    return NextResponse.redirect(loginUrl)
  }

  const authorizationUrl = new URL(config.authorizationEndpoint)
  authorizationUrl.searchParams.set("client_id", config.clientId)
  authorizationUrl.searchParams.set("response_type", "code")
  authorizationUrl.searchParams.set("redirect_uri", config.redirectUri)
  authorizationUrl.searchParams.set("scope", "openid profile email")
  authorizationUrl.searchParams.set("state", flow.state)
  authorizationUrl.searchParams.set("code_challenge", flow.challenge)
  authorizationUrl.searchParams.set("code_challenge_method", "S256")

  const response = NextResponse.redirect(authorizationUrl)
  response.cookies.set(CASDOOR_FLOW_COOKIE, flow.cookieValue, casdoorFlowCookieOptions())
  response.headers.set("cache-control", "no-store")
  return response
}
