export type CasdoorConfig = {
  issuer: string
  authorizationEndpoint: string
  tokenEndpoint: string
  userinfoEndpoint: string
  clientId: string
  clientSecret: string
  redirectUri: string
  allowedUsername: string
}

function normalizedIssuer(value: string): string | null {
  try {
    const issuer = new URL(value)
    if (!["http:", "https:"].includes(issuer.protocol)) return null
    return issuer.toString().replace(/\/$/, "")
  } catch {
    return null
  }
}

export function getCasdoorConfig(): CasdoorConfig | null {
  const issuer = normalizedIssuer(process.env.CASDOOR_ISSUER?.trim() || "")
  const clientId = process.env.CASDOOR_CLIENT_ID?.trim()
  const clientSecret = process.env.CASDOOR_CLIENT_SECRET?.trim()
  const redirectUri = process.env.CASDOOR_REDIRECT_URI?.trim()
  const allowedUsername = process.env.CASDOOR_ALLOWED_USER?.trim() || "Ruawd"

  if (!issuer || !clientId || !clientSecret || !redirectUri || !allowedUsername) return null

  try {
    new URL(redirectUri)
  } catch {
    return null
  }

  return {
    issuer,
    authorizationEndpoint: `${issuer}/login/oauth/authorize`,
    tokenEndpoint: `${issuer}/api/login/oauth/access_token`,
    userinfoEndpoint: `${issuer}/api/userinfo`,
    clientId,
    clientSecret,
    redirectUri,
    allowedUsername,
  }
}
