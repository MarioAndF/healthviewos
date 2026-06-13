import type { HealthViewUiContext } from "./types"
import { promptTemplates } from "./generated/prompts"

function formatUiContext(uiContext?: HealthViewUiContext | null) {
  if (!uiContext) {
    return "No app UI context provided."
  }

  const lines = [
    `chatOpen: ${uiContext.chatOpen}`,
    `activePage: ${uiContext.activePage}`,
    `location: ${JSON.stringify(uiContext.location ?? { page: uiContext.activePage })}`,
  ]

  if (uiContext.actions?.length) {
    lines.push("visibleActions:")
    for (const action of uiContext.actions.slice(0, 20)) {
      lines.push(`- ${action.id}: ${action.label} (${action.kind}, ${action.risk})`)
    }
  }

  return lines.join("\n")
}

export function buildHealthViewAgentInstructions(input: {
  uiContext?: HealthViewUiContext | null
}) {
  return promptTemplates.healthviewAgent.replace("{{uiContext}}", formatUiContext(input.uiContext))
}

export function buildHealthViewVoiceInstructions(input: {
  uiContext?: HealthViewUiContext | null
}) {
  return [
    buildHealthViewAgentInstructions(input),
    promptTemplates.voiceSession.trim(),
  ].join("\n\n")
}

export const healthViewToolPromptTemplates = {
  endVoiceChat: promptTemplates.endVoiceChatTool.trim(),
  getAppContext: promptTemplates.getAppContextTool.trim(),
  getHealthContext: promptTemplates.getHealthContextTool.trim(),
  navigate: promptTemplates.navigateTool.trim(),
  openPage: promptTemplates.openPageTool.trim(),
  runUiAction: promptTemplates.runUiActionTool.trim(),
  searchApp: promptTemplates.searchAppTool.trim(),
  setChatOpen: promptTemplates.setChatOpenTool.trim(),
} as const
