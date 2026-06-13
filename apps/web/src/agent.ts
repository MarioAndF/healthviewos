import type {
  HealthViewAgentLocalStore,
  HealthViewAgentMessage,
  HealthViewAgentSettings,
  HealthViewAgentThread,
  UpdateHealthViewAgentSettingsInput,
} from "@healthviewos/agent/types"
import type {
  HealthViewControlClient,
} from "@healthviewos/agent/control"
import {
  buildHealthViewProviderStatuses,
  getHealthViewProviderOption,
  healthViewProviderIds,
  healthViewProviderOptions,
  isHealthViewProviderId,
  normalizeHealthViewProviderModel,
  resolveHealthViewProviderConfig,
} from "@healthviewos/agent/provider"
import { createBrowserHealthContextReader } from "@/health-context"

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

type ServerAgentChatResponse = {
  error?: string
  text?: string
}

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

  return healthViewProviderIds.find((provider) => Boolean(envApiKey(provider))) ?? "openai"
}

function shouldUseServerBackedText(settings: BrowserAgentSettings) {
  return !settings.apiKey?.trim() && (import.meta.env.PROD || envString("VITE_HEALTHVIEW_AGENT_SERVER_BACKED") === "true")
}

function defaultSettings(): BrowserAgentSettings {
  const provider = envDefaultProvider()
  return {
    apiKey: envApiKey(provider) ?? "",
    healthDataAccessEnabled: false,
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

export function loadBrowserAgentSettings(): BrowserAgentSettings {
  const parsed = readJson<Partial<BrowserAgentSettings>>(AGENT_SETTINGS_STORAGE_KEY)
  if (!parsed || !isHealthViewProviderId(parsed.provider)) {
    return defaultSettings()
  }

  return {
    apiKey: parsed.apiKey?.trim() || envApiKey(parsed.provider) || "",
    healthDataAccessEnabled: parsed.healthDataAccessEnabled === true,
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

export function getHealthViewAgentSettings(): HealthViewAgentSettings {
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
  const settings = loadBrowserAgentSettings()
  if (shouldUseServerBackedText(settings)) {
    return new ServerBackedHealthViewAgentClient({
      providerConfig: resolveHealthViewProviderConfig({
        apiKey: "server",
        model: settings.model,
        provider: settings.provider,
      }),
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

class ServerBackedHealthViewAgentClient {
  private readonly options: {
    providerConfig: ReturnType<typeof resolveHealthViewProviderConfig>
    store: BrowserAgentStore
  }

  constructor(options: {
    providerConfig: ReturnType<typeof resolveHealthViewProviderConfig>
    store: BrowserAgentStore
  }) {
    this.options = options
  }

  listMessages(threadId?: string): Promise<HealthViewAgentMessage[]> {
    if (threadId) {
      return this.options.store.listMessages(threadId)
    }
    return this.options.store.getOrCreateActiveThread().then((thread) => this.options.store.listMessages(thread.id))
  }

  getOrCreateActiveThread() {
    return this.options.store.getOrCreateActiveThread()
  }

  async *run(input: {
    text: string
    threadId?: string
    uiContext?: { activePage: string; chatOpen: boolean } | null
  }) {
    const text = input.text.trim()
    if (!text) {
      yield { message: "Enter a message before sending.", type: "error" } as const
      return
    }

    const thread = await this.options.store.getOrCreateActiveThread()
    yield { thread, type: "thread" } as const

    const userMessage = await this.options.store.appendMessage({
      role: "user",
      text,
      threadId: thread.id,
    })
    yield { message: userMessage, type: "user_message" } as const

    const providerLabel = getHealthViewProviderOption(this.options.providerConfig.provider).label
    yield {
      message: `Thinking with ${providerLabel} (${this.options.providerConfig.model})`,
      type: "status",
    } as const

    try {
      const messages = await this.options.store.listMessages(thread.id)
      const response = await fetch("/api/agent-chat", {
        body: JSON.stringify({
          messages: messages.slice(-12),
          model: this.options.providerConfig.model,
          provider: this.options.providerConfig.provider,
          text,
          uiContext: input.uiContext,
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
      })
      const body = (await response.json().catch(() => ({}))) as ServerAgentChatResponse
      if (!response.ok || !body.text) {
        throw new Error(body.error ?? "Unable to run the HealthView assistant.")
      }

      const assistantMessage = await this.options.store.appendMessage({
        role: "assistant",
        text: body.text,
        threadId: thread.id,
      })
      yield { message: assistantMessage, type: "assistant_message" } as const
      yield { assistantMessage, thread }
    } catch (error) {
      yield {
        message: error instanceof Error ? error.message : "Unable to run the HealthView assistant.",
        type: "error",
      } as const
    }
  }
}

export async function createNewHealthViewAgentThread() {
  return browserAgentStore.createThread()
}

export async function listHealthViewAgentThreads() {
  return browserAgentStore.listThreads()
}

export { healthViewProviderOptions }

export async function createXaiVoiceClientSecret(): Promise<XaiVoiceClientSecret> {
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
