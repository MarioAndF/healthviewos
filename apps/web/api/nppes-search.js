const NPPES_API_URL = "https://npiregistry.cms.hhs.gov/api/"
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 60

const rateLimitBuckets = new Map()

function allowedOrigins() {
  return (process.env.HEALTHVIEW_NPPES_ALLOWED_ORIGINS ?? process.env.ALLOWED_ORIGINS ?? "")
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
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
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

function requestQuery(request) {
  const host = request.headers.host || "localhost"
  const url = new URL(request.url || "/", `https://${host}`)
  return url.searchParams
}

function nppesParamsFor(request) {
  const query = requestQuery(request)
  const params = new URLSearchParams({
    country_code: "US",
    limit: "10",
    version: "2.1",
  })

  const number = query.get("number")?.trim()
  const keyword = query.get("keyword")?.trim()

  if (number && /^\d{10}$/.test(number)) {
    params.set("number", number)
    return params
  }

  if (keyword) {
    params.set("keyword", keyword.slice(0, 120))
  }

  return params
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

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET, OPTIONS")
    response.status(405).json({ error: "Method not allowed." })
    return
  }

  if (isRateLimited(request)) {
    response.status(429).json({ error: "Too many provider directory requests." })
    return
  }

  const params = nppesParamsFor(request)
  if (!params.has("number") && !params.has("keyword")) {
    response.status(400).json({ error: "A provider keyword or NPI number is required." })
    return
  }

  let upstreamResponse
  try {
    upstreamResponse = await fetch(`${NPPES_API_URL}?${params.toString()}`, {
      headers: {
        Accept: "application/json",
      },
    })
  } catch {
    response.status(502).json({ error: "Unable to reach NPPES provider registry." })
    return
  }

  let body
  try {
    body = await upstreamResponse.json()
  } catch {
    response.status(502).json({ error: "NPPES provider registry returned an invalid response." })
    return
  }

  if (!upstreamResponse.ok) {
    response.status(upstreamResponse.status).json({ error: "NPPES provider registry search failed." })
    return
  }

  response.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800")
  response.status(200).json(body)
}
