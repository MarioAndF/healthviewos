const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 80

const rateLimitBuckets = new Map()

const providerOptions = {
  openai: {
    baseURL: "https://api.openai.com/v1/",
    envNames: ["HEALTHVIEW_OPENAI_API_KEY", "OPENAI_API_KEY"],
    label: "OpenAI",
  },
  xai: {
    baseURL: "https://api.x.ai/v1/",
    envNames: ["HEALTHVIEW_XAI_API_KEY", "XAI_API_KEY"],
    label: "xAI",
  },
}

function allowedOrigins() {
  return (process.env.HEALTHVIEW_AGENT_ALLOWED_ORIGINS ?? process.env.ALLOWED_ORIGINS ?? "")
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

async function readJsonBody(request) {
  if (request.body && typeof request.body === "object") {
    return request.body
  }

  const chunks = []
  for await (const chunk of request) {
    chunks.push(chunk)
  }

  if (chunks.length === 0) {
    return {}
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"))
}

function normalizeProvider(provider) {
  return provider === "openai" ? "openai" : "xai"
}

function apiKeyForProvider(provider) {
  for (const name of providerOptions[provider].envNames) {
    const value = process.env[name]
    if (value?.trim()) {
      return value.trim()
    }
  }
  return undefined
}

function normalizeHeaders(headers) {
  const nextHeaders = new Headers()
  if (!Array.isArray(headers)) {
    return nextHeaders
  }

  for (const [name, value] of headers) {
    const key = String(name).toLowerCase()
    if (
      key === "authorization" ||
      key === "content-length" ||
      key === "cookie" ||
      key === "host" ||
      key === "origin" ||
      key === "referer"
    ) {
      continue
    }
    nextHeaders.set(String(name), String(value))
  }

  return nextHeaders
}

function safeResponseHeaders(headers) {
  const safeHeaders = []
  for (const [name, value] of headers.entries()) {
    const key = name.toLowerCase()
    if (
      key === "content-type" ||
      key === "openai-model" ||
      key === "openai-organization" ||
      key.startsWith("x-request") ||
      key.startsWith("x-ratelimit")
    ) {
      safeHeaders.push([name, value])
    }
  }
  return safeHeaders
}

function isAllowedProviderUrl(provider, url) {
  try {
    const parsed = new URL(url)
    return parsed.href.startsWith(providerOptions[provider].baseURL)
  } catch {
    return false
  }
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
    response.status(429).json({ error: "Too many assistant provider requests." })
    return
  }

  let body
  try {
    body = await readJsonBody(request)
  } catch {
    response.status(400).json({ error: "Invalid JSON body." })
    return
  }

  const provider = normalizeProvider(body.provider)
  const option = providerOptions[provider]
  const apiKey = apiKeyForProvider(provider)
  if (!apiKey) {
    response.status(500).json({ error: `${option.label} is not configured on this deployment.` })
    return
  }

  const method = typeof body.method === "string" ? body.method.toUpperCase() : "POST"
  const url = typeof body.url === "string" ? body.url : ""
  if (method !== "POST" || !isAllowedProviderUrl(provider, url)) {
    response.status(400).json({ error: "Unsupported assistant provider request." })
    return
  }

  const headers = normalizeHeaders(body.headers)
  headers.set("Authorization", `Bearer ${apiKey}`)
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  let upstreamResponse
  try {
    upstreamResponse = await fetch(url, {
      body: typeof body.body === "string" ? body.body : undefined,
      headers,
      method,
    })
  } catch {
    response.status(502).json({ error: `Unable to reach ${option.label}.` })
    return
  }

  const responseBody = await upstreamResponse.text()
  response.status(200).json({
    body: responseBody,
    headers: safeResponseHeaders(upstreamResponse.headers),
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
  })
}
