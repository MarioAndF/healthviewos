import type {
  HealthViewAgentLocalStore,
  HealthViewAgentMessage,
  HealthViewAgentProviderConfig,
  HealthViewAgentSettings,
  HealthViewAgentThread,
  UpdateHealthViewAgentSettingsInput,
} from "@healthviewos/agent/types"
import type {
  HealthViewControlClient,
} from "@healthviewos/agent/control"
import {
  HEALTHVIEW_DEFAULT_PROVIDER,
  buildHealthViewProviderStatuses,
  healthViewProviderOptions,
  isHealthViewProviderId,
  normalizeHealthViewProviderModel,
  resolveHealthViewProviderConfig,
} from "@healthviewos/agent/provider"
import { createBrowserHealthContextReader } from "@/health-context"
import { getEmbeddedHealthViewHostConfig } from "@/embed/host"

const AGENT_SETTINGS_STORAGE_KEY = "healthviewos.agent.settings"
const AGENT_STORE_STORAGE_KEY = "healthviewos.agent.store"

type BrowserAgentSettings = {
  apiKey?: string
  healthDataAccessEnabled: boolean
  model: string
  provider: UpdateHealthViewAgentSettingsInput["provider"]
}

type EnvValueMap = Record<string, string | boolean | undefined>

type PersistedAgentStore = {
  activeThreadId: string
  messages: HealthViewAgentMessage[]
  sessionItems: Record<string, unknown[]>
  threads: HealthViewAgentThread[]
}

export type XaiVoiceClientSecret = {
  expires_at?: number
  value: string
}

type DesktopAgentHttpResponse = {
  body: string
  headers: Array<[string, string]>
  status: number
  statusText: string
}

type DesktopAgentProviderConfig = HealthViewAgentProviderConfig

function newIso() {
  return new Date().toISOString()
}

function newLocalId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function newThread(): HealthViewAgentThread {
  const now = newIso()
  return {
    createdAt: now,
    id: newLocalId("agent_thread"),
    title: "HealthView chat",
    updatedAt: now,
  }
}

function envString(...names: string[]) {
  const env = import.meta.env as EnvValueMap
  for (const name of names) {
    const value = env[name]
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }
  return undefined
}

function envApiKey(provider: BrowserAgentSettings["provider"]) {
  if (provider === "xai") {
    return envString("VITE_HEALTHVIEW_XAI_API_KEY", "VITE_XAI_API_KEY", "HEALTHVIEW_XAI_API_KEY", "XAI_API_KEY")
  }

  return envString(
    "VITE_HEALTHVIEW_OPENAI_API_KEY",
    "VITE_OPENAI_API_KEY",
    "HEALTHVIEW_OPENAI_API_KEY",
    "OPENAI_API_KEY",
  )
}

function envModel(provider: BrowserAgentSettings["provider"]) {
  if (provider === "xai") {
    return envString("VITE_HEALTHVIEW_XAI_MODEL", "VITE_XAI_MODEL", "HEALTHVIEW_XAI_MODEL", "XAI_MODEL")
  }

  return envString("VITE_HEALTHVIEW_OPENAI_MODEL", "VITE_OPENAI_MODEL", "HEALTHVIEW_OPENAI_MODEL", "OPENAI_MODEL")
}

function envDefaultProvider() {
  const explicitProvider = envString("VITE_HEALTHVIEW_AGENT_PROVIDER", "HEALTHVIEW_AGENT_PROVIDER")
  if (isHealthViewProviderId(explicitProvider)) {
    return explicitProvider
  }

  return HEALTHVIEW_DEFAULT_PROVIDER
}

function shouldUseServerBackedText(settings: BrowserAgentSettings) {
  return !settings.apiKey?.trim() && (import.meta.env.PROD || envString("VITE_HEALTHVIEW_AGENT_SERVER_BACKED") === "true")
}

function defaultSettings(): BrowserAgentSettings {
  const provider = envDefaultProvider()
  return {
    apiKey: envApiKey(provider) ?? "",
    healthDataAccessEnabled: true,
    model: normalizeHealthViewProviderModel({
      model: envString("VITE_HEALTHVIEW_AGENT_MODEL", "HEALTHVIEW_AGENT_MODEL") ?? envModel(provider),
      provider,
    }),
    provider,
  }
}

function readJson<T>(key: string): T | null {
  const raw = window.localStorage.getItem(key)
  if (!raw) return null

  try {
    return JSON.parse(raw) as T
  } catch {
    window.localStorage.removeItem(key)
    return null
  }
}

function hasDesktopAgent() {
  const host = getEmbeddedHealthViewHostConfig()
  return host?.client === "desktop" && host.capabilities.localVault
}

async function desktopInvoke<T>(command: string, args?: Record<string, unknown>) {
  const { invoke } = await import("@tauri-apps/api/core")
  return invoke<T>(command, args)
}

export function loadBrowserAgentSettings(): BrowserAgentSettings {
  const parsed = readJson<Partial<BrowserAgentSettings>>(AGENT_SETTINGS_STORAGE_KEY)
  if (!parsed || !isHealthViewProviderId(parsed.provider)) {
    return defaultSettings()
  }

  return {
    apiKey: parsed.apiKey?.trim() || envApiKey(parsed.provider) || "",
    healthDataAccessEnabled: parsed.healthDataAccessEnabled ?? true,
    model: normalizeHealthViewProviderModel({
      model: parsed.model ?? envString("VITE_HEALTHVIEW_AGENT_MODEL", "HEALTHVIEW_AGENT_MODEL") ?? envModel(parsed.provider),
      provider: parsed.provider,
    }),
    provider: parsed.provider,
  }
}

function saveBrowserAgentSettings(input: BrowserAgentSettings) {
  window.localStorage.setItem(AGENT_SETTINGS_STORAGE_KEY, JSON.stringify(input))
  window.dispatchEvent(new Event("healthviewos:agent-settings-updated"))
}

function defaultPersistedStore(): PersistedAgentStore {
  const thread = newThread()
  return {
    activeThreadId: thread.id,
    messages: [],
    sessionItems: {},
    threads: [thread],
  }
}

class BrowserAgentStore implements HealthViewAgentLocalStore {
  private state = this.load()

  async getOrCreateActiveThread() {
    let thread = this.state.threads.find((item) => item.id === this.state.activeThreadId)
    if (!thread) {
      thread = newThread()
      this.state.activeThreadId = thread.id
      this.state.threads = [thread, ...this.state.threads]
      this.persist()
    }
    return thread
  }

  async createThread() {
    const thread = newThread()
    this.state.activeThreadId = thread.id
    this.state.threads = [thread, ...this.state.threads]
    this.persist()
    return thread
  }

  async listThreads() {
    return this.state.threads
  }

  async listMessages(threadId: string) {
    return this.state.messages.filter((message) => message.threadId === threadId)
  }

  async appendMessage(input: {
    role: "assistant" | "user"
    text: string
    threadId: string
  }) {
    const now = newIso()
    const message: HealthViewAgentMessage = {
      createdAt: now,
      id: newLocalId("agent_message"),
      role: input.role,
      text: input.text,
      threadId: input.threadId,
    }
    this.state.messages.push(message)
    this.state.threads = this.state.threads.map((thread) =>
      thread.id === input.threadId
        ? {
            ...thread,
            title:
              thread.title === "HealthView chat" && input.role === "user" ? input.text.slice(0, 42) : thread.title,
            updatedAt: now,
          }
        : thread,
    )
    this.persist()
    return message
  }

  async getSessionItems(sessionId: string, limit?: number) {
    const items = this.state.sessionItems[sessionId] ?? []
    const selected = limit === undefined ? items : items.slice(-limit)
    return selected as never[]
  }

  async addSessionItems(sessionId: string, items: never[]) {
    const current = this.state.sessionItems[sessionId] ?? []
    this.state.sessionItems[sessionId] = [...current, ...items]
    this.persist()
  }

  async popSessionItem(sessionId: string) {
    const items = this.state.sessionItems[sessionId] ?? []
    const item = items.pop() as never
    this.state.sessionItems[sessionId] = items
    this.persist()
    return item
  }

  async clearSessionItems(sessionId: string) {
    delete this.state.sessionItems[sessionId]
    this.persist()
  }

  private load(): PersistedAgentStore {
    const parsed = readJson<Partial<PersistedAgentStore>>(AGENT_STORE_STORAGE_KEY)
    if (!parsed || !parsed.activeThreadId || !Array.isArray(parsed.threads) || !Array.isArray(parsed.messages)) {
      return defaultPersistedStore()
    }

    return {
      activeThreadId: parsed.activeThreadId,
      messages: parsed.messages,
      sessionItems: parsed.sessionItems ?? {},
      threads: parsed.threads,
    }
  }

  private persist() {
    window.localStorage.setItem(AGENT_STORE_STORAGE_KEY, JSON.stringify(this.state))
  }
}

const browserAgentStore = new BrowserAgentStore()

let desktopAgentSettingsCache: HealthViewAgentSettings | null = null
let desktopAgentSettingsLoad: Promise<void> | null = null

class DesktopAgentStore implements HealthViewAgentLocalStore {
  private invoke<T>(command: string, args?: Record<string, unknown>) {
    return desktopInvoke<T>(command, args)
  }

  async getOrCreateActiveThread() {
    return this.invoke<HealthViewAgentThread>("get_or_create_agent_thread")
  }

  async createThread() {
    return this.invoke<HealthViewAgentThread>("create_agent_thread")
  }

  async listThreads() {
    return this.invoke<HealthViewAgentThread[]>("list_agent_threads")
  }

  async listMessages(threadId: string) {
    return this.invoke<HealthViewAgentMessage[]>("list_agent_messages", {
      input: { threadId },
    })
  }

  async appendMessage(input: {
    role: "assistant" | "user"
    text: string
    threadId: string
  }) {
    return this.invoke<HealthViewAgentMessage>("append_agent_message", { input })
  }

  async getSessionItems(sessionId: string, limit?: number) {
    return this.invoke<never[]>("get_agent_session_items", {
      input: { limit, sessionId },
    })
  }

  async addSessionItems(sessionId: string, items: never[]) {
    await this.invoke("add_agent_session_items", {
      input: { items, sessionId },
    })
  }

  async popSessionItem(sessionId: string) {
    const item = await this.invoke<never | null>("pop_agent_session_item", {
      input: { sessionId },
    })
    return item ?? undefined
  }

  async clearSessionItems(sessionId: string) {
    await this.invoke("clear_agent_session_items", {
      input: { sessionId },
    })
  }
}

const desktopAgentStore = new DesktopAgentStore()

function fallbackDesktopAgentSettings(): HealthViewAgentSettings {
  const selection = defaultSettings()
  return {
    apiKey: selection.apiKey,
    healthDataAccessEnabled: selection.healthDataAccessEnabled,
    model: selection.model,
    provider: selection.provider,
    providers: buildHealthViewProviderStatuses({
      apiKey: selection.apiKey,
      model: selection.model,
      provider: selection.provider,
    }),
  }
}

function getCachedDesktopAgentSettings() {
  if (!desktopAgentSettingsCache) {
    desktopAgentSettingsCache = fallbackDesktopAgentSettings()
    void refreshDesktopAgentSettings()
  }
  return desktopAgentSettingsCache
}

async function refreshDesktopAgentSettings(loader = () => desktopInvoke<HealthViewAgentSettings>("get_agent_settings")) {
  if (desktopAgentSettingsLoad) return desktopAgentSettingsLoad

  desktopAgentSettingsLoad = loader()
    .then((settings) => {
      desktopAgentSettingsCache = settings
      window.dispatchEvent(new Event("healthviewos:agent-settings-updated"))
    })
    .catch((error) => {
      console.error("[desktop:agent] failed to load settings", error)
    })
    .finally(() => {
      desktopAgentSettingsLoad = null
    })

  return desktopAgentSettingsLoad
}

export function getHealthViewAgentSettings(): HealthViewAgentSettings {
  if (hasDesktopAgent()) {
    return getCachedDesktopAgentSettings()
  }

  const selection = loadBrowserAgentSettings()
  const serverBackedText = shouldUseServerBackedText(selection)
  return {
    apiKey: selection.apiKey,
    healthDataAccessEnabled: selection.healthDataAccessEnabled,
    model: selection.model,
    provider: selection.provider,
    providers: buildHealthViewProviderStatuses({
      apiKey: selection.apiKey,
      model: selection.model,
      provider: selection.provider,
    }).map((provider) =>
      serverBackedText && provider.selected
        ? {
            ...provider,
            configured: true,
          }
        : provider,
    ),
  }
}

export function updateHealthViewAgentSettings(input: UpdateHealthViewAgentSettingsInput): HealthViewAgentSettings {
  if (hasDesktopAgent()) {
    const current = getCachedDesktopAgentSettings()
    const nextSettings: HealthViewAgentSettings = {
      ...current,
      apiKey: input.apiKey ?? current.apiKey,
      healthDataAccessEnabled: input.healthDataAccessEnabled ?? current.healthDataAccessEnabled,
      model: normalizeHealthViewProviderModel({
        model: input.model ?? current.model,
        provider: input.provider,
      }),
      provider: input.provider,
    }
    desktopAgentSettingsCache = nextSettings
    void refreshDesktopAgentSettings(() =>
      desktopInvoke<HealthViewAgentSettings>("update_agent_settings", { input }),
    )
    return nextSettings
  }

  const current = loadBrowserAgentSettings()
  const settings: BrowserAgentSettings = {
    apiKey: input.apiKey ?? current.apiKey ?? "",
    healthDataAccessEnabled: input.healthDataAccessEnabled ?? current.healthDataAccessEnabled,
    model: normalizeHealthViewProviderModel({
      model: input.model ?? current.model,
      provider: input.provider,
    }),
    provider: input.provider,
  }
  saveBrowserAgentSettings(settings)
  return getHealthViewAgentSettings()
}

export async function createHealthViewAgentClient(options?: {
  controlClient?: HealthViewControlClient
}) {
  if (hasDesktopAgent()) {
    const { HealthViewAgentClient } = await import("@healthviewos/agent/runtime")
    const settings = await desktopInvoke<HealthViewAgentSettings>("get_agent_settings")
    desktopAgentSettingsCache = settings

    return new HealthViewAgentClient({
      controlClient: options?.controlClient,
      healthContextReader: createBrowserHealthContextReader(),
      healthDataAccessEnabled: settings.healthDataAccessEnabled,
      providerConfig: await loadDesktopProviderConfig(),
      store: desktopAgentStore,
    })
  }

  const settings = loadBrowserAgentSettings()
  if (shouldUseServerBackedText(settings)) {
    const { HealthViewAgentClient } = await import("@healthviewos/agent/runtime")
    return new HealthViewAgentClient({
      controlClient: options?.controlClient,
      healthContextReader: createBrowserHealthContextReader(),
      healthDataAccessEnabled: settings.healthDataAccessEnabled,
      providerConfig: {
        ...resolveHealthViewProviderConfig({
          apiKey: "server",
          model: settings.model,
          provider: settings.provider,
        }),
        fetch: createServerBackedAgentFetch(settings.provider),
      },
      store: browserAgentStore,
    })
  }

  const { HealthViewAgentClient } = await import("@healthviewos/agent/runtime")
  return new HealthViewAgentClient({
    controlClient: options?.controlClient,
    healthContextReader: createBrowserHealthContextReader(),
    healthDataAccessEnabled: settings.healthDataAccessEnabled,
    providerConfig: resolveHealthViewProviderConfig(settings),
    store: browserAgentStore,
  })
}

async function loadDesktopProviderConfig(): Promise<DesktopAgentProviderConfig> {
  const config = await desktopInvoke<DesktopAgentProviderConfig>("get_agent_provider_config")
  return {
    ...config,
    fetch: createDesktopAgentFetch(),
  }
}

function createDesktopAgentFetch(): typeof fetch {
  return async (input, init) => {
    const request = new Request(input, init)
    const method = request.method.toUpperCase()
    const body =
      method === "GET" || method === "HEAD"
        ? undefined
        : await request.clone().text()
    const response = await desktopInvoke<DesktopAgentHttpResponse>("agent_provider_fetch", {
      input: {
        body,
        headers: Array.from(request.headers.entries()),
        method,
        url: request.url,
      },
    })

    return new Response(response.body, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    })
  }
}

function createServerBackedAgentFetch(provider: BrowserAgentSettings["provider"]): typeof fetch {
  return async (input, init) => {
    const request = new Request(input, init)
    const method = request.method.toUpperCase()
    const body =
      method === "GET" || method === "HEAD"
        ? undefined
        : await request.clone().text()
    const response = await fetch("/api/agent-provider-fetch", {
      body: JSON.stringify({
        body,
        headers: Array.from(request.headers.entries()),
        method,
        provider,
        url: request.url,
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    })

    const payload = (await response.json().catch(() => ({}))) as Partial<DesktopAgentHttpResponse> & {
      error?: string
    }
    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to reach the HealthView assistant provider.")
    }

    return new Response(payload.body ?? "", {
      headers: payload.headers,
      status: payload.status,
      statusText: payload.statusText,
    })
  }
}

export async function createNewHealthViewAgentThread() {
  if (hasDesktopAgent()) {
    return desktopAgentStore.createThread()
  }

  return browserAgentStore.createThread()
}

export async function listHealthViewAgentThreads() {
  if (hasDesktopAgent()) {
    return desktopAgentStore.listThreads()
  }

  return browserAgentStore.listThreads()
}

export { healthViewProviderOptions }

export async function createXaiVoiceClientSecret(): Promise<XaiVoiceClientSecret> {
  if (hasDesktopAgent()) {
    return desktopInvoke<XaiVoiceClientSecret>("create_xai_voice_client_secret")
  }

  const response = await fetch("/api/xai-realtime-token", {
    headers: {
      Accept: "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    let message = "Unable to create an xAI voice token."
    try {
      const body = (await response.json()) as { error?: string }
      message = body.error ?? message
    } catch {
      // Keep the generic message.
    }
    throw new Error(message)
  }

  const body = (await response.json()) as Partial<XaiVoiceClientSecret>
  if (!body.value) {
    throw new Error("The xAI voice token response did not include a client secret.")
  }

  return {
    expires_at: body.expires_at,
    value: body.value,
  }
}
