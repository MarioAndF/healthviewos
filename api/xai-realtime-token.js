const SESSION_REQUEST_URL = "https://api.x.ai/v1/realtime/client_secrets"
const DEFAULT_TTL_SECONDS = 300
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 20

const rateLimitBuckets = new Map()

function allowedOrigins() {
  return (process.env.XAI_TOKEN_ALLOWED_ORIGINS ?? process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function isAllowedOrigin(request) {
  const origin = request.headers.origin
  if (!origin) return true

  try {
    const originUrl = new URL(origin)
    const host = request.headers.host
    if (host && originUrl.host === host) return true
    if (originUrl.hostname === "localhost" || originUrl.hostname === "127.0.0.1") return true
  } catch {
    return false
  }

  return allowedOrigins().includes(origin)
}

function setCorsHeaders(request, response) {
  const origin = request.headers.origin
  response.setHeader("Vary", "Origin")
  if (origin && isAllowedOrigin(request)) {
    response.setHeader("Access-Control-Allow-Origin", origin)
  }
  response.setHeader("Access-Control-Allow-Headers", "Content-Type")
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
}

function isRateLimited(request) {
  const forwardedFor = request.headers["x-forwarded-for"]
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(",")[0]?.trim() || request.socket?.remoteAddress || "unknown"
  const now = Date.now()
  const current = rateLimitBuckets.get(ip)

  if (!current || now - current.startedAt > RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(ip, { count: 1, startedAt: now })
    return false
  }

  current.count += 1
  return current.count > RATE_LIMIT_MAX
}

function extractClientSecret(body) {
  return body?.value ?? body?.client_secret?.value ?? body?.client_secret ?? body?.secret ?? body?.token
}

export default async function handler(request, response) {
  setCorsHeaders(request, response)

  if (!isAllowedOrigin(request)) {
    response.status(403).json({ error: "Origin is not allowed." })
    return
  }

  if (request.method === "OPTIONS") {
    response.status(204).end()
    return
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST, OPTIONS")
    response.status(405).json({ error: "Method not allowed." })
    return
  }

  if (isRateLimited(request)) {
    response.status(429).json({ error: "Too many voice token requests." })
    return
  }

  const apiKey = process.env.HEALTHVIEW_XAI_API_KEY ?? process.env.XAI_API_KEY
  if (!apiKey) {
    response.status(500).json({ error: "xAI voice is not configured on this deployment." })
    return
  }

  let upstreamResponse
  try {
    upstreamResponse = await fetch(SESSION_REQUEST_URL, {
      body: JSON.stringify({
        expires_after: {
          seconds: DEFAULT_TTL_SECONDS,
        },
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    })
  } catch {
    response.status(502).json({ error: "Unable to reach xAI voice token service." })
    return
  }

  let body
  try {
    body = await upstreamResponse.json()
  } catch {
    response.status(502).json({ error: "xAI voice token service returned an invalid response." })
    return
  }

  if (!upstreamResponse.ok) {
    response.status(upstreamResponse.status).json({ error: "xAI voice token request failed." })
    return
  }

  const value = extractClientSecret(body)
  if (!value) {
    response.status(502).json({ error: "xAI voice token response did not include a client secret." })
    return
  }

  response.status(200).json({
    expires_at: body.expires_at ?? body.expiresAt ?? body.client_secret?.expires_at,
    value,
  })
}
