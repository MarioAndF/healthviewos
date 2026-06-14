const GOOGLE_PLACES_API_URL = "https://places.googleapis.com/v1/places:searchText"
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 80
const MAX_RADIUS_METERS = 50_000

const rateLimitBuckets = new Map()

function allowedOrigins() {
  return (process.env.HEALTHVIEW_PLACES_ALLOWED_ORIGINS ?? process.env.ALLOWED_ORIGINS ?? "")
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

function placesApiKey() {
  const envNames = [
    "HEALTHVIEW_GOOGLE_MAPS_API_KEY",
    "GOOGLE_MAPS_API_KEY",
    "VITE_GOOGLE_MAPS_API_KEY",
  ]

  for (const name of envNames) {
    const value = process.env[name]
    if (value?.trim()) return value.trim()
  }

  return null
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value)
}

function locationBiasFor(input) {
  const location = input?.location
  if (!location || !finiteNumber(location.latitude) || !finiteNumber(location.longitude)) {
    return undefined
  }

  if (location.latitude < -90 || location.latitude > 90 || location.longitude < -180 || location.longitude > 180) {
    return undefined
  }

  const radiusMeters = finiteNumber(location.radiusMeters)
    ? Math.max(1, Math.min(location.radiusMeters, MAX_RADIUS_METERS))
    : 15_000

  return {
    circle: {
      center: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
      radius: radiusMeters,
    },
  }
}

function placesRequestBody(input) {
  const textQuery = typeof input.textQuery === "string" ? input.textQuery.trim().slice(0, 120) : ""
  if (!textQuery) {
    return null
  }

  const body = {
    languageCode: "en",
    maxResultCount: 10,
    regionCode: "US",
    textQuery,
  }
  const locationBias = locationBiasFor(input)
  if (locationBias) {
    body.locationBias = locationBias
  }

  return body
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
    response.status(429).json({ error: "Too many Places directory requests." })
    return
  }

  let input
  try {
    input = await readJsonBody(request)
  } catch {
    response.status(400).json({ error: "Invalid JSON body." })
    return
  }

  const body = placesRequestBody(input)
  if (!body) {
    response.status(400).json({ error: "A Places text query is required." })
    return
  }

  const apiKey = placesApiKey()
  if (!apiKey) {
    response.status(500).json({ error: "Google Places is not configured on this deployment." })
    return
  }

  let upstreamResponse
  try {
    upstreamResponse = await fetch(GOOGLE_PLACES_API_URL, {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.formattedAddress",
          "places.nationalPhoneNumber",
          "places.internationalPhoneNumber",
          "places.websiteUri",
          "places.googleMapsUri",
          "places.location",
          "places.types",
          "places.primaryType",
          "places.businessStatus",
        ].join(","),
      },
      method: "POST",
    })
  } catch {
    response.status(502).json({ error: "Unable to reach Google Places." })
    return
  }

  let payload
  try {
    payload = await upstreamResponse.json()
  } catch {
    response.status(502).json({ error: "Google Places returned an invalid response." })
    return
  }

  if (!upstreamResponse.ok) {
    response.status(upstreamResponse.status).json({
      error: payload?.error?.message ?? "Google Places search failed.",
      status: payload?.error?.status,
    })
    return
  }

  response.setHeader("Cache-Control", "no-store")
  response.status(200).json(payload)
}
