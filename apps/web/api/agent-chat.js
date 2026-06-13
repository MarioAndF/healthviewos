import OpenAI from "openai"
import {
  Agent,
  OpenAIProvider,
  Runner,
  extractAllTextOutput,
  setTracingDisabled,
} from "@openai/agents"
import { promptTemplates } from "./generated-prompts.js"

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 40

const rateLimitBuckets = new Map()

const providerOptions = {
  openai: {
    defaultModel: "gpt-5.5",
    envNames: ["HEALTHVIEW_OPENAI_API_KEY", "OPENAI_API_KEY"],
    label: "OpenAI",
    models: ["gpt-5.5", "gpt-5.1", "gpt-5", "gpt-4.1", "gpt-4o-mini"],
    useResponses: true,
  },
  xai: {
    baseURL: "https://api.x.ai/v1",
    defaultModel: "grok-4.3",
    envNames: ["HEALTHVIEW_XAI_API_KEY", "XAI_API_KEY"],
    label: "xAI",
    models: ["grok-4.3", "grok-4.3-fast", "grok-4.20-0309-reasoning"],
    useResponses: false,
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
  return provider === "xai" ? "xai" : "openai"
}

function normalizeModel(provider, model) {
  const option = providerOptions[provider]
  return typeof model === "string" && option.models.includes(model) ? model : option.defaultModel
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

function compactMessages(messages) {
  if (!Array.isArray(messages)) {
    return ""
  }

  return messages
    .slice(-12)
    .filter((message) => message?.role === "user" || message?.role === "assistant")
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${String(message.text ?? "").trim()}`)
    .filter((line) => !line.endsWith(":"))
    .join("\n")
}

function instructionsFor(input) {
  const location = input.uiContext?.location
    ? `Current location: ${JSON.stringify(input.uiContext.location)}.`
    : input.uiContext?.activePage
      ? `Current page: ${input.uiContext.activePage}.`
      : ""
  const recentConversation = compactMessages(input.messages)

  return promptTemplates.serverAgent
    .replace("{{activePage}}", location)
    .replace("{{recentConversation}}", recentConversation ? `Recent conversation:\n${recentConversation}` : "")
    .trim()
}

function modelSettings(provider) {
  if (provider === "openai") {
    return {
      reasoning: { effort: "low" },
      text: { verbosity: "low" },
    }
  }

  return {
    temperature: 0.2,
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
    response.status(429).json({ error: "Too many assistant requests." })
    return
  }

  let body
  try {
    body = await readJsonBody(request)
  } catch {
    response.status(400).json({ error: "Invalid JSON body." })
    return
  }

  const text = typeof body.text === "string" ? body.text.trim() : ""
  if (!text) {
    response.status(400).json({ error: "Message text is required." })
    return
  }

  const provider = normalizeProvider(body.provider)
  const option = providerOptions[provider]
  const apiKey = apiKeyForProvider(provider)
  if (!apiKey) {
    response.status(500).json({ error: `${option.label} is not configured on this deployment.` })
    return
  }

  const model = normalizeModel(provider, body.model)

  try {
    setTracingDisabled(true)
    const openAIClient = new OpenAI({
      apiKey,
      baseURL: option.baseURL,
    })
    const runner = new Runner({
      modelProvider: new OpenAIProvider({
        openAIClient,
        useResponses: option.useResponses,
      }),
      modelSettings: modelSettings(provider),
      traceIncludeSensitiveData: false,
      tracingDisabled: true,
      workflowName: `HealthView OS assistant (${provider})`,
    })
    const agent = new Agent({
      instructions: instructionsFor(body),
      model,
      name: "HealthView OS",
    })

    const result = await runner.run(agent, text, {
      maxTurns: 2,
    })
    const output = (
      typeof result.finalOutput === "string" ? result.finalOutput : extractAllTextOutput(result.newItems)
    ).trim()

    response.status(200).json({
      model,
      provider,
      text: output || "I could not produce a response.",
    })
  } catch (error) {
    response.status(502).json({
      error: error instanceof Error ? error.message : "Unable to run the HealthView assistant.",
    })
  }
}
