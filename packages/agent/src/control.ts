export const healthViewPageIds = ["health", "services", "records", "billing", "settings"] as const

export type HealthViewPageId = (typeof healthViewPageIds)[number]

export type HealthViewRecordsLocation = {
  categoryId?: string | null
  historySectionId?: string | null
  page: "records"
  pageIndex?: number | null
  recordId?: string | null
  sourceId?: string | null
}

export type HealthViewAppLocation =
  | { page: Exclude<HealthViewPageId, "records"> }
  | HealthViewRecordsLocation

export type HealthViewUiActionRisk = "navigation" | "read"

export type HealthViewUiActionSummary = {
  description?: string
  id: string
  kind: string
  label: string
  risk: HealthViewUiActionRisk
}

export type HealthViewUiSearchResult = HealthViewUiActionSummary & {
  actionId: string
  score: number
}

export type HealthViewControlCommand =
  | { pageId: HealthViewPageId; type: "ui/openPage" }
  | { location: HealthViewAppLocation; type: "ui/navigate" }
  | { actionId: string; type: "ui/runAction" }
  | { limit?: number; query: string; type: "ui/search" }
  | { open: boolean; type: "ui/setChatOpen" }

export type HealthViewControlResponse =
  | { message: string; modelOutput?: unknown; ok: true }
  | { error: string; ok: false }

export type HealthViewControlClient = {
  executeCommand(command: HealthViewControlCommand): Promise<HealthViewControlResponse>
}
