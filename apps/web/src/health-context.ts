import type {
  CodeableConcept,
  HealthViewWorkspace,
  ObservationValue,
} from "@healthviewos/schema"
import type { HealthViewHealthContextReader } from "@healthviewos/agent/types"
import { useWorkspaceStore } from "@/store/workspace"

type CompactHealthContextItem = {
  date?: string
  detail?: string
  status?: string
  title: string
}

type BrowserHealthContextSummary = {
  activePerson?: string
  allergies?: CompactHealthContextItem[]
  conditions?: CompactHealthContextItem[]
  healthMapSignals?: CompactHealthContextItem[]
  limitations?: string[]
  medications?: CompactHealthContextItem[]
  observations?: CompactHealthContextItem[]
  recentEncounters?: CompactHealthContextItem[]
  recordCounts?: Record<string, number>
  status: "available" | "unavailable"
  summariesAndInsights?: CompactHealthContextItem[]
  vault?: string
  visualVitals?: CompactHealthContextItem[]
  warningSigns?: CompactHealthContextItem[]
}

const SECTION_LIMIT = 6

export function createBrowserHealthContextReader(): HealthViewHealthContextReader {
  return () => buildBrowserHealthContextSummary(useWorkspaceStore.getState().workspace)
}

export function buildBrowserHealthContextSummary(workspace: HealthViewWorkspace | null): BrowserHealthContextSummary {
  if (!workspace) {
    return {
      limitations: ["The browser-local workspace is not loaded."],
      status: "unavailable",
    }
  }

  const activePersonId = workspace.settings.activePersonId
  const activePerson = workspace.recordSet.people.find((person) => person.id === activePersonId)
  const isActivePersonRecord = (subjectPersonId?: string) => !activePersonId || subjectPersonId === activePersonId
  const recordSet = workspace.recordSet

  const activeConditions = recordSet.conditions
    .filter((condition) => isActivePersonRecord(condition.subjectPersonId))
    .filter((condition) => ["active", "recurrence", "relapse", "unknown"].includes(condition.clinicalStatus))
    .map((condition) => ({
      detail: conceptText(condition.code),
      status: condition.clinicalStatus,
      title: conceptText(condition.code),
    }))

  const activeAllergies = recordSet.allergyIntolerances
    .filter((allergy) => isActivePersonRecord(allergy.subjectPersonId))
    .filter((allergy) => ["active", "unknown"].includes(allergy.clinicalStatus))
    .map((allergy) => ({
      detail: [allergy.type, allergy.criticality].join(", "),
      status: allergy.clinicalStatus,
      title: conceptText(allergy.substance),
    }))

  const medications = recordSet.medicationUses
    .filter((medication) => isActivePersonRecord(medication.subjectPersonId))
    .filter((medication) => ["active", "intended", "on_hold", "unknown"].includes(medication.status))
    .map((medication) => ({
      date: medication.startDate,
      detail: [medication.doseText, medication.frequencyText, medication.routeText].filter(Boolean).join(", "),
      status: medication.status,
      title: conceptText(medication.medication),
    }))

  const medicationOrders = recordSet.medicationOrders
    .filter((order) => isActivePersonRecord(order.subjectPersonId))
    .filter((order) => ["active", "draft", "on_hold", "unknown"].includes(order.status))
    .map((order) => ({
      date: order.authoredDate,
      detail: [order.doseText, order.frequencyText, order.quantityText].filter(Boolean).join(", "),
      status: order.status,
      title: `${conceptText(order.medication)} order`,
    }))

  return {
    activePerson: activePerson?.displayName,
    allergies: activeAllergies.slice(0, SECTION_LIMIT),
    conditions: activeConditions.slice(0, SECTION_LIMIT),
    healthMapSignals: recordSet.healthMapSignals
      .filter((signal) => isActivePersonRecord(signal.subjectPersonId))
      .map((signal) => ({
        date: signal.lastUpdatedAt,
        detail: `${signal.label}: ${signal.value}; score ${signal.score}/100`,
        status: signal.freshness,
        title: signal.title,
      }))
      .slice(0, SECTION_LIMIT),
    limitations: [
      "Compact summary only; raw records, files, identifiers, contact details, and full evidence chains are excluded.",
      "This context is informational and does not diagnose, prescribe, or replace professional care.",
    ],
    medications: [...medications, ...medicationOrders]
      .sort((left, right) => compareByDateDesc(left.date, right.date))
      .slice(0, SECTION_LIMIT),
    observations: recordSet.observations
      .filter((observation) => isActivePersonRecord(observation.subjectPersonId))
      .filter((observation) => observation.category === "laboratory" || observation.category === "vital_sign" || observation.category === "wearable")
      .map((observation) => ({
        date: observation.effectiveDateTime ?? observation.effectiveDate ?? observation.effectivePeriod?.start,
        detail: observationValueText(observation.value) || observation.components.map((component) => `${conceptText(component.code)} ${observationValueText(component.value)}`).join("; "),
        status: observation.interpretation ?? observation.status,
        title: conceptText(observation.code),
      }))
      .sort((left, right) => compareByDateDesc(left.date, right.date))
      .slice(0, SECTION_LIMIT),
    recentEncounters: recordSet.encounters
      .filter((encounter) => isActivePersonRecord(encounter.subjectPersonId))
      .map((encounter) => ({
        date: encounter.date ?? encounter.period?.start,
        detail: [encounter.providerText, encounter.organizationText, encounter.reason ? conceptText(encounter.reason) : ""].filter(Boolean).join(", "),
        status: encounter.status,
        title: encounter.title,
      }))
      .sort((left, right) => compareByDateDesc(left.date, right.date))
      .slice(0, SECTION_LIMIT),
    recordCounts: {
      allergies: recordSet.allergyIntolerances.filter((item) => isActivePersonRecord(item.subjectPersonId)).length,
      conditions: recordSet.conditions.filter((item) => isActivePersonRecord(item.subjectPersonId)).length,
      encounters: recordSet.encounters.filter((item) => isActivePersonRecord(item.subjectPersonId)).length,
      healthMapSignals: recordSet.healthMapSignals.filter((item) => isActivePersonRecord(item.subjectPersonId)).length,
      medications: recordSet.medicationUses.filter((item) => isActivePersonRecord(item.subjectPersonId)).length +
        recordSet.medicationOrders.filter((item) => isActivePersonRecord(item.subjectPersonId)).length,
      observations: recordSet.observations.filter((item) => isActivePersonRecord(item.subjectPersonId)).length,
      summaries: recordSet.derivedSummaries.filter((item) => isActivePersonRecord(item.subjectPersonId)).length,
      warningSigns: recordSet.warningSigns.filter((item) => isActivePersonRecord(item.subjectPersonId)).length,
    },
    status: "available",
    summariesAndInsights: [
      ...recordSet.derivedSummaries
        .filter((summary) => isActivePersonRecord(summary.subjectPersonId))
        .map((summary) => ({
          date: summary.generatedAt,
          detail: summary.summaryText,
          status: summary.confidence === undefined ? undefined : String(summary.confidence),
          title: summary.title,
        })),
      ...recordSet.derivedInsights
        .filter((insight) => isActivePersonRecord(insight.subjectPersonId))
        .map((insight) => ({
          date: insight.generatedAt,
          detail: insight.description,
          status: insight.status,
          title: insight.title,
        })),
    ]
      .sort((left, right) => compareByDateDesc(left.date, right.date))
      .slice(0, SECTION_LIMIT),
    vault: workspace.vault.label,
    visualVitals: recordSet.visualVitals
      .map((vital) => ({
        date: vital.lastUpdatedAt,
        detail: `${vital.value}${vital.unit ? ` ${vital.unit}` : ""}; ${vital.detail}; score ${vital.score}/100`,
        status: vital.freshness,
        title: vital.title,
      }))
      .slice(0, SECTION_LIMIT),
    warningSigns: recordSet.warningSigns
      .filter((warning) => isActivePersonRecord(warning.subjectPersonId))
      .map((warning) => ({
        date: warning.lastUpdatedAt,
        detail: warning.description,
        status: warning.tone,
        title: warning.title,
      }))
      .slice(0, SECTION_LIMIT),
  }
}

function conceptText(concept: CodeableConcept) {
  return concept.text || concept.preferredCoding?.display || concept.preferredCoding?.code || "Unknown"
}

function observationValueText(value: ObservationValue | undefined) {
  if (!value) return ""

  if (value.kind === "quantity") {
    return `${value.comparator ?? ""}${value.value} ${value.unit}`.trim()
  }

  return String(value.value)
}

function compareByDateDesc(left: string | undefined, right: string | undefined) {
  return dateValue(right) - dateValue(left)
}

function dateValue(value: string | undefined) {
  if (!value) return 0
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`)
  return Number.isNaN(date.valueOf()) ? 0 : date.valueOf()
}
