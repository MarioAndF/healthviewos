import type { AgentInputItem } from "@openai/agents"
import type { HealthViewAppLocation, HealthViewUiActionSummary } from "./control"

export type HealthViewAgentProviderId = "openai" | "xai"

export type HealthViewAgentRole = "assistant" | "user"

export type HealthViewAgentMessage = {
  id: string
  threadId: string
  role: HealthViewAgentRole
  text: string
  createdAt: string
}

export type HealthViewAgentThread = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export type HealthViewAgentProviderConfig = {
  apiKey?: string
  baseURL?: string
  configured: boolean
  fetch?: typeof fetch
  label?: string
  model: string
  provider: HealthViewAgentProviderId
  useResponses?: boolean
}

export type HealthViewAgentProviderOption = {
  defaultModel: string
  enabled: boolean
  envNames: string[]
  id: HealthViewAgentProviderId
  label: string
  models: string[]
}

export type HealthViewAgentProviderStatus = HealthViewAgentProviderOption & {
  configured: boolean
  model: string
  selected: boolean
}

export type HealthViewAgentSettings = {
  apiKey?: string
  healthDataAccessEnabled: boolean
  model: string
  provider: HealthViewAgentProviderId
  providers: HealthViewAgentProviderStatus[]
}

export type UpdateHealthViewAgentSettingsInput = {
  apiKey?: string
  healthDataAccessEnabled?: boolean
  model?: string
  provider: HealthViewAgentProviderId
}

export type HealthViewUiContext = {
  activePage: string
  actions?: HealthViewUiActionSummary[]
  chatOpen: boolean
  location?: HealthViewAppLocation | null
}

export type HealthViewAgentRunInput = {
  text: string
  threadId?: string
  uiContext?: HealthViewUiContext | null
}

export type HealthViewAgentRunResult = {
  assistantMessage: HealthViewAgentMessage
  thread: HealthViewAgentThread
}

export type HealthViewAgentEvent =
  | { type: "thread"; thread: HealthViewAgentThread }
  | { type: "user_message"; message: HealthViewAgentMessage }
  | { type: "status"; message: string }
  | { type: "assistant_message"; message: HealthViewAgentMessage }
  | { type: "error"; message: string }

export type HealthViewAgentSessionStore = {
  addSessionItems(sessionId: string, items: AgentInputItem[]): Promise<void>
  clearSessionItems(sessionId: string): Promise<void>
  getSessionItems(sessionId: string, limit?: number): Promise<AgentInputItem[]>
  popSessionItem(sessionId: string): Promise<AgentInputItem | undefined>
}

export type HealthViewAgentMessageStore = {
  appendMessage(input: {
    role: HealthViewAgentRole
    text: string
    threadId: string
  }): Promise<HealthViewAgentMessage>
  getOrCreateActiveThread(): Promise<HealthViewAgentThread>
  listMessages(threadId: string): Promise<HealthViewAgentMessage[]>
}

export type HealthViewAgentLocalStore = HealthViewAgentSessionStore & HealthViewAgentMessageStore

export type HealthViewAgentToolContext = {
  threadId: string
  uiContext?: HealthViewUiContext | null
}

export type HealthViewAgentToolResult =
  | { modelOutput: unknown; ok: true }
  | { error: string; ok: false }

export type HealthViewHealthContextReader = () => Promise<unknown> | unknown
