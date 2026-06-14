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

function formatHealthDataAccess(enabled?: boolean) {
  return enabled
    ? "Health data access is enabled. The `get_health_context` tool can return a compact local health summary when the user's request would benefit from personal context."
    : "Health data access is not enabled for this assistant session."
}

export function buildHealthViewAgentInstructions(input: {
  healthDataAccessEnabled?: boolean
  uiContext?: HealthViewUiContext | null
}) {
  return promptTemplates.healthviewAgent
    .replace("{{uiContext}}", formatUiContext(input.uiContext))
    .replace("{{healthDataAccess}}", formatHealthDataAccess(input.healthDataAccessEnabled))
}

export function buildHealthViewVoiceInstructions(input: {
  healthDataAccessEnabled?: boolean
  uiContext?: HealthViewUiContext | null
}) {
  return [
    buildHealthViewAgentInstructions(input),
    promptTemplates.voiceSession.trim(),
  ].join("\n\n")
}

export const healthViewToolPromptTemplates = {
  controlAtlasView: promptTemplates.controlAtlasViewTool.trim(),
  createRecord: promptTemplates.createRecordTool.trim(),
  endVoiceChat: promptTemplates.endVoiceChatTool.trim(),
  getAppContext: promptTemplates.getAppContextTool.trim(),
  getHealthContext: promptTemplates.getHealthContextTool.trim(),
  getRecord: promptTemplates.getRecordTool.trim(),
  navigate: promptTemplates.navigateTool.trim(),
  openPage: promptTemplates.openPageTool.trim(),
  runUiAction: promptTemplates.runUiActionTool.trim(),
  searchApp: promptTemplates.searchAppTool.trim(),
  searchAtlasTargets: promptTemplates.searchAtlasTargetsTool.trim(),
  searchRecords: promptTemplates.searchRecordsTool.trim(),
  searchServices: promptTemplates.searchServicesTool.trim(),
  selectServiceResult: promptTemplates.selectServiceResultTool.trim(),
  setChatOpen: promptTemplates.setChatOpenTool.trim(),
  updateRecord: promptTemplates.updateRecordTool.trim(),
} as const
