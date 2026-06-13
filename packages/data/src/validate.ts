import {
  EvidenceBackedClaimSchema,
  HealthMapSignalSchema,
  HealthViewWorkspaceSchema,
  VisualVitalMetricSchema,
  WarningSignSchema,
} from "@healthviewos/schema"

import {
  exampleWorkspaceSeed,
  sampleSystemRows,
  sampleSystemStatus,
  sampleVitals,
  sampleWarningSigns,
} from "./index"

const workspace = HealthViewWorkspaceSchema.parse(exampleWorkspaceSeed)

sampleVitals.forEach((item) => VisualVitalMetricSchema.parse(item))
sampleWarningSigns.forEach((item) => WarningSignSchema.parse(item))
sampleSystemRows.forEach((item) => HealthMapSignalSchema.parse(item))
EvidenceBackedClaimSchema.parse(sampleSystemStatus)

const artifactIds = new Set(workspace.recordSet.artifacts.map((item) => item.id))
const documentIds = new Set(workspace.recordSet.documents.map((item) => item.id))
const provenanceIds = new Set(workspace.recordSet.provenanceEvents.map((item) => item.id))

function assertEvidenceChain(label: string, evidence: Array<{
  artifactId?: string
  documentId?: string
  provenanceEventId?: string
  sourceArtifactId?: string
}>) {
  for (const link of evidence) {
    const artifactId = link.artifactId ?? link.sourceArtifactId
    if (artifactId && !artifactIds.has(artifactId)) {
      throw new Error(`${label} references missing artifact ${artifactId}`)
    }
    if (link.documentId && !documentIds.has(link.documentId)) {
      throw new Error(`${label} references missing document ${link.documentId}`)
    }
    if (link.provenanceEventId && !provenanceIds.has(link.provenanceEventId)) {
      throw new Error(`${label} references missing provenance event ${link.provenanceEventId}`)
    }
  }
}

const recordSet = workspace.recordSet

recordSet.healthRecords.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.people.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.observations.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.conditions.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.healthHistoryItems.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.allergyIntolerances.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.medicationUses.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.medicationOrders.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.medicationDispenses.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.encounters.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.immunizations.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.diagnosticReports.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.providers.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.organizations.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.locations.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.coverages.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.claims.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.bills.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.payments.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.authorizations.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.derivedSummaries.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.derivedTimelineEvents.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.derivedInsights.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.visualVitals.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.warningSigns.forEach((item) => assertEvidenceChain(item.id, item.evidence))
recordSet.healthMapSignals.forEach((item) => assertEvidenceChain(item.id, item.evidence))
workspace.serviceItems.forEach((item) => assertEvidenceChain(item.id, item.evidence))
workspace.billingItems.forEach((item) => assertEvidenceChain(item.id, item.evidence))

console.log("Validated @healthviewos/data sample workspace")
