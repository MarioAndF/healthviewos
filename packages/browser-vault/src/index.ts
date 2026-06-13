import { comparisonPatientIds, exampleWorkspaceSeed } from "@healthviewos/data"
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

function mergeById<T extends { id: string }>(existing: T[], additions: T[]) {
  const existingIds = new Set(existing.map((item) => item.id))
  const missing = additions.filter((item) => !existingIds.has(item.id))

  return missing.length ? [...existing, ...missing] : existing
}

function comparisonSeedUpgrade(workspace: HealthViewWorkspace): HealthViewWorkspace {
  const comparisonIds = new Set(comparisonPatientIds)

  if (comparisonPatientIds.every((id) => workspace.recordSet.people.some((person) => person.id === id))) {
    return workspace
  }

  const seed = seedWorkspace()
  const isComparisonSubject = (item: { subjectPersonId?: string }) =>
    Boolean(item.subjectPersonId && comparisonIds.has(item.subjectPersonId))

  const comparisonDocuments = seed.recordSet.documents.filter((document) =>
    document.subjectPersonIds.some((id) => comparisonIds.has(id)),
  )
  const comparisonArtifactIds = new Set(comparisonDocuments.map((document) => document.artifactId))
  const comparisonDocumentIds = new Set(comparisonDocuments.map((document) => document.id))
  const comparisonArtifacts = seed.recordSet.artifacts.filter((artifact) => comparisonArtifactIds.has(artifact.id))
  const comparisonAcquisitionIds = new Set(comparisonArtifacts.map((artifact) => artifact.acquisitionEventId))
  const comparisonFileIds = new Set(comparisonArtifacts.flatMap((artifact) => artifact.fileIds))
  const comparisonOutputIds = new Set(seed.recordSet.healthRecords.filter(isComparisonSubject).map((record) => record.id))
  const comparisonProvenanceEvents = seed.recordSet.provenanceEvents.filter(
    (event) =>
      event.inputIds.some((id) => comparisonDocumentIds.has(id)) ||
      event.outputIds.some((id) => comparisonOutputIds.has(id)),
  )

  return parseWorkspace({
    ...workspace,
    recordSet: {
      ...workspace.recordSet,
      healthRecords: mergeById(workspace.recordSet.healthRecords, seed.recordSet.healthRecords.filter(isComparisonSubject)),
      people: mergeById(
        workspace.recordSet.people,
        seed.recordSet.people.filter((person) => comparisonIds.has(person.id)),
      ),
      acquisitions: mergeById(
        workspace.recordSet.acquisitions,
        seed.recordSet.acquisitions.filter((acquisition) => comparisonAcquisitionIds.has(acquisition.id)),
      ),
      files: mergeById(
        workspace.recordSet.files,
        seed.recordSet.files.filter((file) => comparisonFileIds.has(file.id)),
      ),
      artifacts: mergeById(workspace.recordSet.artifacts, comparisonArtifacts),
      documents: mergeById(workspace.recordSet.documents, comparisonDocuments),
      provenanceEvents: mergeById(workspace.recordSet.provenanceEvents, comparisonProvenanceEvents),
      observations: mergeById(workspace.recordSet.observations, seed.recordSet.observations.filter(isComparisonSubject)),
      medicationOrders: mergeById(
        workspace.recordSet.medicationOrders,
        seed.recordSet.medicationOrders.filter(isComparisonSubject),
      ),
      encounters: mergeById(workspace.recordSet.encounters, seed.recordSet.encounters.filter(isComparisonSubject)),
      authorizations: mergeById(
        workspace.recordSet.authorizations,
        seed.recordSet.authorizations.filter(isComparisonSubject),
      ),
      warningSigns: mergeById(workspace.recordSet.warningSigns, seed.recordSet.warningSigns.filter(isComparisonSubject)),
      healthMapSignals: mergeById(
        workspace.recordSet.healthMapSignals,
        seed.recordSet.healthMapSignals.filter(isComparisonSubject),
      ),
      visualVitals: mergeById(
        workspace.recordSet.visualVitals,
        seed.recordSet.visualVitals.filter((vital) =>
          vital.evidence.some((summary) =>
            summary.sourceArtifactId ? comparisonArtifactIds.has(summary.sourceArtifactId) : false,
          ),
        ),
      ),
    },
    serviceItems: mergeById(workspace.serviceItems, seed.serviceItems.filter(isComparisonSubject)),
    billingItems: mergeById(workspace.billingItems, seed.billingItems.filter(isComparisonSubject)),
  })
}

export async function loadWorkspace(options: LoadWorkspaceOptions = {}): Promise<HealthViewWorkspace> {
  const { seedIfMissing = true } = options
  const row = await db.workspaces.get(DEFAULT_WORKSPACE_ID)

  if (row) {
    const parsedWorkspace = parseWorkspace(row.workspace)
    const workspace = comparisonSeedUpgrade(parsedWorkspace)
    if (workspace !== parsedWorkspace) {
      await saveWorkspace(workspace)
    }
    return workspace
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
