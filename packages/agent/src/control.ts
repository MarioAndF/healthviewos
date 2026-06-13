export const healthViewPageIds = ["health", "services", "records", "billing", "settings"] as const

export type HealthViewPageId = (typeof healthViewPageIds)[number]

export type HealthViewControlCommand =
  | { pageId: HealthViewPageId; type: "ui/openPage" }
  | { open: boolean; type: "ui/setChatOpen" }

export type HealthViewControlResponse =
  | { message: string; ok: true }
  | { error: string; ok: false }

export type HealthViewControlClient = {
  executeCommand(command: HealthViewControlCommand): Promise<HealthViewControlResponse>
}
