import {
  sampleSystemRows,
  sampleSystemStatus,
  sampleUpcomingCare,
  sampleVitals,
  sampleWarningSigns,
} from "@healthviewos/data"
import type {
  EvidenceBackedClaim,
  HealthMapSignal,
  HealthViewWorkspace,
  VisualVitalMetric,
  WarningSign,
} from "@healthviewos/schema"

export type SystemStatusRow = {
  label: string
  value: string
}

export type UpcomingCareItem = {
  detail: string
  title: string
}

export function selectVitals(workspace: HealthViewWorkspace | null): VisualVitalMetric[] {
  return workspace?.recordSet.visualVitals.length ? workspace.recordSet.visualVitals : sampleVitals
}

export function selectWarningSigns(workspace: HealthViewWorkspace | null): WarningSign[] {
  return workspace?.recordSet.warningSigns.length ? workspace.recordSet.warningSigns : sampleWarningSigns
}

export function selectSystemRows(workspace: HealthViewWorkspace | null): HealthMapSignal[] {
  return workspace?.recordSet.healthMapSignals.length ? workspace.recordSet.healthMapSignals : sampleSystemRows
}

export function selectSystemReadiness(workspace: HealthViewWorkspace | null): number {
  const rows = selectSystemRows(workspace)
  const total = rows.reduce((sum, row) => sum + row.score, 0)

  return rows.length ? Math.round(total / rows.length) : 82
}

export function selectSystemStatus(workspace: HealthViewWorkspace | null): EvidenceBackedClaim {
  const rows = selectSystemRows(workspace)
  const evidence = rows.flatMap((row) => row.evidence).slice(0, 3)

  if (!workspace || !evidence.length) {
    return sampleSystemStatus
  }

  const readiness = selectSystemReadiness(workspace)
  const latestUpdate =
    rows
      .map((row) => row.lastUpdatedAt)
      .sort()
      .at(-1) ?? sampleSystemStatus.lastUpdatedAt

  return {
    ...sampleSystemStatus,
    confidence: readiness >= 75 ? "high" : readiness >= 50 ? "medium" : "low",
    description: `${rows.length} body-system signals are loaded from the browser-local workspace.`,
    evidence,
    freshness: rows.some((row) => row.freshness === "stale") ? "stale" : "current",
    generatedAt: latestUpdate,
    lastUpdatedAt: latestUpdate,
    title: "System status",
  }
}

export function selectSystemStatusRows(workspace: HealthViewWorkspace | null): SystemStatusRow[] {
  if (!workspace) {
    return [
      { label: "Connected sources", value: "6" },
      { label: "Latest sync", value: "11 min ago" },
      { label: "Unreviewed signals", value: "3" },
      { label: "Evidence coverage", value: "74%" },
    ]
  }

  return [
    { label: "Connected sources", value: String(workspace.recordSet.origins.length) },
    { label: "Latest sync", value: latestAcquisitionLabel(workspace) },
    { label: "Unreviewed signals", value: String(workspace.recordSet.warningSigns.length) },
    { label: "Evidence coverage", value: `${evidenceCoveragePercent(workspace)}%` },
  ]
}

export function selectUpcomingCare(workspace: HealthViewWorkspace | null): UpcomingCareItem[] {
  if (!workspace) {
    return sampleUpcomingCare
  }

  const encounters = workspace.recordSet.encounters
    .filter((encounter) => encounter.status === "planned")
    .map((encounter) => ({
      detail: [formatDateLabel(encounter.date), encounter.providerText].filter(Boolean).join(" - "),
      title: encounter.title,
    }))

  const authorizations = workspace.recordSet.authorizations
    .filter((authorization) => authorization.status === "approved" || authorization.status === "pending")
    .map((authorization) => ({
      detail: [authorization.status, authorization.expirationDate ? `expires ${formatDateLabel(authorization.expirationDate)}` : ""]
        .filter(Boolean)
        .join(" - "),
      title: authorization.title,
    }))

  const medicationOrders = workspace.recordSet.medicationOrders
    .filter((order) => order.status === "active")
    .map((order) => ({
      detail: [order.quantityText, order.prescriberText].filter(Boolean).join(" - "),
      title: `${order.medication.text} order`,
    }))

  const careItems = [...encounters, ...authorizations, ...medicationOrders].filter((item) => item.detail)

  return careItems.length ? careItems.slice(0, 3) : sampleUpcomingCare
}

export function selectWorkspaceSummary(workspace: HealthViewWorkspace | null): SystemStatusRow[] {
  if (!workspace) {
    return [
      { label: "Vault", value: "Opening" },
      { label: "Storage", value: "Browser-local IndexedDB" },
      { label: "Schema", value: "HealthViewWorkspace" },
    ]
  }

  const activePerson = workspace.recordSet.people.find((person) => person.id === workspace.settings.activePersonId)

  return [
    { label: "Vault", value: workspace.vault.label },
    { label: "Active person", value: activePerson?.displayName ?? "Not selected" },
    { label: "Artifacts", value: String(workspace.recordSet.artifacts.length) },
    { label: "Canonical records", value: String(canonicalRecordCount(workspace)) },
    { label: "Storage", value: "Browser-local IndexedDB" },
  ]
}

function canonicalRecordCount(workspace: HealthViewWorkspace) {
  const recordSet = workspace.recordSet

  return (
    recordSet.people.length +
    recordSet.observations.length +
    recordSet.conditions.length +
    recordSet.healthHistoryItems.length +
    recordSet.allergyIntolerances.length +
    recordSet.medicationUses.length +
    recordSet.medicationOrders.length +
    recordSet.medicationDispenses.length +
    recordSet.encounters.length +
    recordSet.immunizations.length +
    recordSet.diagnosticReports.length +
    recordSet.providers.length +
    recordSet.organizations.length +
    recordSet.locations.length +
    recordSet.coverages.length +
    recordSet.claims.length +
    recordSet.bills.length +
    recordSet.payments.length +
    recordSet.authorizations.length
  )
}

function evidenceCoveragePercent(workspace: HealthViewWorkspace) {
  const recordSet = workspace.recordSet
  const evidenceBearingRecords = [
    ...recordSet.people,
    ...recordSet.observations,
    ...recordSet.conditions,
    ...recordSet.healthHistoryItems,
    ...recordSet.allergyIntolerances,
    ...recordSet.medicationUses,
    ...recordSet.medicationOrders,
    ...recordSet.medicationDispenses,
    ...recordSet.encounters,
    ...recordSet.immunizations,
    ...recordSet.diagnosticReports,
    ...recordSet.providers,
    ...recordSet.organizations,
    ...recordSet.locations,
    ...recordSet.coverages,
    ...recordSet.claims,
    ...recordSet.bills,
    ...recordSet.payments,
    ...recordSet.authorizations,
    ...recordSet.derivedSummaries,
    ...recordSet.derivedTimelineEvents,
    ...recordSet.derivedInsights,
    ...recordSet.visualVitals,
    ...recordSet.warningSigns,
    ...recordSet.healthMapSignals,
  ]

  if (!evidenceBearingRecords.length) {
    return 0
  }

  const recordsWithEvidence = evidenceBearingRecords.filter((record) => record.evidence.length > 0)
  return Math.round((recordsWithEvidence.length / evidenceBearingRecords.length) * 100)
}

function latestAcquisitionLabel(workspace: HealthViewWorkspace) {
  const latestAcquiredAt = workspace.recordSet.acquisitions
    .map((acquisition) => acquisition.acquiredAt)
    .sort()
    .at(-1)

  return latestAcquiredAt ? formatDateLabel(latestAcquiredAt) : "Not synced"
}

function formatDateLabel(value: string | undefined) {
  if (!value) {
    return ""
  }

  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`)

  if (Number.isNaN(date.valueOf())) {
    return value
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(date)
}
