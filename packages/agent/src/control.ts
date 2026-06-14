import { z } from "zod"

export const healthViewPageIds = ["health", "services", "records", "billing", "settings"] as const
export const healthViewRecordCategoryIds = [
  "demographics",
  "medications",
  "history",
  "allergies",
  "visits",
  "labs",
  "immunizations",
  "diagnostic_reports",
  "imaging",
  "pathology",
  "other",
] as const
export const healthViewHistorySectionIds = ["medical", "surgical", "family", "social", "reproductive", "other"] as const

export type HealthViewPageId = (typeof healthViewPageIds)[number]
export type HealthViewRecordCategoryId = (typeof healthViewRecordCategoryIds)[number]
export type HealthViewHistorySectionId = (typeof healthViewHistorySectionIds)[number]

export const healthViewAtlasSystemIds = [
  "skin",
  "skeletal",
  "joints",
  "muscular",
  "cardiovascular",
  "nervous",
  "respiratory",
  "digestive",
  "urinary",
  "endocrine",
  "reproductive",
  "smplx-female",
  "smplx-male",
] as const

export const healthViewAtlasTargetTypes = ["system", "organ", "smplx_region"] as const
export const healthViewAtlasZoomLevels = ["default", "medium", "close"] as const
export const healthViewAtlasControlActions = ["show_system", "focus", "reset", "orbit"] as const

export type HealthViewAtlasSystemId = (typeof healthViewAtlasSystemIds)[number]
export type HealthViewAtlasTargetType = (typeof healthViewAtlasTargetTypes)[number]
export type HealthViewAtlasZoomLevel = (typeof healthViewAtlasZoomLevels)[number]
export type HealthViewAtlasControlAction = (typeof healthViewAtlasControlActions)[number]

export type HealthViewAtlasControlInput = {
  action: HealthViewAtlasControlAction
  animate?: boolean
  objectIds?: string[]
  orbiting?: boolean
  regionIds?: string[]
  systemId?: HealthViewAtlasSystemId | null
  targetId?: string | null
  targetLabel?: string | null
  targetType?: HealthViewAtlasTargetType | null
  zoom?: HealthViewAtlasZoomLevel
}

export type HealthViewAtlasSearchTargetSummary = {
  focusable: boolean
  id: string
  label: string
  objectIds?: string[]
  regionIds?: string[]
  score: number
  systemId?: HealthViewAtlasSystemId | null
  targetType: HealthViewAtlasTargetType
}

export type HealthViewRecordsLocation = {
  categoryId?: string | null
  historySectionId?: string | null
  page: "records"
  pageIndex?: number | null
  recordId?: string | null
  sourceId?: string | null
}

export type HealthViewServicesLocation = {
  page: "services"
  query?: string | null
  selectedResultId?: string | null
  tabId?: string | null
}

export type HealthViewAppLocation =
  | { page: Exclude<HealthViewPageId, "records" | "services"> }
  | HealthViewServicesLocation
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

export type HealthViewRecordFields = Record<string, string>

export type HealthViewControlCommand =
  | ({ type: "atlas/control" } & HealthViewAtlasControlInput)
  | { limit?: number; query: string; targetType?: HealthViewAtlasTargetType; type: "atlas/searchTargets" }
  | { categoryId?: HealthViewRecordCategoryId; limit?: number; query?: string; type: "records/search" }
  | { recordId: string; type: "records/get" }
  | {
      categoryId: HealthViewRecordCategoryId
      fields: HealthViewRecordFields
      historySectionId?: HealthViewHistorySectionId | null
      type: "records/create"
    }
  | { fields: HealthViewRecordFields; recordId: string; type: "records/update" }
  | { limit?: number; query?: string; tabId?: string; type: "services/search" }
  | { resultId: string; type: "services/selectResult" }
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

const healthViewRecordsLocationSchema = z.object({
  categoryId: z.string().nullable().optional(),
  historySectionId: z.string().nullable().optional(),
  page: z.literal("records"),
  pageIndex: z.number().int().min(0).nullable().optional(),
  recordId: z.string().nullable().optional(),
  sourceId: z.string().nullable().optional(),
}) satisfies z.ZodType<HealthViewRecordsLocation>

const healthViewRecordFieldsSchema = z.record(z.string().min(1), z.string())

export const HealthViewAtlasControlInputSchema = z.object({
  action: z.enum(healthViewAtlasControlActions),
  animate: z.boolean().optional(),
  objectIds: z.array(z.string().min(1)).optional(),
  orbiting: z.boolean().optional(),
  regionIds: z.array(z.string().min(1)).optional(),
  systemId: z.enum(healthViewAtlasSystemIds).nullable().optional(),
  targetId: z.string().min(1).nullable().optional(),
  targetLabel: z.string().min(1).nullable().optional(),
  targetType: z.enum(healthViewAtlasTargetTypes).nullable().optional(),
  zoom: z.enum(healthViewAtlasZoomLevels).optional(),
}) satisfies z.ZodType<HealthViewAtlasControlInput>

export const HealthViewAppLocationSchema = z.union([
  z.object({
    page: z.enum(["health", "services", "billing", "settings"]),
  }),
  healthViewRecordsLocationSchema,
]) satisfies z.ZodType<HealthViewAppLocation>

export const HealthViewControlCommandSchema = z.discriminatedUnion("type", [
  HealthViewAtlasControlInputSchema.extend({
    type: z.literal("atlas/control"),
  }),
  z.object({
    limit: z.number().int().min(1).max(12).optional(),
    query: z.string().min(1),
    targetType: z.enum(healthViewAtlasTargetTypes).optional(),
    type: z.literal("atlas/searchTargets"),
  }),
  z.object({
    categoryId: z.enum(healthViewRecordCategoryIds).optional(),
    limit: z.number().int().min(1).max(20).optional(),
    query: z.string().optional(),
    type: z.literal("records/search"),
  }),
  z.object({
    recordId: z.string().min(1),
    type: z.literal("records/get"),
  }),
  z.object({
    categoryId: z.enum(healthViewRecordCategoryIds),
    fields: healthViewRecordFieldsSchema,
    historySectionId: z.enum(healthViewHistorySectionIds).nullable().optional(),
    type: z.literal("records/create"),
  }),
  z.object({
    fields: healthViewRecordFieldsSchema,
    recordId: z.string().min(1),
    type: z.literal("records/update"),
  }),
  z.object({
    limit: z.number().int().min(1).max(10).optional(),
    query: z.string().optional(),
    tabId: z.enum(["nearby", "providers", "facilities", "labs", "pharmacy", "online", "saved"]).optional(),
    type: z.literal("services/search"),
  }),
  z.object({
    resultId: z.string().min(1),
    type: z.literal("services/selectResult"),
  }),
  z.object({
    pageId: z.enum(healthViewPageIds),
    type: z.literal("ui/openPage"),
  }),
  z.object({
    location: HealthViewAppLocationSchema,
    type: z.literal("ui/navigate"),
  }),
  z.object({
    actionId: z.string().min(1),
    type: z.literal("ui/runAction"),
  }),
  z.object({
    limit: z.number().int().min(1).max(20).optional(),
    query: z.string().min(1),
    type: z.literal("ui/search"),
  }),
  z.object({
    open: z.boolean(),
    type: z.literal("ui/setChatOpen"),
  }),
]) satisfies z.ZodType<HealthViewControlCommand>

export const HealthViewControlCommandsSchema = z.union([
  HealthViewControlCommandSchema,
  z.array(HealthViewControlCommandSchema),
])

export type HealthViewControlStateSummary = {
  activePage: HealthViewPageId
  assistantOpen: boolean
  location: HealthViewAppLocation
  workspaceLoaded: boolean
}

export function parseHealthViewControlCommand(value: unknown): HealthViewControlCommand {
  return HealthViewControlCommandSchema.parse(value)
}

export function parseHealthViewControlCommands(value: unknown): HealthViewControlCommand[] {
  const parsed = HealthViewControlCommandsSchema.parse(value)
  return Array.isArray(parsed) ? parsed : [parsed]
}

export function safeParseHealthViewControlCommand(value: unknown) {
  return HealthViewControlCommandSchema.safeParse(value)
}

export function safeParseHealthViewControlCommands(value: unknown) {
  return HealthViewControlCommandsSchema.safeParse(value)
}
