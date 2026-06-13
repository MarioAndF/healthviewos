import type { HealthViewUiContext } from "./types"
import { promptTemplates } from "./generated/prompts"

function formatUiContext(uiContext?: HealthViewUiContext | null) {
  if (!uiContext) {
    return "No app UI context provided."
  }

  return [`chatOpen: ${uiContext.chatOpen}`, `activePage: ${uiContext.activePage}`].join("\n")
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
  openPage: promptTemplates.openPageTool.trim(),
  setChatOpen: promptTemplates.setChatOpenTool.trim(),
} as const
