import type { AgentInputItem, Session } from "@openai/agents"
import type { HealthViewAgentSessionStore } from "./types"

function textFromContent(content: unknown) {
  if (typeof content === "string") {
    return content.trim()
  }
  if (!Array.isArray(content)) {
    return ""
  }

  return content
    .map((part) => {
      if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
        return part.text
      }
      return ""
    })
    .join("")
    .trim()
}

export function sanitizeAgentSessionItems(items: AgentInputItem[]) {
  const sanitized: AgentInputItem[] = []

  for (const item of items) {
    if (!item || typeof item !== "object" || !("role" in item)) {
      continue
    }

    const role = item.role
    if (role !== "user" && role !== "assistant") {
      continue
    }

    const content = textFromContent("content" in item ? item.content : undefined)
    if (!content) {
      continue
    }

    sanitized.push({
      content: [
        {
          text: content,
          type: role === "user" ? "input_text" : "output_text",
        },
      ],
      role,
      type: "message",
    } as AgentInputItem)
  }

  return sanitized
}

export class HealthViewAgentSession implements Session {
  private readonly sessionId: string
  private readonly store: HealthViewAgentSessionStore

  constructor(sessionId: string, store: HealthViewAgentSessionStore) {
    this.sessionId = sessionId
    this.store = store
  }

  async getSessionId() {
    return this.sessionId
  }

  async getItems(limit?: number) {
    const items = await this.store.getSessionItems(this.sessionId, limit)
    return sanitizeAgentSessionItems(items)
  }

  async addItems(items: AgentInputItem[]) {
    await this.store.addSessionItems(this.sessionId, items)
  }

  async popItem() {
    return this.store.popSessionItem(this.sessionId)
  }

  async clearSession() {
    await this.store.clearSessionItems(this.sessionId)
  }
}
