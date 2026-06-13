import { exampleWorkspaceSeed } from "@healthviewos/data"
import { HealthViewWorkspaceSchema, type HealthViewWorkspace } from "@healthviewos/schema"
import Dexie, { type Table } from "dexie"

export const BROWSER_VAULT_DB_NAME = "healthviewos_browser_vault"
export const CURRENT_BROWSER_VAULT_VERSION = 1
export const DEFAULT_WORKSPACE_ID = "default"

export type LoadWorkspaceOptions = {
  seedIfMissing?: boolean
}

export type BrowserVaultMetadata = {
  id: string
  updatedAt: string
  value: unknown
}

export type BrowserVaultSnapshot = {
  id: typeof DEFAULT_WORKSPACE_ID
  savedAt: string
  schemaVersion: number
  workspace: HealthViewWorkspace
}

type WorkspaceRow = BrowserVaultSnapshot
type MetadataRow = BrowserVaultMetadata

class HealthViewBrowserVaultDatabase extends Dexie {
  metadata!: Table<MetadataRow, string>
  workspaces!: Table<WorkspaceRow, string>

  constructor(databaseName = BROWSER_VAULT_DB_NAME) {
    super(databaseName)

    this.version(CURRENT_BROWSER_VAULT_VERSION).stores({
      metadata: "id, updatedAt",
      workspaces: "id, savedAt, schemaVersion",
    })
  }
}

const db = new HealthViewBrowserVaultDatabase()

function nowIso() {
  return new Date().toISOString()
}

function parseWorkspace(input: unknown): HealthViewWorkspace {
  return HealthViewWorkspaceSchema.parse(input)
}

function seedWorkspace(): HealthViewWorkspace {
  return parseWorkspace(exampleWorkspaceSeed)
}

export async function loadWorkspace(options: LoadWorkspaceOptions = {}): Promise<HealthViewWorkspace> {
  const { seedIfMissing = true } = options
  const row = await db.workspaces.get(DEFAULT_WORKSPACE_ID)

  if (row) {
    return parseWorkspace(row.workspace)
  }

  if (!seedIfMissing) {
    throw new Error("No browser-local HealthView workspace has been created.")
  }

  return resetWorkspaceToSeed()
}

export async function saveWorkspace(workspace: HealthViewWorkspace): Promise<HealthViewWorkspace> {
  const parsedWorkspace = parseWorkspace(workspace)
  const savedAt = nowIso()

  await db.transaction("rw", db.workspaces, db.metadata, async () => {
    await db.workspaces.put({
      id: DEFAULT_WORKSPACE_ID,
      savedAt,
      schemaVersion: parsedWorkspace.schemaVersion,
      workspace: parsedWorkspace,
    })
    await db.metadata.put({
      id: "workspace_saved_at",
      updatedAt: savedAt,
      value: savedAt,
    })
  })

  return parsedWorkspace
}

export async function resetWorkspaceToSeed(): Promise<HealthViewWorkspace> {
  return saveWorkspace(seedWorkspace())
}

export async function exportWorkspaceJson(): Promise<string> {
  const workspace = await loadWorkspace()
  return JSON.stringify(workspace, null, 2)
}

export async function importWorkspaceJson(json: string): Promise<HealthViewWorkspace> {
  let parsedJson: unknown

  try {
    parsedJson = JSON.parse(json)
  } catch (error) {
    throw new Error("Workspace import must be valid JSON.", { cause: error })
  }

  return saveWorkspace(parseWorkspace(parsedJson))
}

export async function clearBrowserVault(): Promise<void> {
  await db.transaction("rw", db.workspaces, db.metadata, async () => {
    await db.workspaces.clear()
    await db.metadata.clear()
  })
}
