import {
  healthViewPageIds,
  parseHealthViewControlCommand,
  parseHealthViewControlCommands,
  type HealthViewAppLocation,
  type HealthViewControlCommand,
  type HealthViewControlResponse,
  type HealthViewUiSearchResult,
} from "@healthviewos/agent/control"
import type { MainDestinationId } from "@healthviewos/app-model"
import type { HealthViewWorkspace } from "@healthviewos/schema"
import {
  buildWorkspaceViewModels,
  createManualRecordFromFieldsInWorkspace,
  getWorkspaceRecordSummary,
  searchWorkspaceRecords,
  updateManualRecordFieldsInWorkspace,
  type HealthViewWorkspaceClient,
  type WorkspaceViewModels,
} from "@healthviewos/workspace"
import { createStore, type StoreApi } from "zustand/vanilla"

export type HealthViewNavigationState = {
  activePage: MainDestinationId
  location: HealthViewAppLocation
}

export type HealthViewAssistantUiContext = {
  activePage: MainDestinationId
  chatOpen: boolean
  location: HealthViewAppLocation
}

export type HealthViewAppState<TVaultInfo = unknown> = HealthViewNavigationState & {
  assistantOpen: boolean
  error: string | null
  loading: boolean
  vaultInfo: TVaultInfo | null
  views: WorkspaceViewModels | null
  workspace: HealthViewWorkspace | null
  actions: HealthViewAppActions<TVaultInfo>
}

export type HealthViewAppActions<TVaultInfo = unknown> = {
  exportWorkspaceJson: () => Promise<string>
  importWorkspaceJson: (json: string) => Promise<HealthViewWorkspace>
  initializeWorkspace: () => Promise<void>
  navigate: (location: HealthViewAppLocation) => void
  reloadWorkspace: () => Promise<void>
  resetWorkspace: () => Promise<HealthViewWorkspace | null>
  saveWorkspace: (workspace: HealthViewWorkspace) => Promise<HealthViewWorkspace | null>
  setAssistantOpen: (open: boolean) => void
  setVaultInfo: (vaultInfo: TVaultInfo | null) => void
}

export type HealthViewAppStore<TVaultInfo = unknown> = Pick<
  StoreApi<HealthViewAppState<TVaultInfo>>,
  "getState" | "subscribe"
>

export type CreateHealthViewAppStoreInput<TVaultInfo = unknown> = {
  loadVaultInfo?: () => Promise<TVaultInfo | null>
  workspaceClient: HealthViewWorkspaceClient
}

function stateForWorkspace(workspace: HealthViewWorkspace | null) {
  return {
    views: buildWorkspaceViewModels(workspace),
    workspace,
  }
}

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function createHealthViewAppStore<TVaultInfo = unknown>({
  loadVaultInfo,
  workspaceClient,
}: CreateHealthViewAppStoreInput<TVaultInfo>): HealthViewAppStore<TVaultInfo> {
  const store = createStore<HealthViewAppState<TVaultInfo>>((set, get) => {
    const reloadWorkspace = async () => {
      set({ error: null, loading: true })
      try {
        const [workspace, vaultInfo] = await Promise.all([
          workspaceClient.loadWorkspace(),
          loadVaultInfo ? loadVaultInfo() : Promise.resolve(null),
        ])
        set({
          ...stateForWorkspace(workspace),
          error: null,
          loading: false,
          vaultInfo,
        })
      } catch (error) {
        set({
          error: messageFromError(error, "Unable to load HealthView OS workspace."),
          loading: false,
        })
      }
    }

    const actions: HealthViewAppActions<TVaultInfo> = {
      async exportWorkspaceJson() {
        return workspaceClient.exportWorkspaceJson()
      },
      async importWorkspaceJson(json) {
        set({ error: null })
        try {
          const workspace = await workspaceClient.importWorkspaceJson(json)
          set(stateForWorkspace(workspace))
          return workspace
        } catch (error) {
          set({ error: messageFromError(error, "Unable to import workspace.") })
          throw error
        }
      },
      initializeWorkspace: reloadWorkspace,
      navigate(location) {
        set({ activePage: location.page, location })
      },
      reloadWorkspace,
      async resetWorkspace() {
        set({ error: null })
        try {
          const workspace = await workspaceClient.resetWorkspace()
          set(stateForWorkspace(workspace))
          return workspace
        } catch (error) {
          set({ error: messageFromError(error, "Unable to reset workspace.") })
          return null
        }
      },
      async saveWorkspace(workspace) {
        set({ error: null })
        try {
          const savedWorkspace = await workspaceClient.saveWorkspace(workspace)
          set(stateForWorkspace(savedWorkspace))
          return savedWorkspace
        } catch (error) {
          set({ error: messageFromError(error, "Unable to save workspace.") })
          return null
        }
      },
      setAssistantOpen(open) {
        set({ assistantOpen: open })
      },
      setVaultInfo(vaultInfo) {
        set({ vaultInfo })
      },
    }

    return {
      activePage: "health",
      assistantOpen: false,
      error: null,
      loading: false,
      location: { page: "health" },
      vaultInfo: null,
      views: null,
      workspace: null,
      actions,
    }
  })

  return store
}

export function selectAssistantUiContext<TVaultInfo>(state: HealthViewAppState<TVaultInfo>): HealthViewAssistantUiContext {
  return {
    activePage: state.activePage,
    chatOpen: state.assistantOpen,
    location: state.location,
  }
}

export function selectHealthViewControlStateSummary<TVaultInfo>(state: HealthViewAppState<TVaultInfo>) {
  return {
    activePage: state.activePage,
    assistantOpen: state.assistantOpen,
    location: state.location,
    workspaceLoaded: Boolean(state.workspace),
  }
}

export function previewHealthViewAppControlCommand<TVaultInfo>(
  store: HealthViewAppStore<TVaultInfo>,
  command: unknown,
): HealthViewControlResponse {
  const parsed = parseHealthViewControlCommand(command)
  const state = selectHealthViewControlStateSummary(store.getState())
  return {
    message: `Prepared ${parsed.type}.`,
    modelOutput: { state },
    ok: true,
  }
}

export function previewHealthViewAppControlCommands<TVaultInfo>(
  store: HealthViewAppStore<TVaultInfo>,
  commands: unknown,
): HealthViewControlResponse {
  const parsed = parseHealthViewControlCommands(commands)
  if (!parsed.length) {
    return { error: "At least one HealthView OS control command is required.", ok: false }
  }

  const state = selectHealthViewControlStateSummary(store.getState())
  return {
    message: parsed.length === 1 ? `Prepared ${parsed[0]?.type}.` : `Prepared ${parsed.length} HealthView OS control commands.`,
    modelOutput: { state },
    ok: true,
  }
}

export async function executeHealthViewAppControlCommand<TVaultInfo>(
  store: HealthViewAppStore<TVaultInfo>,
  command: unknown,
): Promise<HealthViewControlResponse> {
  const parsed = parseHealthViewControlCommand(command)
  const { actions, workspace } = store.getState()

  if (parsed.type === "ui/openPage") {
    actions.navigate({ page: parsed.pageId })
  } else if (parsed.type === "ui/navigate") {
    actions.navigate(parsed.location)
  } else if (parsed.type === "ui/setChatOpen") {
    actions.setAssistantOpen(parsed.open)
  } else if (parsed.type === "ui/search") {
    return searchResponse(store, parsed.query, parsed.limit)
  } else if (parsed.type === "records/search") {
    const results = searchWorkspaceRecords(workspace, parsed)
    return {
      message: results.length ? `Found ${results.length} matching records.` : "No matching records found.",
      modelOutput: {
        query: parsed.query ?? "",
        results,
        state: selectHealthViewControlStateSummary(store.getState()),
      },
      ok: true,
    }
  } else if (parsed.type === "records/get") {
    const record = getWorkspaceRecordSummary(workspace, parsed.recordId)
    return record
      ? {
          message: `Loaded ${record.title}.`,
          modelOutput: {
            record,
            state: selectHealthViewControlStateSummary(store.getState()),
          },
          ok: true,
        }
      : { error: `Record not found: ${parsed.recordId}`, ok: false }
  } else if (parsed.type === "records/create") {
    if (!workspace) return { error: "Workspace is not loaded.", ok: false }
    const existingIds = new Set(workspace.recordSet.healthRecords.map((record) => record.id))
    const nextWorkspace = createManualRecordFromFieldsInWorkspace(workspace, parsed)
    const savedWorkspace = await actions.saveWorkspace(nextWorkspace)
    if (!savedWorkspace) return { error: "Unable to save record.", ok: false }
    const createdRecord = savedWorkspace.recordSet.healthRecords.find((record) => !existingIds.has(record.id))
    const record = createdRecord ? getWorkspaceRecordSummary(savedWorkspace, createdRecord.id) : null
    if (record?.categoryId) {
      actions.navigate({ categoryId: record.categoryId, page: "records", recordId: record.id })
    }
    return {
      message: record ? `Created ${record.title}.` : "Created record.",
      modelOutput: {
        record,
        state: selectHealthViewControlStateSummary(store.getState()),
      },
      ok: true,
    }
  } else if (parsed.type === "records/update") {
    if (!workspace) return { error: "Workspace is not loaded.", ok: false }
    const nextWorkspace = updateManualRecordFieldsInWorkspace(workspace, parsed)
    const savedWorkspace = await actions.saveWorkspace(nextWorkspace)
    if (!savedWorkspace) return { error: "Unable to save record.", ok: false }
    const record = getWorkspaceRecordSummary(savedWorkspace, parsed.recordId)
    if (record?.categoryId) {
      actions.navigate({ categoryId: record.categoryId, page: "records", recordId: record.id })
    }
    return {
      message: record ? `Updated ${record.title}.` : "Updated record.",
      modelOutput: {
        record,
        state: selectHealthViewControlStateSummary(store.getState()),
      },
      ok: true,
    }
  } else if (parsed.type === "services/search") {
    return serviceSearchResponse(store, parsed)
  } else if (parsed.type === "services/selectResult") {
    actions.navigate({
      page: "services",
      selectedResultId: parsed.resultId,
    })
  } else if (parsed.type === "ui/runAction") {
    return { error: `Unknown UI action: ${parsed.actionId}`, ok: false }
  }

  const state = selectHealthViewControlStateSummary(store.getState())
  return {
    message: summarizeControlCommand(parsed),
    modelOutput: { state },
    ok: true,
  }
}

export async function executeHealthViewAppControlCommands<TVaultInfo>(
  store: HealthViewAppStore<TVaultInfo>,
  commands: unknown,
): Promise<HealthViewControlResponse> {
  const parsed = parseHealthViewControlCommands(commands)
  if (!parsed.length) {
    return { error: "At least one HealthView OS control command is required.", ok: false }
  }

  let response: HealthViewControlResponse = {
    message: "No command executed.",
    ok: true,
  }
  for (const command of parsed) {
    response = await executeHealthViewAppControlCommand(store, command)
    if (!response.ok) return response
  }

  return response
}

function serviceSearchResponse<TVaultInfo>(
  store: HealthViewAppStore<TVaultInfo>,
  command: Extract<HealthViewControlCommand, { type: "services/search" }>,
): HealthViewControlResponse {
  const { actions, views } = store.getState()
  const query = command.query?.trim() ?? ""
  const normalizedQuery = query.toLowerCase()
  const limit = command.limit ?? 8
  const rows = views?.services.rows ?? []
  const selectedRows = normalizedQuery
    ? rows.filter((row) =>
        [row.title, row.subtitle, row.detail, row.meta]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : rows
  const results = selectedRows.slice(0, limit).map((row, index) => ({
    actionId: `select_service_${row.id}`,
    description: row.subtitle ?? row.detail,
    id: row.id,
    kind: "service",
    label: row.title,
    risk: "navigation" as const,
    score: 1 - index * 0.05,
  }))
  const location: HealthViewAppLocation = {
    page: "services",
    query,
    selectedResultId: null,
    tabId: command.tabId ?? null,
  }

  actions.navigate(location)

  return {
    message: results.length ? `Found ${results.length} services.` : "No matching services found.",
    modelOutput: {
      location,
      query,
      results,
      state: selectHealthViewControlStateSummary(store.getState()),
      tabId: command.tabId ?? null,
    },
    ok: true,
  }
}

function searchResponse<TVaultInfo>(
  store: HealthViewAppStore<TVaultInfo>,
  query: string,
  limit = 6,
): HealthViewControlResponse {
  const normalizedQuery = query.trim().toLowerCase()
  const results: HealthViewUiSearchResult[] = healthViewPageIds
    .filter((page) => page.includes(normalizedQuery) || normalizedQuery.includes(page))
    .slice(0, limit)
    .map((page, index) => ({
      actionId: `open_${page}`,
      description: `Open ${page}.`,
      id: `search_${page}`,
      kind: "navigation",
      label: `Open ${page}`,
      risk: "navigation",
      score: 1 - index * 0.05,
    }))

  return {
    message: results.length ? `Found ${results.length} matching actions.` : "No matching actions found.",
    modelOutput: {
      query,
      results,
      state: selectHealthViewControlStateSummary(store.getState()),
    },
    ok: true,
  }
}

function summarizeControlCommand(command: HealthViewControlCommand) {
  switch (command.type) {
    case "atlas/control":
      return `Updated atlas view.`
    case "atlas/searchTargets":
      return `Searched atlas targets for ${command.query}.`
    case "services/search":
      return command.query ? `Searched services for ${command.query}.` : "Opened services."
    case "services/selectResult":
      return `Opened service ${command.resultId}.`
    case "records/search":
      return command.query ? `Searched records for ${command.query}.` : "Searched records."
    case "records/get":
      return `Loaded record ${command.recordId}.`
    case "records/create":
      return `Created ${command.categoryId} record.`
    case "records/update":
      return `Updated record ${command.recordId}.`
    case "ui/openPage":
      return `Opened ${command.pageId}.`
    case "ui/navigate":
      return `Opened ${command.location.page}.`
    case "ui/runAction":
      return `Ran ${command.actionId}.`
    case "ui/search":
      return `Searched for ${command.query}.`
    case "ui/setChatOpen":
      return command.open ? "Opened chat." : "Closed chat."
  }
}
