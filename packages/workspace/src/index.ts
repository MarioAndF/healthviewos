import {
  billingSections,
  historySections,
  recordCategories,
  type BillingSectionId,
  type RecordCategoryId,
} from "@healthviewos/app-model"
import {
  comparisonPatientIds,
  exampleWorkspaceSeed,
  sampleSystemRows,
  sampleSystemStatus,
  sampleUpcomingCare,
  sampleVitals,
  sampleWarningSigns,
} from "@healthviewos/data"
import {
  HealthViewWorkspaceSchema,
  type AllergyIntolerance,
  type Authorization,
  type Bill,
  type Claim,
  type CodeableConcept,
  type DiagnosticReport,
  type EvidenceBackedClaim,
  type EvidenceLink,
  type HealthMapSignal,
  type HealthRecord,
  type HealthRecordKind,
  type HealthViewWorkspace,
  type HealthHistoryItem,
  type MedicationDispense,
  type MedicationOrder,
  type MedicationUse,
  type Observation,
  type ObservationValue,
  type Payment,
  type Person,
  type ServiceItem,
  type VisualVitalMetric,
  type WarningSign,
  type DocumentRecord,
  type Encounter,
  type Immunization,
} from "@healthviewos/schema"

export type WorkspaceStatus = "idle" | "loading" | "ready" | "error"

export type SystemStatusRow = {
  label: string
  value: string
}

export type UpcomingCareItem = {
  detail: string
  title: string
}

export type HealthViewWorkspaceClient = {
  exportWorkspaceJson(): Promise<string>
  importWorkspaceJson(json: string): Promise<HealthViewWorkspace>
  loadWorkspace(): Promise<HealthViewWorkspace>
  resetWorkspace(): Promise<HealthViewWorkspace>
  saveWorkspace(workspace: HealthViewWorkspace): Promise<HealthViewWorkspace>
}

export type WorkspaceListRow = {
  categoryId?: RecordCategoryId
  detail?: string
  id: string
  meta?: string
  status?: string
  subtitle?: string
  title: string
}

export type WorkspaceDetailRow = {
  label: string
  value: string
}

export type WorkspaceDetailGroup = {
  id: string
  rows: WorkspaceDetailRow[]
  title: string
}

export type WorkspaceViewModels = {
  activePerson?: Person
  billing: {
    rowsBySection: Record<BillingSectionId, WorkspaceListRow[]>
    summary: SystemStatusRow[]
  }
  health: {
    readiness: number
    systemRows: HealthMapSignal[]
    systemStatus: EvidenceBackedClaim
    systemStatusRows: SystemStatusRow[]
    upcomingCare: UpcomingCareItem[]
    vitals: VisualVitalMetric[]
    warningSigns: WarningSign[]
  }
  records: {
    countsByCategory: Record<RecordCategoryId, number>
    detailGroupsById: Record<string, WorkspaceDetailGroup[]>
    rowsByCategory: Record<RecordCategoryId, WorkspaceListRow[]>
    sourceRowsByRecordId: Record<string, WorkspaceListRow[]>
    sources: WorkspaceListRow[]
  }
  services: {
    rows: WorkspaceListRow[]
  }
  settings: {
    summary: SystemStatusRow[]
  }
}

export type CompactHealthContextItem = {
  date?: string
  detail?: string
  status?: string
  title: string
}

export type HealthContextSummary = {
  activePerson?: string
  allergies?: CompactHealthContextItem[]
  conditions?: CompactHealthContextItem[]
  healthMapSignals?: CompactHealthContextItem[]
  limitations?: string[]
  medications?: CompactHealthContextItem[]
  observations?: CompactHealthContextItem[]
  recentEncounters?: CompactHealthContextItem[]
  recordCounts?: Record<string, number>
  savedCareDirectory?: CompactHealthContextItem[]
  status: "available" | "unavailable"
  summariesAndInsights?: CompactHealthContextItem[]
  vault?: string
  visualVitals?: CompactHealthContextItem[]
  warningSigns?: CompactHealthContextItem[]
}

type SelectOption = {
  label: string
  value: string
}

export type RecordFormField = {
  label: string
  name: string
  options?: SelectOption[]
  required?: boolean
  type: "date" | "select" | "text" | "textarea"
}

export type RecordFormDefinition = {
  categoryId: RecordCategoryId
  description: string
  fields: RecordFormField[]
  kind?: HealthRecordKind
  newTitle: string
}

export type HealthHistorySection = HealthHistoryItem["section"]

export type WorkspaceRecordSearchInput = {
  categoryId?: string | null
  limit?: number
  query?: string | null
}

export type WorkspaceRecordSearchResult = WorkspaceListRow & {
  categoryId: RecordCategoryId
  score: number
}

export type WorkspaceEditableRecordSummary = {
  categoryId?: RecordCategoryId
  editable: boolean
  editableFields?: RecordFormField[]
  fieldValues?: Record<string, string>
  healthRecord?: Pick<HealthRecord, "id" | "kind" | "title" | "lifecycleStatus" | "effectiveStart" | "updatedAt">
  historySectionId?: HealthHistorySection
  id: string
  kind?: HealthRecordKind
  reason?: string
  sources: WorkspaceListRow[]
  title: string
}

export type CreateManualRecordFromFieldsInput = {
  categoryId: RecordCategoryId
  fields: Record<string, string>
  historySectionId?: string | null
  subjectPersonId?: string
}

export type UpdateManualRecordFieldsInput = {
  fields: Record<string, string>
  recordId: string
}

type EditableRecordDraft = {
  categoryId: RecordCategoryId
  fieldValues: Record<string, string>
  historySectionId?: HealthHistorySection
  kind: CreateManualRecordInput["kind"]
  subjectPersonId: string
}

export type CreateManualRecordInput =
  | {
      kind: "person"
      displayName: string
      dateOfBirth?: string
      sexAtBirth?: Person["sexAtBirth"]
      administrativeGender?: Person["administrativeGender"]
      addressText?: string
      preferredLanguage?: string
      note?: string
    }
  | {
      kind: "observation"
      subjectPersonId?: string
      category: Observation["category"]
      codeText: string
      effectiveDate: string
      value: ObservationValue
      interpretation?: Observation["interpretation"]
      status?: Observation["status"]
      performerText?: string
      sourceText?: string
      note?: string
    }
  | {
      kind: "health_history_item"
      subjectPersonId?: string
      title: string
      section: HealthHistoryItem["section"]
      status?: HealthHistoryItem["status"]
      date?: string
      relatedPersonText?: string
      relationshipText?: string
      note?: string
    }
  | {
      kind: "allergy_intolerance"
      subjectPersonId?: string
      substanceText: string
      type?: AllergyIntolerance["type"]
      category?: AllergyIntolerance["categories"][number]
      criticality?: AllergyIntolerance["criticality"]
      clinicalStatus?: AllergyIntolerance["clinicalStatus"]
      verificationStatus?: AllergyIntolerance["verificationStatus"]
      manifestationText?: string
      reactionSeverity?: "mild" | "moderate" | "severe" | "unknown"
      onsetDate?: string
      lastOccurrenceDate?: string
      note?: string
    }
  | {
      kind: "medication_use"
      subjectPersonId?: string
      medicationText: string
      status?: MedicationUse["status"]
      doseText?: string
      routeText?: string
      frequencyText?: string
      startDate?: string
      endDate?: string
      reasonText?: string
      prescriberText?: string
      note?: string
    }
  | {
      kind: "encounter"
      subjectPersonId?: string
      title: string
      date?: string
      class?: Encounter["class"]
      status?: Encounter["status"]
      reasonText?: string
      providerText?: string
      organizationText?: string
      locationText?: string
      note?: string
    }
  | {
      kind: "immunization"
      subjectPersonId?: string
      vaccineText: string
      occurrenceDate: string
      status?: Immunization["status"]
      lotNumber?: string
      manufacturerText?: string
      performerText?: string
      siteText?: string
      routeText?: string
      doseText?: string
      note?: string
    }
  | {
      kind: "diagnostic_report"
      subjectPersonId?: string
      title: string
      category?: DiagnosticReport["category"]
      status?: DiagnosticReport["status"]
      codeText?: string
      effectiveDate?: string
      performerText?: string
      conclusionText?: string
      note?: string
    }

const blankOption = { label: "Not recorded", value: "" }

const recordStatusOptions = {
  allergyClinical: [
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
    { label: "Resolved", value: "resolved" },
    { label: "Unknown", value: "unknown" },
  ],
  allergyType: [
    { label: "Allergy", value: "allergy" },
    { label: "Intolerance", value: "intolerance" },
    { label: "Unknown", value: "unknown" },
  ],
  criticality: [
    { label: "Low", value: "low" },
    { label: "High", value: "high" },
    { label: "Unable to assess", value: "unable_to_assess" },
    { label: "Unknown", value: "unknown" },
  ],
  encounterClass: [
    { label: "Ambulatory", value: "ambulatory" },
    { label: "Inpatient", value: "inpatient" },
    { label: "Emergency", value: "emergency" },
    { label: "Home health", value: "home_health" },
    { label: "Virtual", value: "virtual" },
    { label: "Other", value: "other" },
    { label: "Unknown", value: "unknown" },
  ],
  encounterStatus: [
    { label: "Planned", value: "planned" },
    { label: "Arrived", value: "arrived" },
    { label: "In progress", value: "in_progress" },
    { label: "Finished", value: "finished" },
    { label: "Cancelled", value: "cancelled" },
    { label: "Entered in error", value: "entered_in_error" },
    { label: "Unknown", value: "unknown" },
  ],
  healthHistorySection: [
    { label: "Medical", value: "medical" },
    { label: "Surgical / Procedure", value: "surgical" },
    { label: "Family", value: "family" },
    { label: "Social / Lifestyle", value: "social" },
    { label: "Reproductive", value: "reproductive" },
    { label: "Other", value: "other" },
  ],
  healthHistoryStatus: [
    { label: "Current", value: "current" },
    { label: "Past", value: "past" },
    { label: "Unknown", value: "unknown" },
    { label: "Not applicable", value: "not_applicable" },
  ],
  immunizationStatus: [
    { label: "Completed", value: "completed" },
    { label: "Not done", value: "not_done" },
    { label: "Entered in error", value: "entered_in_error" },
    { label: "Unknown", value: "unknown" },
  ],
  medicationStatus: [
    { label: "Active", value: "active" },
    { label: "Completed", value: "completed" },
    { label: "Intended", value: "intended" },
    { label: "Stopped", value: "stopped" },
    { label: "On hold", value: "on_hold" },
    { label: "Entered in error", value: "entered_in_error" },
    { label: "Unknown", value: "unknown" },
  ],
  observationInterpretation: [
    blankOption,
    { label: "Normal", value: "normal" },
    { label: "Low", value: "low" },
    { label: "High", value: "high" },
    { label: "Abnormal", value: "abnormal" },
    { label: "Critical", value: "critical" },
    { label: "Unknown", value: "unknown" },
  ],
  observationStatus: [
    { label: "Registered", value: "registered" },
    { label: "Preliminary", value: "preliminary" },
    { label: "Final", value: "final" },
    { label: "Amended", value: "amended" },
    { label: "Corrected", value: "corrected" },
    { label: "Unknown", value: "unknown" },
  ],
  reactionSeverity: [
    { label: "Mild", value: "mild" },
    { label: "Moderate", value: "moderate" },
    { label: "Severe", value: "severe" },
    { label: "Unknown", value: "unknown" },
  ],
  reportCategory: [
    { label: "Laboratory", value: "laboratory" },
    { label: "Cardiology", value: "cardiology" },
    { label: "Procedure", value: "procedure" },
    { label: "Other", value: "other" },
    { label: "Unknown", value: "unknown" },
  ],
  reportStatus: [
    { label: "Final", value: "final" },
    { label: "Preliminary", value: "preliminary" },
    { label: "Partial", value: "partial" },
    { label: "Amended", value: "amended" },
    { label: "Corrected", value: "corrected" },
    { label: "Cancelled", value: "cancelled" },
    { label: "Unknown", value: "unknown" },
  ],
  sex: [
    blankOption,
    { label: "Female", value: "female" },
    { label: "Male", value: "male" },
    { label: "Intersex", value: "intersex" },
    { label: "Unknown", value: "unknown" },
    { label: "Not specified", value: "not_specified" },
  ],
  administrativeGender: [
    blankOption,
    { label: "Female", value: "female" },
    { label: "Male", value: "male" },
    { label: "Other", value: "other" },
    { label: "Unknown", value: "unknown" },
    { label: "Not specified", value: "not_specified" },
  ],
  verification: [
    { label: "Confirmed", value: "confirmed" },
    { label: "Unconfirmed", value: "unconfirmed" },
    { label: "Provisional", value: "provisional" },
    { label: "Differential", value: "differential" },
    { label: "Refuted", value: "refuted" },
    { label: "Entered in error", value: "entered_in_error" },
    { label: "Unknown", value: "unknown" },
  ],
} satisfies Record<string, SelectOption[]>

export const recordFormDefinitions: Partial<Record<RecordCategoryId, RecordFormDefinition>> = {
  allergies: {
    categoryId: "allergies",
    description: "Allergies, intolerances, reactions, and safety flags.",
    kind: "allergy_intolerance",
    newTitle: "New Allergy or Intolerance",
    fields: [
      { label: "Substance", name: "substanceText", required: true, type: "text" },
      { label: "Type", name: "type", options: recordStatusOptions.allergyType, type: "select" },
      { label: "Category", name: "category", options: [blankOption, { label: "Medication", value: "medication" }, { label: "Food", value: "food" }, { label: "Environment", value: "environment" }, { label: "Biologic", value: "biologic" }, { label: "Other", value: "other" }], type: "select" },
      { label: "Criticality", name: "criticality", options: recordStatusOptions.criticality, type: "select" },
      { label: "Clinical status", name: "clinicalStatus", options: recordStatusOptions.allergyClinical, type: "select" },
      { label: "Verification", name: "verificationStatus", options: recordStatusOptions.verification, type: "select" },
      { label: "Reaction", name: "manifestationText", type: "text" },
      { label: "Reaction severity", name: "reactionSeverity", options: recordStatusOptions.reactionSeverity, type: "select" },
      { label: "Onset", name: "onsetDate", type: "date" },
      { label: "Last occurrence", name: "lastOccurrenceDate", type: "date" },
      { label: "Note", name: "note", type: "textarea" },
    ],
  },
  demographics: {
    categoryId: "demographics",
    description: "People and profile details in the local vault.",
    kind: "person",
    newTitle: "New Person",
    fields: [
      { label: "Name", name: "displayName", required: true, type: "text" },
      { label: "Date of birth", name: "dateOfBirth", type: "date" },
      { label: "Sex at birth", name: "sexAtBirth", options: recordStatusOptions.sex, type: "select" },
      { label: "Administrative gender", name: "administrativeGender", options: recordStatusOptions.administrativeGender, type: "select" },
      { label: "Address", name: "addressText", type: "text" },
      { label: "Preferred language", name: "preferredLanguage", type: "text" },
      { label: "Note", name: "note", type: "textarea" },
    ],
  },
  diagnostic_reports: {
    categoryId: "diagnostic_reports",
    description: "Reports that group documents and related clinical results.",
    kind: "diagnostic_report",
    newTitle: "New Diagnostic Report",
    fields: [
      { label: "Title", name: "title", required: true, type: "text" },
      { label: "Category", name: "category", options: recordStatusOptions.reportCategory, type: "select" },
      { label: "Status", name: "status", options: recordStatusOptions.reportStatus, type: "select" },
      { label: "Code", name: "codeText", type: "text" },
      { label: "Date", name: "effectiveDate", type: "date" },
      { label: "Performer", name: "performerText", type: "text" },
      { label: "Conclusion", name: "conclusionText", type: "textarea" },
      { label: "Note", name: "note", type: "textarea" },
    ],
  },
  history: {
    categoryId: "history",
    description: "Personal medical, surgical, family, and social history.",
    kind: "health_history_item",
    newTitle: "New Health History Item",
    fields: [
      { label: "Section", name: "section", options: recordStatusOptions.healthHistorySection, type: "select" },
      { label: "Title", name: "title", required: true, type: "text" },
      { label: "Status", name: "status", options: recordStatusOptions.healthHistoryStatus, type: "select" },
      { label: "Date", name: "date", type: "date" },
      { label: "Related person", name: "relatedPersonText", type: "text" },
      { label: "Relationship", name: "relationshipText", type: "text" },
      { label: "Note", name: "note", type: "textarea" },
    ],
  },
  imaging: {
    categoryId: "imaging",
    description: "Imaging studies and radiology reports.",
    kind: "diagnostic_report",
    newTitle: "New Imaging Report",
    fields: [
      { label: "Title", name: "title", required: true, type: "text" },
      { label: "Status", name: "status", options: recordStatusOptions.reportStatus, type: "select" },
      { label: "Code", name: "codeText", type: "text" },
      { label: "Date", name: "effectiveDate", type: "date" },
      { label: "Performer", name: "performerText", type: "text" },
      { label: "Conclusion", name: "conclusionText", type: "textarea" },
      { label: "Note", name: "note", type: "textarea" },
    ],
  },
  immunizations: {
    categoryId: "immunizations",
    description: "Vaccines and immunization records.",
    kind: "immunization",
    newTitle: "New Immunization",
    fields: [
      { label: "Vaccine", name: "vaccineText", required: true, type: "text" },
      { label: "Date", name: "occurrenceDate", required: true, type: "date" },
      { label: "Status", name: "status", options: recordStatusOptions.immunizationStatus, type: "select" },
      { label: "Lot", name: "lotNumber", type: "text" },
      { label: "Manufacturer", name: "manufacturerText", type: "text" },
      { label: "Performer", name: "performerText", type: "text" },
      { label: "Site", name: "siteText", type: "text" },
      { label: "Route", name: "routeText", type: "text" },
      { label: "Dose", name: "doseText", type: "text" },
      { label: "Note", name: "note", type: "textarea" },
    ],
  },
  labs: {
    categoryId: "labs",
    description: "Laboratory results and manually entered measurements.",
    kind: "observation",
    newTitle: "New Lab Result",
    fields: [
      { label: "Name", name: "codeText", required: true, type: "text" },
      { label: "Result", name: "result", required: true, type: "text" },
      { label: "Date", name: "effectiveDate", required: true, type: "date" },
      { label: "Status", name: "status", options: recordStatusOptions.observationStatus, type: "select" },
      { label: "Interpretation", name: "interpretation", options: recordStatusOptions.observationInterpretation, type: "select" },
      { label: "Performer", name: "performerText", type: "text" },
      { label: "Note", name: "note", type: "textarea" },
    ],
  },
  medications: {
    categoryId: "medications",
    description: "Medication use reported by the patient or supported by evidence.",
    kind: "medication_use",
    newTitle: "New Medication",
    fields: [
      { label: "Medication", name: "medicationText", required: true, type: "text" },
      { label: "Status", name: "status", options: recordStatusOptions.medicationStatus, type: "select" },
      { label: "Dose", name: "doseText", type: "text" },
      { label: "Route", name: "routeText", type: "text" },
      { label: "Frequency", name: "frequencyText", type: "text" },
      { label: "Start", name: "startDate", type: "date" },
      { label: "End", name: "endDate", type: "date" },
      { label: "Reason", name: "reasonText", type: "text" },
      { label: "Prescriber", name: "prescriberText", type: "text" },
      { label: "Note", name: "note", type: "textarea" },
    ],
  },
  other: {
    categoryId: "other",
    description: "Other manual observations and records.",
    kind: "observation",
    newTitle: "New Other Record",
    fields: [
      { label: "Name", name: "codeText", required: true, type: "text" },
      { label: "Value", name: "result", required: true, type: "text" },
      { label: "Date", name: "effectiveDate", required: true, type: "date" },
      { label: "Status", name: "status", options: recordStatusOptions.observationStatus, type: "select" },
      { label: "Source", name: "sourceText", type: "text" },
      { label: "Note", name: "note", type: "textarea" },
    ],
  },
  pathology: {
    categoryId: "pathology",
    description: "Pathology reports and specimen results.",
    kind: "diagnostic_report",
    newTitle: "New Pathology Report",
    fields: [
      { label: "Title", name: "title", required: true, type: "text" },
      { label: "Status", name: "status", options: recordStatusOptions.reportStatus, type: "select" },
      { label: "Code", name: "codeText", type: "text" },
      { label: "Date", name: "effectiveDate", type: "date" },
      { label: "Performer", name: "performerText", type: "text" },
      { label: "Conclusion", name: "conclusionText", type: "textarea" },
      { label: "Note", name: "note", type: "textarea" },
    ],
  },
  visits: {
    categoryId: "visits",
    description: "Visits, appointments, admissions, and care interactions.",
    kind: "encounter",
    newTitle: "New Visit",
    fields: [
      { label: "Title", name: "title", required: true, type: "text" },
      { label: "Date", name: "date", type: "date" },
      { label: "Class", name: "class", options: recordStatusOptions.encounterClass, type: "select" },
      { label: "Status", name: "status", options: recordStatusOptions.encounterStatus, type: "select" },
      { label: "Reason", name: "reasonText", type: "text" },
      { label: "Provider", name: "providerText", type: "text" },
      { label: "Organization", name: "organizationText", type: "text" },
      { label: "Location", name: "locationText", type: "text" },
      { label: "Note", name: "note", type: "textarea" },
    ],
  },
}

const historySectionFormDefinitions: Record<HealthHistorySection, RecordFormDefinition> = {
  family: {
    categoryId: "history",
    description: "Family health history grouped by relative or relationship.",
    kind: "health_history_item",
    newTitle: "New Family History Item",
    fields: [
      { label: "Health issue", name: "title", required: true, type: "text" },
      { label: "Family member", name: "relatedPersonText", type: "text" },
      { label: "Relationship", name: "relationshipText", type: "text" },
      { label: "Note", name: "note", type: "textarea" },
    ],
  },
  medical: {
    categoryId: "history",
    description: "Long-term diagnoses or conditions to remember.",
    kind: "health_history_item",
    newTitle: "New Medical History Item",
    fields: [
      { label: "Condition or diagnosis", name: "title", required: true, type: "text" },
      { label: "Date diagnosed/noted", name: "date", type: "date" },
      { label: "Note", name: "note", type: "textarea" },
    ],
  },
  other: {
    categoryId: "history",
    description: "Other personal health history.",
    kind: "health_history_item",
    newTitle: "New History Item",
    fields: [
      { label: "Item", name: "title", required: true, type: "text" },
      { label: "Date", name: "date", type: "date" },
      { label: "Note", name: "note", type: "textarea" },
    ],
  },
  reproductive: {
    categoryId: "history",
    description: "Pregnancy, reproductive, or gynecologic history.",
    kind: "health_history_item",
    newTitle: "New Reproductive History Item",
    fields: [
      { label: "Topic", name: "title", required: true, type: "text" },
      { label: "Date", name: "date", type: "date" },
      { label: "Note", name: "note", type: "textarea" },
    ],
  },
  social: {
    categoryId: "history",
    description: "Lifestyle and social history.",
    kind: "health_history_item",
    newTitle: "New Social / Lifestyle Item",
    fields: [
      { label: "Topic", name: "title", required: true, type: "text" },
      { label: "Details", name: "note", type: "textarea" },
    ],
  },
  surgical: {
    categoryId: "history",
    description: "Surgeries and procedures.",
    kind: "health_history_item",
    newTitle: "New Surgical / Procedure Item",
    fields: [
      { label: "Procedure", name: "title", required: true, type: "text" },
      { label: "Date", name: "date", type: "date" },
      { label: "Note", name: "note", type: "textarea" },
    ],
  },
}

export function getRecordFormDefinition(
  categoryId: string | null | undefined,
  historySection?: string | null,
) {
  if (!categoryId) return undefined
  if (categoryId === "history" && isHealthHistorySection(historySection)) {
    return historySectionFormDefinitions[historySection]
  }
  return recordFormDefinitions[categoryId as RecordCategoryId]
}

export function emptyDraftForRecordCategory(
  categoryId: RecordCategoryId,
  historySection?: string | null,
) {
  const definition = getRecordFormDefinition(categoryId, historySection)
  if (!definition) return {}
  const draft = Object.fromEntries(
    definition.fields.map((field) => [field.name, field.options?.[0]?.value ?? ""]),
  ) as Record<string, string>
  if (categoryId === "history" && isHealthHistorySection(historySection)) {
    draft.section = historySection
  }
  return draft
}

export function recordInputFromDraft(
  categoryId: RecordCategoryId,
  draft: Record<string, string>,
  subjectPersonId?: string,
  historySection?: string | null,
): CreateManualRecordInput | null {
  if (categoryId === "demographics") {
    if (!draft.displayName?.trim()) return null
    return compactObject({
      kind: "person",
      displayName: draft.displayName,
      dateOfBirth: draft.dateOfBirth,
      sexAtBirth: draft.sexAtBirth as Person["sexAtBirth"],
      administrativeGender: draft.administrativeGender as Person["administrativeGender"],
      addressText: draft.addressText,
      preferredLanguage: draft.preferredLanguage,
      note: draft.note,
    }) as CreateManualRecordInput
  }
  if (categoryId === "labs" || categoryId === "other") {
    const value = observationValueFromText(draft.result ?? "")
    if (!draft.codeText?.trim() || !draft.effectiveDate || !value) return null
    return compactObject({
      kind: "observation",
      subjectPersonId,
      category: categoryId === "labs" ? "laboratory" : "manual",
      codeText: draft.codeText,
      effectiveDate: draft.effectiveDate,
      value,
      status: (draft.status || "final") as Observation["status"],
      interpretation: categoryId === "labs" ? (draft.interpretation as Observation["interpretation"]) : undefined,
      performerText: draft.performerText,
      sourceText: draft.sourceText,
      note: draft.note,
    }) as CreateManualRecordInput
  }
  if (categoryId === "history") {
    if (!draft.title?.trim()) return null
    return compactObject({
      kind: "health_history_item",
      subjectPersonId,
      title: draft.title,
      section: (draft.section || (isHealthHistorySection(historySection) ? historySection : "medical")) as HealthHistoryItem["section"],
      status: (draft.status || "unknown") as HealthHistoryItem["status"],
      date: draft.date,
      relatedPersonText: draft.relatedPersonText,
      relationshipText: draft.relationshipText,
      note: draft.note,
    }) as CreateManualRecordInput
  }
  if (categoryId === "allergies") {
    if (!draft.substanceText?.trim()) return null
    return compactObject({
      kind: "allergy_intolerance",
      subjectPersonId,
      substanceText: draft.substanceText,
      type: (draft.type || "unknown") as AllergyIntolerance["type"],
      category: draft.category as AllergyIntolerance["categories"][number],
      criticality: (draft.criticality || "unknown") as AllergyIntolerance["criticality"],
      clinicalStatus: (draft.clinicalStatus || "active") as AllergyIntolerance["clinicalStatus"],
      verificationStatus: (draft.verificationStatus || "unconfirmed") as AllergyIntolerance["verificationStatus"],
      manifestationText: draft.manifestationText,
      reactionSeverity: (draft.reactionSeverity || "unknown") as "mild" | "moderate" | "severe" | "unknown",
      onsetDate: draft.onsetDate,
      lastOccurrenceDate: draft.lastOccurrenceDate,
      note: draft.note,
    }) as CreateManualRecordInput
  }
  if (categoryId === "medications") {
    if (!draft.medicationText?.trim()) return null
    return compactObject({
      kind: "medication_use",
      subjectPersonId,
      medicationText: draft.medicationText,
      status: (draft.status || "active") as MedicationUse["status"],
      doseText: draft.doseText,
      routeText: draft.routeText,
      frequencyText: draft.frequencyText,
      startDate: draft.startDate,
      endDate: draft.endDate,
      reasonText: draft.reasonText,
      prescriberText: draft.prescriberText,
      note: draft.note,
    }) as CreateManualRecordInput
  }
  if (categoryId === "visits") {
    if (!draft.title?.trim()) return null
    return compactObject({
      kind: "encounter",
      subjectPersonId,
      title: draft.title,
      date: draft.date,
      class: (draft.class || "unknown") as Encounter["class"],
      status: (draft.status || "finished") as Encounter["status"],
      reasonText: draft.reasonText,
      providerText: draft.providerText,
      organizationText: draft.organizationText,
      locationText: draft.locationText,
      note: draft.note,
    }) as CreateManualRecordInput
  }
  if (categoryId === "immunizations") {
    if (!draft.vaccineText?.trim() || !draft.occurrenceDate) return null
    return compactObject({
      kind: "immunization",
      subjectPersonId,
      vaccineText: draft.vaccineText,
      occurrenceDate: draft.occurrenceDate,
      status: (draft.status || "completed") as Immunization["status"],
      lotNumber: draft.lotNumber,
      manufacturerText: draft.manufacturerText,
      performerText: draft.performerText,
      siteText: draft.siteText,
      routeText: draft.routeText,
      doseText: draft.doseText,
      note: draft.note,
    }) as CreateManualRecordInput
  }
  if (categoryId === "diagnostic_reports" || categoryId === "imaging" || categoryId === "pathology") {
    if (!draft.title?.trim()) return null
    return compactObject({
      kind: "diagnostic_report",
      subjectPersonId,
      title: draft.title,
      category: categoryId === "imaging" ? "imaging" : categoryId === "pathology" ? "pathology" : ((draft.category || "unknown") as DiagnosticReport["category"]),
      status: (draft.status || "final") as DiagnosticReport["status"],
      codeText: draft.codeText,
      effectiveDate: draft.effectiveDate,
      performerText: draft.performerText,
      conclusionText: draft.conclusionText,
      note: draft.note,
    }) as CreateManualRecordInput
  }
  return null
}

export function createManualRecordInWorkspace(
  workspace: HealthViewWorkspace,
  input: CreateManualRecordInput,
) {
  const now = new Date().toISOString()
  const requestedSubjectPersonId = "subjectPersonId" in input ? input.subjectPersonId : undefined
  const subjectPersonId =
    input.kind === "person"
      ? createRecordId(workspace, "person", input.displayName, input.dateOfBirth)
      : requireActivePerson(workspace, requestedSubjectPersonId).id
  const id =
    input.kind === "person"
      ? subjectPersonId
      : createRecordId(workspace, input.kind, manualRecordTitle(input), manualRecordDate(input))
  const recordSet = appendManualRecord(workspace, input, id, subjectPersonId, now)

  return parseWorkspace({
    ...workspace,
    settings: {
      ...workspace.settings,
      activePersonId: input.kind === "person" ? id : workspace.settings.activePersonId,
      updatedAt: now,
    },
    recordSet,
  })
}

export function searchWorkspaceRecords(
  workspace: HealthViewWorkspace | null,
  input: WorkspaceRecordSearchInput = {},
): WorkspaceRecordSearchResult[] {
  if (!workspace) return []

  const query = input.query?.trim().toLowerCase() ?? ""
  const limit = Math.max(1, Math.min(input.limit ?? 8, 20))
  const requestedCategoryId = isRecordCategoryId(input.categoryId) ? input.categoryId : null
  const rowsByCategory = buildRecordsByCategory(workspace)
  const categories = requestedCategoryId ? [requestedCategoryId] : recordCategories.map((category) => category.id)
  const results: WorkspaceRecordSearchResult[] = []

  for (const categoryId of categories) {
    for (const row of rowsByCategory[categoryId]) {
      const haystack = [row.title, row.subtitle, row.detail, row.meta, row.status, categoryId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (query && !haystack.includes(query)) continue

      results.push({
        ...row,
        categoryId,
        score: query ? Math.max(0.1, 1 - results.length * 0.04) : Math.max(0.1, 0.95 - results.length * 0.04),
      })
    }
  }

  return results.slice(0, limit)
}

export function getWorkspaceRecordSummary(
  workspace: HealthViewWorkspace | null,
  recordId: string,
): WorkspaceEditableRecordSummary | null {
  if (!workspace) return null

  const healthRecord = workspace.recordSet.healthRecords.find((record) => record.id === recordId)
  const editable = editableRecordDraftForWorkspace(workspace, recordId)
  const sourceRowsById = buildSourceRowsByRecordId(workspace)

  if (editable) {
    const definition = getRecordFormDefinition(editable.categoryId, editable.historySectionId)
    return {
      categoryId: editable.categoryId,
      editable: true,
      editableFields: definition?.fields ?? [],
      fieldValues: editable.fieldValues,
      healthRecord: healthRecord
        ? {
            effectiveStart: healthRecord.effectiveStart,
            id: healthRecord.id,
            kind: healthRecord.kind,
            lifecycleStatus: healthRecord.lifecycleStatus,
            title: healthRecord.title,
            updatedAt: healthRecord.updatedAt,
          }
        : undefined,
      historySectionId: editable.historySectionId,
      id: recordId,
      kind: editable.kind,
      sources: sourceRowsById[recordId] ?? [],
      title: healthRecord?.title ?? editable.fieldValues.title ?? editable.fieldValues.displayName ?? recordId,
    }
  }

  return {
    editable: false,
    healthRecord: healthRecord
      ? {
          effectiveStart: healthRecord.effectiveStart,
          id: healthRecord.id,
          kind: healthRecord.kind,
          lifecycleStatus: healthRecord.lifecycleStatus,
          title: healthRecord.title,
          updatedAt: healthRecord.updatedAt,
        }
      : undefined,
    id: recordId,
    kind: healthRecord?.kind,
    reason: healthRecord
      ? `Editing ${readableToken(healthRecord.kind)} records is not supported by the manual record editor yet.`
      : "Record not found.",
    sources: sourceRowsById[recordId] ?? [],
    title: healthRecord?.title ?? recordId,
  }
}

export function createManualRecordFromFieldsInWorkspace(
  workspace: HealthViewWorkspace,
  input: CreateManualRecordFromFieldsInput,
) {
  const fields = normalizeRecordFieldValues(input.fields)
  const draft = {
    ...emptyDraftForRecordCategory(input.categoryId, input.historySectionId),
    ...fields,
  }
  const manualInput = recordInputFromDraft(input.categoryId, draft, input.subjectPersonId, input.historySectionId)
  if (!manualInput) {
    throw new Error("Complete the required record fields before saving.")
  }

  return createManualRecordInWorkspace(workspace, manualInput)
}

export function updateManualRecordFieldsInWorkspace(
  workspace: HealthViewWorkspace,
  input: UpdateManualRecordFieldsInput,
) {
  const editable = editableRecordDraftForWorkspace(workspace, input.recordId)
  if (!editable) {
    throw new Error("This record is not editable by the manual record editor.")
  }

  const healthRecord = workspace.recordSet.healthRecords.find((record) => record.id === input.recordId)
  if (!healthRecord) {
    throw new Error("Record not found.")
  }

  const nextDraft = {
    ...editable.fieldValues,
    ...normalizeRecordFieldValues(input.fields),
  }
  const manualInput = recordInputFromDraft(
    editable.categoryId,
    nextDraft,
    editable.subjectPersonId,
    editable.historySectionId,
  )
  if (!manualInput) {
    throw new Error("Complete the required record fields before saving.")
  }

  const now = new Date().toISOString()
  const title = requiredText(manualRecordTitle(manualInput), "A record title")
  const effectiveStart = manualRecordDate(manualInput)
  const subjectPersonId =
    manualInput.kind === "person"
      ? input.recordId
      : "subjectPersonId" in manualInput && manualInput.subjectPersonId
        ? manualInput.subjectPersonId
        : editable.subjectPersonId
  const nextDomainRecord = createManualDomainRecord(
    manualInput,
    input.recordId,
    subjectPersonId,
    healthRecord.evidence,
  )

  const nextHealthRecord: HealthRecord = {
    ...healthRecord,
    effectiveStart,
    subjectPersonId,
    title,
    updatedAt: now,
  }

  return parseWorkspace({
    ...workspace,
    settings: {
      ...workspace.settings,
      updatedAt: now,
    },
    recordSet: updateRecordSetWithDomainRecord(workspace, {
      domainRecord: nextDomainRecord,
      healthRecord: nextHealthRecord,
      kind: manualInput.kind,
      now,
      title,
    }),
  })
}

const LOCAL_STORAGE_WORKSPACE_KEY = "healthviewos.workspace"
const SECTION_LIMIT = 6

export function parseWorkspace(input: unknown): HealthViewWorkspace {
  return HealthViewWorkspaceSchema.parse(input)
}

export function seedWorkspace(): HealthViewWorkspace {
  return parseWorkspace(exampleWorkspaceSeed)
}

export function createInMemoryWorkspaceClient(initialWorkspace = seedWorkspace()): HealthViewWorkspaceClient {
  let workspace = parseWorkspace(initialWorkspace)

  return {
    async exportWorkspaceJson() {
      return JSON.stringify(workspace, null, 2)
    },
    async importWorkspaceJson(json) {
      workspace = parseWorkspace(JSON.parse(json) as unknown)
      return workspace
    },
    async loadWorkspace() {
      return workspace
    },
    async resetWorkspace() {
      workspace = seedWorkspace()
      return workspace
    },
    async saveWorkspace(nextWorkspace) {
      workspace = parseWorkspace(nextWorkspace)
      return workspace
    },
  }
}

export function createLocalStorageWorkspaceClient(
  storageKey = LOCAL_STORAGE_WORKSPACE_KEY,
): HealthViewWorkspaceClient {
  function persist(workspace: HealthViewWorkspace) {
    localStorage.setItem(storageKey, JSON.stringify(workspace))
    return workspace
  }

  async function loadWorkspace() {
    const raw = localStorage.getItem(storageKey)
    if (!raw) {
      return persist(seedWorkspace())
    }

    try {
      const parsed = parseWorkspace(JSON.parse(raw) as unknown)
      const upgraded = comparisonSeedUpgrade(parsed)
      if (upgraded !== parsed) {
        persist(upgraded)
      }
      return upgraded
    } catch {
      localStorage.removeItem(storageKey)
      return persist(seedWorkspace())
    }
  }

  return {
    async exportWorkspaceJson() {
      return JSON.stringify(await loadWorkspace(), null, 2)
    },
    async importWorkspaceJson(json) {
      let parsedJson: unknown
      try {
        parsedJson = JSON.parse(json) as unknown
      } catch (error) {
        throw new Error("Workspace import must be valid JSON.", { cause: error })
      }
      return persist(parseWorkspace(parsedJson))
    },
    loadWorkspace,
    async resetWorkspace() {
      return persist(seedWorkspace())
    },
    async saveWorkspace(workspace) {
      return persist(parseWorkspace(workspace))
    },
  }
}

function mergeById<T extends { id: string }>(existing: T[], additions: T[]) {
  const existingIds = new Set(existing.map((item) => item.id))
  const missing = additions.filter((item) => !existingIds.has(item.id))
  return missing.length ? [...existing, ...missing] : existing
}

export function comparisonSeedUpgrade(workspace: HealthViewWorkspace): HealthViewWorkspace {
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
      acquisitions: mergeById(
        workspace.recordSet.acquisitions,
        seed.recordSet.acquisitions.filter((acquisition) => comparisonAcquisitionIds.has(acquisition.id)),
      ),
      artifacts: mergeById(workspace.recordSet.artifacts, comparisonArtifacts),
      authorizations: mergeById(workspace.recordSet.authorizations, seed.recordSet.authorizations.filter(isComparisonSubject)),
      documents: mergeById(workspace.recordSet.documents, comparisonDocuments),
      encounters: mergeById(workspace.recordSet.encounters, seed.recordSet.encounters.filter(isComparisonSubject)),
      files: mergeById(workspace.recordSet.files, seed.recordSet.files.filter((file) => comparisonFileIds.has(file.id))),
      healthMapSignals: mergeById(workspace.recordSet.healthMapSignals, seed.recordSet.healthMapSignals.filter(isComparisonSubject)),
      healthRecords: mergeById(workspace.recordSet.healthRecords, seed.recordSet.healthRecords.filter(isComparisonSubject)),
      medicationOrders: mergeById(workspace.recordSet.medicationOrders, seed.recordSet.medicationOrders.filter(isComparisonSubject)),
      observations: mergeById(workspace.recordSet.observations, seed.recordSet.observations.filter(isComparisonSubject)),
      people: mergeById(
        workspace.recordSet.people,
        seed.recordSet.people.filter((person) => comparisonIds.has(person.id)),
      ),
      provenanceEvents: mergeById(workspace.recordSet.provenanceEvents, comparisonProvenanceEvents),
      visualVitals: mergeById(
        workspace.recordSet.visualVitals,
        seed.recordSet.visualVitals.filter((vital) =>
          vital.evidence.some((summary) =>
            summary.sourceArtifactId ? comparisonArtifactIds.has(summary.sourceArtifactId) : false,
          ),
        ),
      ),
      warningSigns: mergeById(workspace.recordSet.warningSigns, seed.recordSet.warningSigns.filter(isComparisonSubject)),
    },
    billingItems: mergeById(workspace.billingItems, seed.billingItems.filter(isComparisonSubject)),
    serviceItems: mergeById(workspace.serviceItems, seed.serviceItems.filter(isComparisonSubject)),
  })
}

function isHealthHistorySection(value: string | null | undefined): value is HealthHistorySection {
  return recordStatusOptions.healthHistorySection.some((option) => option.value === value)
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== ""),
  ) as T
}

function observationValueFromText(value: string): ObservationValue | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^(yes|true)$/i.test(trimmed)) return { kind: "boolean", value: true }
  if (/^(no|false)$/i.test(trimmed)) return { kind: "boolean", value: false }

  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*(.*)$/)
  if (match) {
    return {
      kind: "quantity",
      value: Number(match[1]),
      unit: match[2]?.trim() || "unit",
    }
  }

  return { kind: "text", value: trimmed }
}

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
}

function uniqueId(base: string, existingIds: Set<string>) {
  let candidate = base
  let index = 2

  while (existingIds.has(candidate)) {
    candidate = `${base}_${index}`
    index += 1
  }

  return candidate
}

function allRecordIds(workspace: HealthViewWorkspace) {
  return new Set([
    ...workspace.recordSet.healthRecords.map((item) => item.id),
    ...workspace.recordSet.people.map((item) => item.id),
    ...workspace.recordSet.observations.map((item) => item.id),
    ...workspace.recordSet.conditions.map((item) => item.id),
    ...workspace.recordSet.allergyIntolerances.map((item) => item.id),
    ...workspace.recordSet.medicationUses.map((item) => item.id),
    ...workspace.recordSet.medicationOrders.map((item) => item.id),
    ...workspace.recordSet.medicationDispenses.map((item) => item.id),
    ...workspace.recordSet.encounters.map((item) => item.id),
    ...workspace.recordSet.immunizations.map((item) => item.id),
    ...workspace.recordSet.healthHistoryItems.map((item) => item.id),
    ...workspace.recordSet.diagnosticReports.map((item) => item.id),
    ...workspace.recordSet.providers.map((item) => item.id),
    ...workspace.recordSet.organizations.map((item) => item.id),
    ...workspace.recordSet.locations.map((item) => item.id),
    ...workspace.recordSet.coverages.map((item) => item.id),
    ...workspace.recordSet.claims.map((item) => item.id),
    ...workspace.recordSet.bills.map((item) => item.id),
    ...workspace.recordSet.payments.map((item) => item.id),
    ...workspace.recordSet.authorizations.map((item) => item.id),
    ...workspace.recordSet.derivedSummaries.map((item) => item.id),
    ...workspace.recordSet.derivedTimelineEvents.map((item) => item.id),
    ...workspace.recordSet.derivedInsights.map((item) => item.id),
  ])
}

function createRecordId(
  workspace: HealthViewWorkspace,
  kind: HealthRecordKind,
  title: string,
  date?: string,
) {
  if (kind === "person") {
    return uniqueId(`person_${slug(title) || "new_person"}`, allRecordIds(workspace))
  }

  const dateSuffix = date ? `_${date.replace(/-/g, "_")}` : ""
  return uniqueId(`${kind}_${slug(title) || "manual"}${dateSuffix}`, allRecordIds(workspace))
}

function requireActivePerson(workspace: HealthViewWorkspace, subjectPersonId?: string) {
  const person = subjectPersonId
    ? workspace.recordSet.people.find((item) => item.id === subjectPersonId)
    : activePersonFor(workspace)
  if (!person) {
    throw new Error("Create a person before adding a record.")
  }
  return person
}

function concept(text?: string): CodeableConcept | undefined {
  const trimmed = text?.trim()
  return trimmed ? { text: trimmed, codings: [] } : undefined
}

function requiredConcept(text: string, label: string): CodeableConcept {
  const value = requiredText(text, label)
  return { text: value, codings: [] }
}

function requiredText(value: string | undefined, label: string) {
  const trimmed = value?.trim()
  if (!trimmed) {
    throw new Error(`${label} is required.`)
  }
  return trimmed
}

function dateOrUndefined(value?: string) {
  return value?.trim() || undefined
}

function manualRecordTitle(input: CreateManualRecordInput) {
  switch (input.kind) {
    case "allergy_intolerance":
      return input.substanceText.trim()
    case "diagnostic_report":
    case "encounter":
    case "health_history_item":
      return input.title.trim()
    case "immunization":
      return input.vaccineText.trim()
    case "medication_use":
      return input.medicationText.trim()
    case "observation":
      return input.codeText.trim()
    case "person":
      return input.displayName.trim()
  }
}

function manualRecordDate(input: CreateManualRecordInput) {
  switch (input.kind) {
    case "allergy_intolerance":
      return dateOrUndefined(input.onsetDate) ?? dateOrUndefined(input.lastOccurrenceDate)
    case "diagnostic_report":
      return dateOrUndefined(input.effectiveDate)
    case "encounter":
      return dateOrUndefined(input.date)
    case "health_history_item":
      return dateOrUndefined(input.date)
    case "immunization":
      return dateOrUndefined(input.occurrenceDate)
    case "medication_use":
      return dateOrUndefined(input.startDate)
    case "observation":
      return dateOrUndefined(input.effectiveDate)
    case "person":
      return dateOrUndefined(input.dateOfBirth)
  }
}

function documentTypeForManualRecord(input: CreateManualRecordInput): DocumentRecord["documentType"] {
  if (input.kind === "observation" && input.category === "laboratory") return "lab_report"
  if (input.kind === "diagnostic_report" && input.category === "imaging") return "imaging_report"
  if (input.kind === "diagnostic_report" && input.category === "pathology") return "pathology_report"
  if (input.kind === "diagnostic_report") return "other"
  if (input.kind === "medication_use") return "medication_record"
  if (input.kind === "encounter" || input.kind === "health_history_item") return "visit_note"
  if (input.kind === "immunization") return "immunization_record"
  return "user_note"
}

function manualFieldValue(value: unknown) {
  if (value && typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function manualEntryMarkdown(
  kind: HealthRecordKind,
  title: string,
  date: string | undefined,
  input: CreateManualRecordInput,
) {
  const fields = Object.entries(input)
    .filter(([key, value]) => key !== "kind" && value !== undefined && value !== "")
    .map(([key, value]) => `- ${key}: ${manualFieldValue(value)}`)
    .join("\n")
  return `# ${title}\n\nManual HealthView OS ${kind.replace(/_/g, " ")} entry.\n\n${fields}\n\n- Date: ${
    date ?? "Not recorded"
  }\n\nThis file was created from user-entered data in HealthView OS.\n`
}

function appendManualEvidence(
  workspace: HealthViewWorkspace,
  input: CreateManualRecordInput,
  options: {
    id: string
    now: string
    subjectPersonId: string
    title: string
  },
) {
  const originId = "origin_user_manual_entry"
  const suffix = options.id
  const acquisitionId = `acquisition_${suffix}`
  const fileId = `file_${suffix}`
  const artifactId = `artifact_${suffix}`
  const documentId = `document_${suffix}`
  const provenanceId = `provenance_${suffix}`
  const date = manualRecordDate(input)
  const year = date?.slice(0, 4) || options.now.slice(0, 4)
  const relativePath = `notes/manual/${input.kind}/${year}/${options.id}.md`
  const evidence: EvidenceLink[] = [
    {
      artifactId,
      documentId,
      provenanceEventId: provenanceId,
      confidence: 1,
      confidenceLabel: "high",
      freshness: "current",
      note: "Entered manually by the user.",
    },
  ]
  const healthRecord: HealthRecord = {
    id: options.id,
    kind: input.kind,
    subjectPersonId: options.subjectPersonId,
    title: options.title,
    lifecycleStatus: "active",
    effectiveStart: date,
    recordedAt: options.now,
    createdAt: options.now,
    updatedAt: options.now,
    evidence,
  }
  const markdown = manualEntryMarkdown(input.kind, options.title, date, input)

  return {
    acquisitions: [
      ...workspace.recordSet.acquisitions,
      {
        id: acquisitionId,
        method: "manual_entry" as const,
        acquiredAt: options.now,
        originId,
        actor: "user" as const,
        note: "Record entered by the user.",
      },
    ],
    artifacts: [
      ...workspace.recordSet.artifacts,
      {
        id: artifactId,
        kind: "manual_entry" as const,
        title: options.title,
        originId,
        acquisitionEventId: acquisitionId,
        fileIds: [fileId],
        receivedAt: options.now,
        observedAt: date,
        freshness: "current" as const,
        trustLevel: "user_entered" as const,
      },
    ],
    documents: [
      ...workspace.recordSet.documents,
      {
        id: documentId,
        artifactId,
        subjectPersonIds: [options.subjectPersonId],
        documentType: documentTypeForManualRecord(input),
        title: options.title,
        documentDate: date,
        status: "available" as const,
      },
    ],
    evidence,
    files: [
      ...workspace.recordSet.files,
      {
        id: fileId,
        relativePath,
        mediaType: "text/markdown",
        sizeBytes: markdown.length,
      },
    ],
    healthRecord,
    origins: workspace.recordSet.origins.some((item) => item.id === originId)
      ? workspace.recordSet.origins
      : [
          ...workspace.recordSet.origins,
          {
            id: originId,
            type: "user" as const,
            name: "Manual entry",
            trustLevel: "user_entered" as const,
            identifiers: [],
          },
        ],
    provenanceEvents: [
      ...workspace.recordSet.provenanceEvents,
      {
        id: provenanceId,
        type: "manual_entry" as const,
        occurredAt: options.now,
        actor: "user" as const,
        inputIds: [documentId],
        outputIds: [options.id],
        method: "manual_entry_form",
        confidence: 1,
      },
    ],
  }
}

function createManualDomainRecord(
  input: CreateManualRecordInput,
  id: string,
  subjectPersonId: string,
  evidence: EvidenceLink[],
) {
  switch (input.kind) {
    case "allergy_intolerance":
      return {
        id,
        subjectPersonId,
        substance: requiredConcept(input.substanceText, "A substance"),
        type: input.type ?? "unknown",
        categories: input.category ? [input.category] : [],
        criticality: input.criticality ?? "unknown",
        clinicalStatus: input.clinicalStatus ?? "active",
        verificationStatus: input.verificationStatus ?? "unconfirmed",
        onsetDate: dateOrUndefined(input.onsetDate),
        lastOccurrenceDate: dateOrUndefined(input.lastOccurrenceDate),
        reactions: input.manifestationText?.trim()
          ? [
              {
                manifestations: [requiredConcept(input.manifestationText, "A reaction")],
                severity: input.reactionSeverity ?? "unknown",
              },
            ]
          : [],
        note: input.note?.trim() || undefined,
        evidence,
      } satisfies AllergyIntolerance
    case "diagnostic_report":
      return {
        id,
        subjectPersonId,
        title: requiredText(input.title, "A report title"),
        category: input.category ?? "unknown",
        status: input.status ?? "final",
        code: concept(input.codeText),
        effectiveDate: dateOrUndefined(input.effectiveDate),
        performerText: input.performerText?.trim() || undefined,
        resultObservationIds: [],
        documentIds: evidence.map((link) => link.documentId).filter((documentId): documentId is string => Boolean(documentId)),
        conclusionText: input.conclusionText?.trim() || undefined,
        note: input.note?.trim() || undefined,
        evidence,
      } satisfies DiagnosticReport
    case "encounter":
      return {
        id,
        subjectPersonId,
        title: requiredText(input.title, "A visit title"),
        class: input.class ?? "unknown",
        status: input.status ?? "finished",
        date: dateOrUndefined(input.date),
        reason: concept(input.reasonText),
        providerText: input.providerText?.trim() || undefined,
        organizationText: input.organizationText?.trim() || undefined,
        locationText: input.locationText?.trim() || undefined,
        linkedObservationIds: [],
        linkedConditionIds: [],
        linkedDocumentIds: [],
        note: input.note?.trim() || undefined,
        evidence,
      } satisfies Encounter
    case "health_history_item":
      return {
        id,
        subjectPersonId,
        section: input.section,
        title: requiredText(input.title, "A history title"),
        status: input.status ?? "unknown",
        date: dateOrUndefined(input.date),
        relatedPersonText: input.relatedPersonText?.trim() || undefined,
        relationshipText: input.relationshipText?.trim() || undefined,
        note: input.note?.trim() || undefined,
        evidence,
      } satisfies HealthHistoryItem
    case "immunization":
      return {
        id,
        subjectPersonId,
        vaccine: requiredConcept(input.vaccineText, "A vaccine"),
        status: input.status ?? "completed",
        occurrenceDate: requiredText(input.occurrenceDate, "An immunization date"),
        lotNumber: input.lotNumber?.trim() || undefined,
        manufacturerText: input.manufacturerText?.trim() || undefined,
        performerText: input.performerText?.trim() || undefined,
        siteText: input.siteText?.trim() || undefined,
        routeText: input.routeText?.trim() || undefined,
        doseText: input.doseText?.trim() || undefined,
        note: input.note?.trim() || undefined,
        evidence,
      } satisfies Immunization
    case "medication_use":
      return {
        id,
        subjectPersonId,
        medication: requiredConcept(input.medicationText, "A medication"),
        status: input.status ?? "active",
        doseText: input.doseText?.trim() || undefined,
        routeText: input.routeText?.trim() || undefined,
        frequencyText: input.frequencyText?.trim() || undefined,
        startDate: dateOrUndefined(input.startDate),
        endDate: dateOrUndefined(input.endDate),
        reason: concept(input.reasonText),
        prescriberText: input.prescriberText?.trim() || undefined,
        note: input.note?.trim() || undefined,
        evidence,
      } satisfies MedicationUse
    case "observation":
      return {
        id,
        subjectPersonId,
        category: input.category,
        code: requiredConcept(input.codeText, "A record name"),
        effectiveDate: requiredText(input.effectiveDate, "A record date"),
        value: input.value,
        components: [],
        referenceRanges: [],
        interpretation: input.interpretation,
        status: input.status ?? "final",
        performerText: input.performerText?.trim() || undefined,
        sourceText: input.sourceText?.trim() || undefined,
        note: input.note?.trim() || undefined,
        evidence,
      } satisfies Observation
    case "person":
      return {
        id,
        displayName: requiredText(input.displayName, "A display name"),
        names: [
          {
            text: requiredText(input.displayName, "A display name"),
            given: [],
            prefix: [],
            suffix: [],
            use: "official" as const,
          },
        ],
        dateOfBirth: dateOrUndefined(input.dateOfBirth),
        sexAtBirth: input.sexAtBirth,
        administrativeGender: input.administrativeGender,
        addressText: input.addressText?.trim() || undefined,
        preferredLanguage: input.preferredLanguage?.trim() || undefined,
        identifiers: [],
        contactPoints: [],
        addresses: [],
        emergencyContacts: [],
        relatedPersons: [],
        delegatedAccess: [],
        active: true,
        evidence,
      } satisfies Person
  }
}

function appendManualRecord(
  workspace: HealthViewWorkspace,
  input: CreateManualRecordInput,
  id: string,
  subjectPersonId: string,
  now: string,
): HealthViewWorkspace["recordSet"] {
  const title = requiredText(manualRecordTitle(input), "A record title")
  const chain = appendManualEvidence(workspace, input, { id, now, subjectPersonId, title })
  const domainRecord = createManualDomainRecord(input, id, subjectPersonId, chain.evidence)
  const baseRecordSet: HealthViewWorkspace["recordSet"] = {
    ...workspace.recordSet,
    acquisitions: chain.acquisitions,
    artifacts: chain.artifacts,
    documents: chain.documents,
    files: chain.files,
    healthRecords: [...workspace.recordSet.healthRecords, chain.healthRecord],
    origins: chain.origins,
    provenanceEvents: chain.provenanceEvents,
  }

  switch (input.kind) {
    case "allergy_intolerance":
      return {
        ...baseRecordSet,
        allergyIntolerances: [...workspace.recordSet.allergyIntolerances, domainRecord as AllergyIntolerance],
      }
    case "diagnostic_report":
      return {
        ...baseRecordSet,
        diagnosticReports: [...workspace.recordSet.diagnosticReports, domainRecord as DiagnosticReport],
      }
    case "encounter":
      return {
        ...baseRecordSet,
        encounters: [...workspace.recordSet.encounters, domainRecord as Encounter],
      }
    case "health_history_item":
      return {
        ...baseRecordSet,
        healthHistoryItems: [...workspace.recordSet.healthHistoryItems, domainRecord as HealthHistoryItem],
      }
    case "immunization":
      return {
        ...baseRecordSet,
        immunizations: [...workspace.recordSet.immunizations, domainRecord as Immunization],
      }
    case "medication_use":
      return {
        ...baseRecordSet,
        medicationUses: [...workspace.recordSet.medicationUses, domainRecord as MedicationUse],
      }
    case "observation":
      return {
        ...baseRecordSet,
        observations: [...workspace.recordSet.observations, domainRecord as Observation],
      }
    case "person":
      return {
        ...baseRecordSet,
        people: [...workspace.recordSet.people, domainRecord as Person],
      }
  }
}

function isRecordCategoryId(value: string | null | undefined): value is RecordCategoryId {
  return recordCategories.some((category) => category.id === value)
}

function normalizeRecordFieldValues(fields: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, typeof value === "string" ? value : String(value)]),
  ) as Record<string, string>
}

function editableRecordDraftForWorkspace(
  workspace: HealthViewWorkspace,
  recordId: string,
): EditableRecordDraft | null {
  const person = workspace.recordSet.people.find((item) => item.id === recordId)
  if (person) {
    return {
      categoryId: "demographics" as const,
      fieldValues: {
        addressText: person.addressText ?? "",
        administrativeGender: person.administrativeGender ?? "",
        dateOfBirth: person.dateOfBirth ?? "",
        displayName: person.displayName,
        note: "",
        preferredLanguage: person.preferredLanguage ?? "",
        sexAtBirth: person.sexAtBirth ?? "",
      },
      kind: "person" as const,
      subjectPersonId: person.id,
    }
  }

  const observation = workspace.recordSet.observations.find((item) => item.id === recordId)
  if (observation) {
    const categoryId: RecordCategoryId = observation.category === "laboratory" ? "labs" : "other"
    return {
      categoryId,
      fieldValues: {
        codeText: conceptText(observation.code),
        effectiveDate: observation.effectiveDate ?? observation.effectiveDateTime?.slice(0, 10) ?? observation.effectivePeriod?.start?.slice(0, 10) ?? "",
        interpretation: observation.interpretation ?? "",
        note: observation.note ?? "",
        performerText: observation.performerText ?? "",
        result: observationValueText(observation.value),
        sourceText: observation.sourceText ?? "",
        status: observation.status,
      },
      kind: "observation" as const,
      subjectPersonId: observation.subjectPersonId,
    }
  }

  const historyItem = workspace.recordSet.healthHistoryItems.find((item) => item.id === recordId)
  if (historyItem) {
    return {
      categoryId: "history" as const,
      fieldValues: {
        date: historyItem.date ?? "",
        note: historyItem.note ?? "",
        relatedPersonText: historyItem.relatedPersonText ?? "",
        relationshipText: historyItem.relationshipText ?? "",
        section: historyItem.section,
        status: historyItem.status,
        title: historyItem.title,
      },
      historySectionId: historyItem.section,
      kind: "health_history_item" as const,
      subjectPersonId: historyItem.subjectPersonId,
    }
  }

  const allergy = workspace.recordSet.allergyIntolerances.find((item) => item.id === recordId)
  if (allergy) {
    const reaction = allergy.reactions[0]
    return {
      categoryId: "allergies" as const,
      fieldValues: {
        category: allergy.categories[0] ?? "",
        clinicalStatus: allergy.clinicalStatus,
        criticality: allergy.criticality,
        lastOccurrenceDate: allergy.lastOccurrenceDate ?? "",
        manifestationText: reaction?.manifestations.map(conceptText).join(", ") ?? "",
        note: allergy.note ?? "",
        onsetDate: allergy.onsetDate ?? "",
        reactionSeverity: reaction?.severity ?? "unknown",
        substanceText: conceptText(allergy.substance),
        type: allergy.type,
        verificationStatus: allergy.verificationStatus,
      },
      kind: "allergy_intolerance" as const,
      subjectPersonId: allergy.subjectPersonId,
    }
  }

  const medication = workspace.recordSet.medicationUses.find((item) => item.id === recordId)
  if (medication) {
    return {
      categoryId: "medications" as const,
      fieldValues: {
        doseText: medication.doseText ?? "",
        endDate: medication.endDate ?? "",
        frequencyText: medication.frequencyText ?? "",
        medicationText: conceptText(medication.medication),
        note: medication.note ?? "",
        prescriberText: medication.prescriberText ?? "",
        reasonText: conceptText(medication.reason) === "Unknown" ? "" : conceptText(medication.reason),
        routeText: medication.routeText ?? "",
        startDate: medication.startDate ?? "",
        status: medication.status,
      },
      kind: "medication_use" as const,
      subjectPersonId: medication.subjectPersonId,
    }
  }

  const encounter = workspace.recordSet.encounters.find((item) => item.id === recordId)
  if (encounter) {
    return {
      categoryId: "visits" as const,
      fieldValues: {
        class: encounter.class,
        date: encounter.date ?? encounter.period?.start?.slice(0, 10) ?? "",
        locationText: encounter.locationText ?? "",
        note: encounter.note ?? "",
        organizationText: encounter.organizationText ?? "",
        providerText: encounter.providerText ?? "",
        reasonText: conceptText(encounter.reason) === "Unknown" ? "" : conceptText(encounter.reason),
        status: encounter.status,
        title: encounter.title,
      },
      kind: "encounter" as const,
      subjectPersonId: encounter.subjectPersonId,
    }
  }

  const immunization = workspace.recordSet.immunizations.find((item) => item.id === recordId)
  if (immunization) {
    return {
      categoryId: "immunizations" as const,
      fieldValues: {
        doseText: immunization.doseText ?? "",
        lotNumber: immunization.lotNumber ?? "",
        manufacturerText: immunization.manufacturerText ?? "",
        note: immunization.note ?? "",
        occurrenceDate: immunization.occurrenceDate,
        performerText: immunization.performerText ?? "",
        routeText: immunization.routeText ?? "",
        siteText: immunization.siteText ?? "",
        status: immunization.status,
        vaccineText: conceptText(immunization.vaccine),
      },
      kind: "immunization" as const,
      subjectPersonId: immunization.subjectPersonId,
    }
  }

  const report = workspace.recordSet.diagnosticReports.find((item) => item.id === recordId)
  if (report) {
    const categoryId: RecordCategoryId =
      report.category === "imaging" ? "imaging" : report.category === "pathology" ? "pathology" : "diagnostic_reports"
    return {
      categoryId,
      fieldValues: {
        category: report.category,
        codeText: conceptText(report.code) === "Unknown" ? "" : conceptText(report.code),
        conclusionText: report.conclusionText ?? "",
        effectiveDate: report.effectiveDate ?? report.issuedAt?.slice(0, 10) ?? "",
        note: report.note ?? "",
        performerText: report.performerText ?? "",
        status: report.status,
        title: report.title,
      },
      kind: "diagnostic_report" as const,
      subjectPersonId: report.subjectPersonId,
    }
  }

  return null
}

function replaceById<T extends { id: string }>(items: T[], nextItem: T) {
  return items.map((item) => (item.id === nextItem.id ? nextItem : item))
}

function updateRecordSetWithDomainRecord(
  workspace: HealthViewWorkspace,
  input: {
    domainRecord: ReturnType<typeof createManualDomainRecord>
    healthRecord: HealthRecord
    kind: CreateManualRecordInput["kind"]
    now: string
    title: string
  },
): HealthViewWorkspace["recordSet"] {
  const evidenceArtifactIds = new Set(input.healthRecord.evidence.map((evidence) => evidence.artifactId))
  const evidenceDocumentIds = new Set(
    input.healthRecord.evidence.map((evidence) => evidence.documentId).filter((id): id is string => Boolean(id)),
  )
  const editedProvenanceId = uniqueId(`provenance_edited_${input.healthRecord.id}`, new Set(workspace.recordSet.provenanceEvents.map((event) => event.id)))
  const baseRecordSet: HealthViewWorkspace["recordSet"] = {
    ...workspace.recordSet,
    artifacts: workspace.recordSet.artifacts.map((artifact) =>
      evidenceArtifactIds.has(artifact.id)
        ? {
            ...artifact,
            observedAt: input.healthRecord.effectiveStart,
            title: input.title,
          }
        : artifact,
    ),
    documents: workspace.recordSet.documents.map((document) =>
      evidenceDocumentIds.has(document.id)
        ? {
            ...document,
            documentDate: input.healthRecord.effectiveStart,
            title: input.title,
          }
        : document,
    ),
    healthRecords: replaceById(workspace.recordSet.healthRecords, input.healthRecord),
    provenanceEvents: [
      ...workspace.recordSet.provenanceEvents,
      {
        id: editedProvenanceId,
        type: "edited" as const,
        occurredAt: input.now,
        actor: "user" as const,
        inputIds: [input.healthRecord.id],
        outputIds: [input.healthRecord.id],
        method: "assistant_record_tool",
        notes: "Record fields edited through the HealthView OS assistant.",
      },
    ],
  }

  switch (input.kind) {
    case "allergy_intolerance": {
      const current = workspace.recordSet.allergyIntolerances.find((item) => item.id === input.healthRecord.id)
      return {
        ...baseRecordSet,
        allergyIntolerances: replaceById(
          workspace.recordSet.allergyIntolerances,
          { ...current, ...(input.domainRecord as AllergyIntolerance) },
        ),
      }
    }
    case "diagnostic_report": {
      const current = workspace.recordSet.diagnosticReports.find((item) => item.id === input.healthRecord.id)
      const next = input.domainRecord as DiagnosticReport
      return {
        ...baseRecordSet,
        diagnosticReports: replaceById(workspace.recordSet.diagnosticReports, {
          ...current,
          ...next,
          documentIds: current?.documentIds.length ? current.documentIds : next.documentIds,
          resultObservationIds: current?.resultObservationIds ?? next.resultObservationIds,
        }),
      }
    }
    case "encounter": {
      const current = workspace.recordSet.encounters.find((item) => item.id === input.healthRecord.id)
      const next = input.domainRecord as Encounter
      return {
        ...baseRecordSet,
        encounters: replaceById(workspace.recordSet.encounters, {
          ...current,
          ...next,
          linkedConditionIds: current?.linkedConditionIds ?? next.linkedConditionIds,
          linkedDocumentIds: current?.linkedDocumentIds ?? next.linkedDocumentIds,
          linkedObservationIds: current?.linkedObservationIds ?? next.linkedObservationIds,
          period: current?.period,
          type: current?.type,
        }),
      }
    }
    case "health_history_item":
      return {
        ...baseRecordSet,
        healthHistoryItems: replaceById(
          workspace.recordSet.healthHistoryItems,
          { ...(input.domainRecord as HealthHistoryItem) },
        ),
      }
    case "immunization":
      return {
        ...baseRecordSet,
        immunizations: replaceById(workspace.recordSet.immunizations, input.domainRecord as Immunization),
      }
    case "medication_use":
      return {
        ...baseRecordSet,
        medicationUses: replaceById(workspace.recordSet.medicationUses, input.domainRecord as MedicationUse),
      }
    case "observation": {
      const current = workspace.recordSet.observations.find((item) => item.id === input.healthRecord.id)
      const next = input.domainRecord as Observation
      return {
        ...baseRecordSet,
        observations: replaceById(workspace.recordSet.observations, {
          ...current,
          ...next,
          bodySite: current?.bodySite,
          components: current?.components ?? next.components,
          effectiveDateTime: current?.effectiveDateTime,
          effectivePeriod: current?.effectivePeriod,
          issuedAt: current?.issuedAt,
          methodText: current?.methodText,
          referenceRanges: current?.referenceRanges ?? next.referenceRanges,
        }),
      }
    }
    case "person": {
      const current = workspace.recordSet.people.find((item) => item.id === input.healthRecord.id)
      const next = input.domainRecord as Person
      return {
        ...baseRecordSet,
        people: replaceById(workspace.recordSet.people, {
          ...current,
          ...next,
          addresses: current?.addresses ?? next.addresses,
          contactPoints: current?.contactPoints ?? next.contactPoints,
          delegatedAccess: current?.delegatedAccess ?? next.delegatedAccess,
          emergencyContacts: current?.emergencyContacts ?? next.emergencyContacts,
          identifiers: current?.identifiers ?? next.identifiers,
          relatedPersons: current?.relatedPersons ?? next.relatedPersons,
        }),
      }
    }
  }
}

export function buildWorkspaceViewModels(workspace: HealthViewWorkspace | null): WorkspaceViewModels {
  const activePerson = activePersonFor(workspace)
  const rowsByCategory = buildRecordsByCategory(workspace)
  const billingRowsBySection = buildBillingRows(workspace)

  return {
    activePerson,
    billing: {
      rowsBySection: billingRowsBySection,
      summary: selectWorkspaceSummary(workspace),
    },
    health: {
      readiness: selectSystemReadiness(workspace),
      systemRows: selectSystemRows(workspace),
      systemStatus: selectSystemStatus(workspace),
      systemStatusRows: selectSystemStatusRows(workspace),
      upcomingCare: selectUpcomingCare(workspace),
      vitals: selectVitals(workspace),
      warningSigns: selectWarningSigns(workspace),
    },
    records: {
      countsByCategory: Object.fromEntries(
        recordCategories.map((category) => [
          category.id,
          category.id === "demographics" && activePerson ? 1 : rowsByCategory[category.id].length,
        ]),
      ) as Record<RecordCategoryId, number>,
      detailGroupsById: buildDetailGroupsById(workspace),
      rowsByCategory,
      sourceRowsByRecordId: buildSourceRowsByRecordId(workspace),
      sources: sourceRows(workspace),
    },
    services: {
      rows: buildServiceRows(workspace),
    },
    settings: {
      summary: selectWorkspaceSummary(workspace),
    },
  }
}

export function activePersonFor(workspace: HealthViewWorkspace | null) {
  const activePersonId = activePersonIdFor(workspace)
  return workspace?.recordSet.people.find((person) => person.id === activePersonId) ?? workspace?.recordSet.people[0]
}

function activePersonIdFor(workspace: HealthViewWorkspace | null) {
  return workspace?.settings.activePersonId ?? workspace?.recordSet.people[0]?.id
}

function isActivePersonRecord(subjectPersonId: string | undefined, activePersonId: string | undefined) {
  return !activePersonId || !subjectPersonId || subjectPersonId === activePersonId
}

function evidenceReferencesActivePerson(
  workspace: HealthViewWorkspace,
  evidence: EvidenceBackedClaim["evidence"],
  activePersonId: string | undefined,
) {
  if (!activePersonId) return true
  const sourceArtifactIds = new Set(evidence.map((summary) => summary.sourceArtifactId))
  return workspace.recordSet.documents.some(
    (document) => sourceArtifactIds.has(document.artifactId) && document.subjectPersonIds.includes(activePersonId),
  )
}

export function selectVitals(workspace: HealthViewWorkspace | null): VisualVitalMetric[] {
  if (!workspace?.recordSet.visualVitals.length) return sampleVitals

  const activePersonId = activePersonIdFor(workspace)
  const activeVitals = workspace.recordSet.visualVitals.filter((vital) =>
    evidenceReferencesActivePerson(workspace, vital.evidence, activePersonId),
  )

  return activeVitals.length ? activeVitals : sampleVitals
}

export function selectWarningSigns(workspace: HealthViewWorkspace | null): WarningSign[] {
  if (!workspace?.recordSet.warningSigns.length) return sampleWarningSigns

  const activePersonId = activePersonIdFor(workspace)
  const activeWarningSigns = workspace.recordSet.warningSigns.filter((warningSign) =>
    isActivePersonRecord(warningSign.subjectPersonId, activePersonId),
  )

  return activeWarningSigns.length ? activeWarningSigns : sampleWarningSigns
}

export function selectSystemRows(workspace: HealthViewWorkspace | null): HealthMapSignal[] {
  const activePersonId = activePersonIdFor(workspace)
  const workspaceRows = (workspace?.recordSet.healthMapSignals ?? []).filter((row) =>
    isActivePersonRecord(row.subjectPersonId, activePersonId),
  )
  const templateRows = sampleSystemRows.filter(
    (sampleRow, index, rows) => rows.findIndex((row) => row.bodySystem === sampleRow.bodySystem) === index,
  )

  if (!workspaceRows.length) return templateRows

  return templateRows.map((sampleRow) => {
    const workspaceRow = workspaceRows.find(
      (row) =>
        row.id === sampleRow.id ||
        row.bodySystem === sampleRow.bodySystem ||
        row.label.toLowerCase() === sampleRow.label.toLowerCase(),
    )

    if (!workspaceRow) return sampleRow

    return {
      ...workspaceRow,
      bodySystem: sampleRow.bodySystem,
      description: sampleRow.description,
      id: sampleRow.id,
      label: sampleRow.label,
      title: sampleRow.title,
    }
  })
}

export function selectSystemReadiness(workspace: HealthViewWorkspace | null): number {
  const rows = selectSystemRows(workspace)
  const total = rows.reduce((sum, row) => sum + row.score, 0)
  return rows.length ? Math.round(total / rows.length) : 82
}

export function selectSystemStatus(workspace: HealthViewWorkspace | null): EvidenceBackedClaim {
  const rows = selectSystemRows(workspace)
  const evidence = rows.flatMap((row) => row.evidence).slice(0, 3)

  if (!workspace || !evidence.length) return sampleSystemStatus

  const readiness = selectSystemReadiness(workspace)
  const latestUpdate =
    rows
      .map((row) => row.lastUpdatedAt)
      .sort()
      .at(-1) ?? sampleSystemStatus.lastUpdatedAt

  return {
    ...sampleSystemStatus,
    confidence: readiness >= 75 ? "high" : readiness >= 50 ? "medium" : "low",
    description: `${rows.length} body-system signals are loaded from the local workspace.`,
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
    { label: "Unreviewed signals", value: String(selectWarningSigns(workspace).length) },
    { label: "Evidence coverage", value: `${evidenceCoveragePercent(workspace)}%` },
  ]
}

export function selectUpcomingCare(workspace: HealthViewWorkspace | null): UpcomingCareItem[] {
  if (!workspace) return sampleUpcomingCare

  const activePersonId = activePersonIdFor(workspace)
  const encounters = workspace.recordSet.encounters
    .filter((encounter) => isActivePersonRecord(encounter.subjectPersonId, activePersonId))
    .filter((encounter) => encounter.status === "planned")
    .map((encounter) => ({
      detail: [formatDateLabel(encounter.date), encounter.providerText].filter(Boolean).join(" - "),
      title: encounter.title,
    }))

  const authorizations = workspace.recordSet.authorizations
    .filter((authorization) => isActivePersonRecord(authorization.subjectPersonId, activePersonId))
    .filter((authorization) => authorization.status === "approved" || authorization.status === "pending")
    .map((authorization) => ({
      detail: [authorization.status, authorization.expirationDate ? `expires ${formatDateLabel(authorization.expirationDate)}` : ""]
        .filter(Boolean)
        .join(" - "),
      title: authorization.title,
    }))

  const medicationOrders = workspace.recordSet.medicationOrders
    .filter((order) => isActivePersonRecord(order.subjectPersonId, activePersonId))
    .filter((order) => order.status === "active")
    .map((order) => ({
      detail: [order.quantityText, order.prescriberText].filter(Boolean).join(" - "),
      title: `${conceptText(order.medication)} order`,
    }))

  const careItems = [...encounters, ...authorizations, ...medicationOrders].filter((item) => item.detail)
  return careItems.length ? careItems.slice(0, 3) : sampleUpcomingCare
}

export function selectWorkspaceSummary(workspace: HealthViewWorkspace | null): SystemStatusRow[] {
  if (!workspace) {
    return [
      { label: "Vault", value: "Opening" },
      { label: "Storage", value: "Local workspace" },
      { label: "Schema", value: "HealthViewWorkspace" },
    ]
  }

  const activePerson = activePersonFor(workspace)
  return [
    { label: "Vault", value: workspace.vault.label },
    { label: "Active person", value: activePerson?.displayName ?? "Not selected" },
    { label: "Artifacts", value: String(workspace.recordSet.artifacts.length) },
    { label: "Canonical records", value: String(canonicalRecordCount(workspace)) },
    { label: "Storage", value: "Local workspace" },
  ]
}

export function buildRecordsByCategory(workspace: HealthViewWorkspace | null): Record<RecordCategoryId, WorkspaceListRow[]> {
  const rows = emptyRecordCategoryRows()
  if (!workspace) return rows

  const activePersonId = activePersonIdFor(workspace)
  const active = (subjectPersonId?: string) => isActivePersonRecord(subjectPersonId, activePersonId)
  const add = (categoryId: RecordCategoryId, row: WorkspaceListRow) => rows[categoryId].push({ ...row, categoryId })

  for (const person of workspace.recordSet.people) {
    if (!active(person.id)) continue
    add("demographics", {
      id: person.id,
      meta: person.active ? "Active" : "Inactive",
      subtitle: [person.dateOfBirth ? `Born ${formatDateLabel(person.dateOfBirth)}` : "", person.addressText].filter(Boolean).join(" - "),
      title: person.displayName,
    })
  }

  for (const item of workspace.recordSet.medicationUses.filter((item) => active(item.subjectPersonId))) {
    add("medications", medicationRow(item))
  }
  for (const item of workspace.recordSet.medicationOrders.filter((item) => active(item.subjectPersonId))) {
    add("medications", medicationOrderRow(item))
  }
  for (const item of workspace.recordSet.medicationDispenses.filter((item) => active(item.subjectPersonId))) {
    add("medications", medicationDispenseRow(item))
  }
  for (const item of workspace.recordSet.conditions.filter((item) => active(item.subjectPersonId))) {
    add("history", {
      id: item.id,
      meta: readableToken(item.clinicalStatus),
      subtitle: [readableToken(item.category), item.onsetDate ? `since ${formatDateLabel(item.onsetDate)}` : ""].filter(Boolean).join(" - "),
      title: conceptText(item.code),
    })
  }
  for (const item of workspace.recordSet.healthHistoryItems.filter((item) => active(item.subjectPersonId))) {
    add("history", {
      id: item.id,
      meta: readableToken(item.status),
      subtitle: [historySectionLabel(item.section), item.date ? formatDateLabel(item.date) : ""].filter(Boolean).join(" - "),
      title: item.title,
    })
  }
  for (const item of workspace.recordSet.allergyIntolerances.filter((item) => active(item.subjectPersonId))) {
    add("allergies", {
      id: item.id,
      meta: readableToken(item.clinicalStatus),
      subtitle: [readableToken(item.type), readableToken(item.criticality)].filter(Boolean).join(" - "),
      title: conceptText(item.substance),
    })
  }
  for (const item of workspace.recordSet.encounters.filter((item) => active(item.subjectPersonId))) {
    add("visits", {
      id: item.id,
      meta: readableToken(item.status),
      subtitle: [formatDateLabel(item.date ?? item.period?.start), item.providerText].filter(Boolean).join(" - "),
      title: item.title,
    })
  }
  for (const item of workspace.recordSet.observations.filter((item) => active(item.subjectPersonId))) {
    add(item.category === "laboratory" ? "labs" : "other", observationRow(item))
  }
  for (const item of workspace.recordSet.immunizations.filter((item) => active(item.subjectPersonId))) {
    add("immunizations", {
      id: item.id,
      meta: readableToken(item.status),
      subtitle: [formatDateLabel(item.occurrenceDate), item.performerText].filter(Boolean).join(" - "),
      title: conceptText(item.vaccine),
    })
  }
  for (const item of workspace.recordSet.diagnosticReports.filter((item) => active(item.subjectPersonId))) {
    const target = item.category === "imaging" ? "imaging" : item.category === "pathology" ? "pathology" : "diagnostic_reports"
    add(target, {
      id: item.id,
      meta: readableToken(item.status),
      subtitle: [readableToken(item.category), formatDateLabel(item.effectiveDate ?? item.issuedAt)].filter(Boolean).join(" - "),
      title: item.title,
    })
  }

  return rows
}

function emptyRecordCategoryRows() {
  const rows = {} as Record<RecordCategoryId, WorkspaceListRow[]>
  for (const category of recordCategories) {
    rows[category.id] = []
  }
  return rows
}

export function buildBillingRows(workspace: HealthViewWorkspace | null): Record<BillingSectionId, WorkspaceListRow[]> {
  const rows = {} as Record<BillingSectionId, WorkspaceListRow[]>
  for (const section of billingSections) {
    rows[section.id] = []
  }
  if (!workspace) return rows

  const activePersonId = activePersonIdFor(workspace)
  const active = (subjectPersonId?: string) => isActivePersonRecord(subjectPersonId, activePersonId)
  const push = (section: BillingSectionId, row: WorkspaceListRow) => rows[section].push(row)

  for (const bill of workspace.recordSet.bills.filter((item) => active(item.subjectPersonId))) push("bills", billRow(bill))
  for (const payment of workspace.recordSet.payments.filter((item) => active(item.subjectPersonId))) push("bills", paymentRow(payment))
  for (const claim of workspace.recordSet.claims.filter((item) => active(item.subjectPersonId))) push("claims", claimRow(claim))
  for (const authorization of workspace.recordSet.authorizations.filter((item) => active(item.subjectPersonId))) {
    push("authorizations", authorizationRow(authorization))
  }

  for (const item of workspace.billingItems.filter((item) => active(item.subjectPersonId))) {
    const section = item.category === "claim" ? "claims" : item.category === "authorization" ? "authorizations" : "bills"
    push(section, {
      detail: moneyText(item.amountCents, item.currency),
      id: item.id,
      meta: readableToken(item.status),
      subtitle: item.description,
      title: item.title,
    })
  }

  return rows
}

export function buildServiceRows(workspace: HealthViewWorkspace | null): WorkspaceListRow[] {
  if (!workspace) return []

  return [
    ...workspace.serviceItems.map((item) => serviceItemRow(item)),
    ...workspace.recordSet.providers.map((provider) => ({
      id: provider.id,
      meta: provider.active ? "Active" : "Inactive",
      subtitle: [provider.specialty ? conceptText(provider.specialty) : "", provider.note].filter(Boolean).join(" - "),
      title: provider.name,
    })),
    ...workspace.recordSet.organizations.map((organization) => ({
      id: organization.id,
      meta: readableToken(organization.type),
      subtitle: organization.address?.text ?? organization.note,
      title: organization.name,
    })),
  ]
}

function buildDetailGroupsById(workspace: HealthViewWorkspace | null) {
  const groups: Record<string, WorkspaceDetailGroup[]> = {}
  if (!workspace) return groups

  for (const person of workspace.recordSet.people) {
    groups[person.id] = [
      {
        id: `${person.id}_demographics`,
        title: "Demographics",
        rows: compactRows([
          ["Name", person.displayName],
          ["Date of birth", person.dateOfBirth],
          ["Sex at birth", readableToken(person.sexAtBirth)],
          ["Administrative gender", readableToken(person.administrativeGender)],
          ["Address", person.addressText ?? person.addresses[0]?.text],
          ["Language", person.preferredLanguage],
        ]),
      },
    ]
  }

  for (const observation of workspace.recordSet.observations) {
    groups[observation.id] = [
      {
        id: `${observation.id}_observation`,
        title: "Observation",
        rows: compactRows([
          ["Code", conceptText(observation.code)],
          ["Category", readableToken(observation.category)],
          ["Value", observationValueText(observation.value) || observation.components.map((component) => `${conceptText(component.code)} ${observationValueText(component.value)}`).join("; ")],
          ["Date", formatDateLabel(observation.effectiveDateTime ?? observation.effectiveDate ?? observation.effectivePeriod?.start)],
          ["Status", readableToken(observation.status)],
          ["Interpretation", readableToken(observation.interpretation)],
          ["Performer", observation.performerText],
          ["Source", observation.sourceText],
        ]),
      },
    ]
  }

  const recordRows: Array<{ id: string; rows: Array<[string, string | undefined]>; title: string }> = [
    ...workspace.recordSet.conditions.map((item) => ({
      id: item.id,
      title: "Condition",
      rows: [
        ["Condition", conceptText(item.code)],
        ["Category", readableToken(item.category)],
        ["Clinical status", readableToken(item.clinicalStatus)],
        ["Verification", readableToken(item.verificationStatus)],
        ["Onset", formatDateLabel(item.onsetDate)],
        ["Note", item.note],
      ] satisfies Array<[string, string | undefined]>,
    })),
    ...workspace.recordSet.healthHistoryItems.map((item) => ({
      id: item.id,
      title: "History",
      rows: [
        ["Title", item.title],
        ["Section", historySectionLabel(item.section)],
        ["Status", readableToken(item.status)],
        ["Date", formatDateLabel(item.date)],
        ["Note", item.note],
      ] satisfies Array<[string, string | undefined]>,
    })),
    ...workspace.recordSet.allergyIntolerances.map((item) => ({
      id: item.id,
      title: "Allergy",
      rows: allergyRows(item),
    })),
    ...workspace.recordSet.medicationUses.map((item) => ({
      id: item.id,
      title: "Medication",
      rows: medicationRows(item),
    })),
  ]

  for (const record of recordRows) {
    groups[record.id] = [{ id: `${record.id}_details`, rows: compactRows(record.rows), title: record.title }]
  }

  return groups
}

function buildSourceRowsByRecordId(workspace: HealthViewWorkspace | null) {
  const output: Record<string, WorkspaceListRow[]> = {}
  if (!workspace) return output

  const artifactById = new Map(workspace.recordSet.artifacts.map((artifact) => [artifact.id, artifact]))
  for (const record of workspace.recordSet.healthRecords) {
    output[record.id] = record.evidence
      .map((evidence) => artifactById.get(evidence.artifactId))
      .filter((artifact) => artifact !== undefined)
      .map((artifact) => ({
        id: artifact.id,
        meta: readableToken(artifact.freshness),
        subtitle: readableToken(artifact.kind),
        title: artifact.title,
      }))
  }

  return output
}

function sourceRows(workspace: HealthViewWorkspace | null) {
  return (
    workspace?.recordSet.artifacts.slice(0, 8).map((artifact) => ({
      id: artifact.id,
      meta: readableToken(artifact.freshness),
      subtitle: readableToken(artifact.kind),
      title: artifact.title,
    })) ?? []
  )
}

export function buildHealthContextSummary(workspace: HealthViewWorkspace | null): HealthContextSummary {
  if (!workspace) {
    return {
      limitations: ["The local workspace is not loaded."],
      status: "unavailable",
    }
  }

  const activePersonId = activePersonIdFor(workspace)
  const activePerson = activePersonFor(workspace)
  const isActive = (subjectPersonId?: string) => isActivePersonRecord(subjectPersonId, activePersonId)
  const recordSet = workspace.recordSet

  const activeConditions = recordSet.conditions
    .filter((condition) => isActive(condition.subjectPersonId))
    .filter((condition) => ["active", "recurrence", "relapse", "unknown"].includes(condition.clinicalStatus))
    .map((condition) => ({
      detail: conceptText(condition.code),
      status: condition.clinicalStatus,
      title: conceptText(condition.code),
    }))

  const activeAllergies = recordSet.allergyIntolerances
    .filter((allergy) => isActive(allergy.subjectPersonId))
    .filter((allergy) => ["active", "unknown"].includes(allergy.clinicalStatus))
    .map((allergy) => ({
      detail: [allergy.type, allergy.criticality].join(", "),
      status: allergy.clinicalStatus,
      title: conceptText(allergy.substance),
    }))

  const medications = recordSet.medicationUses
    .filter((medication) => isActive(medication.subjectPersonId))
    .filter((medication) => ["active", "intended", "on_hold", "unknown"].includes(medication.status))
    .map((medication) => ({
      date: medication.startDate,
      detail: [medication.doseText, medication.frequencyText, medication.routeText].filter(Boolean).join(", "),
      status: medication.status,
      title: conceptText(medication.medication),
    }))

  const medicationOrders = recordSet.medicationOrders
    .filter((order) => isActive(order.subjectPersonId))
    .filter((order) => ["active", "draft", "on_hold", "unknown"].includes(order.status))
    .map((order) => ({
      date: order.authoredDate,
      detail: [order.doseText, order.frequencyText, order.quantityText].filter(Boolean).join(", "),
      status: order.status,
      title: `${conceptText(order.medication)} order`,
    }))

  const organizationsById = new Map(recordSet.organizations.map((organization) => [organization.id, organization]))
  const locationsById = new Map(recordSet.locations.map((location) => [location.id, location]))
  const savedProviders = recordSet.providers.map((provider) => {
    const organization = provider.organizationId ? organizationsById.get(provider.organizationId) : undefined
    const locationNames = provider.locationIds
      .map((locationId) => locationsById.get(locationId)?.name)
      .filter(Boolean)

    return {
      detail: [provider.specialty?.text, organization?.name, ...locationNames].filter(Boolean).join(", "),
      status: provider.active ? "active" : "inactive",
      title: provider.name,
    }
  })
  const savedOrganizations = recordSet.organizations.map((organization) => ({
    detail: organization.note ?? organization.type,
    status: organization.active ? "active" : "inactive",
    title: organization.name,
  }))
  const savedLocations = recordSet.locations.map((location) => ({
    detail: [location.type, location.note].filter(Boolean).join(", "),
    status: location.status,
    title: location.name,
  }))
  const savedServices = workspace.serviceItems
    .filter((service) => isActive(service.subjectPersonId))
    .map((service) => ({
      detail: service.description ?? service.category,
      status: service.status,
      title: service.title,
    }))

  return {
    activePerson: activePerson?.displayName,
    allergies: activeAllergies.slice(0, SECTION_LIMIT),
    conditions: activeConditions.slice(0, SECTION_LIMIT),
    healthMapSignals: recordSet.healthMapSignals
      .filter((signal) => isActive(signal.subjectPersonId))
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
      .filter((observation) => isActive(observation.subjectPersonId))
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
      .filter((encounter) => isActive(encounter.subjectPersonId))
      .map((encounter) => ({
        date: encounter.date ?? encounter.period?.start,
        detail: [encounter.providerText, encounter.organizationText, encounter.reason ? conceptText(encounter.reason) : ""].filter(Boolean).join(", "),
        status: encounter.status,
        title: encounter.title,
      }))
      .sort((left, right) => compareByDateDesc(left.date, right.date))
      .slice(0, SECTION_LIMIT),
    recordCounts: {
      allergies: recordSet.allergyIntolerances.filter((item) => isActive(item.subjectPersonId)).length,
      conditions: recordSet.conditions.filter((item) => isActive(item.subjectPersonId)).length,
      encounters: recordSet.encounters.filter((item) => isActive(item.subjectPersonId)).length,
      healthMapSignals: recordSet.healthMapSignals.filter((item) => isActive(item.subjectPersonId)).length,
      medications:
        recordSet.medicationUses.filter((item) => isActive(item.subjectPersonId)).length +
        recordSet.medicationOrders.filter((item) => isActive(item.subjectPersonId)).length,
      observations: recordSet.observations.filter((item) => isActive(item.subjectPersonId)).length,
      providers: recordSet.providers.length,
      serviceItems: workspace.serviceItems.filter((item) => isActive(item.subjectPersonId)).length,
      summaries: recordSet.derivedSummaries.filter((item) => isActive(item.subjectPersonId)).length,
      warningSigns: recordSet.warningSigns.filter((item) => isActive(item.subjectPersonId)).length,
    },
    savedCareDirectory: [
      ...savedProviders,
      ...savedOrganizations,
      ...savedLocations,
      ...savedServices,
    ].slice(0, SECTION_LIMIT),
    status: "available",
    summariesAndInsights: [
      ...recordSet.derivedSummaries
        .filter((summary) => isActive(summary.subjectPersonId))
        .map((summary) => ({
          date: summary.generatedAt,
          detail: summary.summaryText,
          status: summary.confidence === undefined ? undefined : String(summary.confidence),
          title: summary.title,
        })),
      ...recordSet.derivedInsights
        .filter((insight) => isActive(insight.subjectPersonId))
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
      .filter((warning) => isActive(warning.subjectPersonId))
      .map((warning) => ({
        date: warning.lastUpdatedAt,
        detail: warning.description,
        status: warning.tone,
        title: warning.title,
      }))
      .slice(0, SECTION_LIMIT),
  }
}

function compactRows(rows: Array<[string, string | undefined]>): WorkspaceDetailRow[] {
  return rows
    .map(([label, value]) => ({ label, value: value?.trim() ?? "" }))
    .filter((row) => row.value)
}

function serviceItemRow(item: ServiceItem): WorkspaceListRow {
  return {
    id: item.id,
    meta: readableToken(item.status),
    subtitle: [readableToken(item.category), item.description].filter(Boolean).join(" - "),
    title: item.title,
  }
}

function medicationRow(item: MedicationUse): WorkspaceListRow {
  return {
    id: item.id,
    meta: readableToken(item.status),
    subtitle: [item.doseText, item.frequencyText, item.routeText].filter(Boolean).join(" - "),
    title: conceptText(item.medication),
  }
}

function medicationOrderRow(item: MedicationOrder): WorkspaceListRow {
  return {
    id: item.id,
    meta: readableToken(item.status),
    subtitle: [item.doseText, item.frequencyText, item.prescriberText].filter(Boolean).join(" - "),
    title: `${conceptText(item.medication)} order`,
  }
}

function medicationDispenseRow(item: MedicationDispense): WorkspaceListRow {
  return {
    id: item.id,
    meta: readableToken(item.status),
    subtitle: [formatDateLabel(item.dispenseDate), item.pharmacyText, item.quantityText].filter(Boolean).join(" - "),
    title: `${conceptText(item.medication)} dispense`,
  }
}

function observationRow(item: Observation): WorkspaceListRow {
  return {
    id: item.id,
    meta: item.interpretation ? readableToken(item.interpretation) : readableToken(item.status),
    subtitle: [observationValueText(item.value), formatDateLabel(item.effectiveDateTime ?? item.effectiveDate ?? item.effectivePeriod?.start)]
      .filter(Boolean)
      .join(" - "),
    title: conceptText(item.code),
  }
}

function allergyRows(item: AllergyIntolerance): Array<[string, string | undefined]> {
  return [
    ["Substance", conceptText(item.substance)],
    ["Type", readableToken(item.type)],
    ["Criticality", readableToken(item.criticality)],
    ["Clinical status", readableToken(item.clinicalStatus)],
    ["Verification", readableToken(item.verificationStatus)],
    ["Last occurrence", formatDateLabel(item.lastOccurrenceDate)],
    ["Note", item.note],
  ]
}

function medicationRows(item: MedicationUse): Array<[string, string | undefined]> {
  return [
    ["Medication", conceptText(item.medication)],
    ["Status", readableToken(item.status)],
    ["Dose", item.doseText],
    ["Route", item.routeText],
    ["Frequency", item.frequencyText],
    ["Start", formatDateLabel(item.startDate)],
    ["End", formatDateLabel(item.endDate)],
    ["Prescriber", item.prescriberText],
    ["Note", item.note],
  ]
}

function billRow(item: Bill): WorkspaceListRow {
  return {
    detail: moneyText(item.amountCents, item.currency),
    id: item.id,
    meta: readableToken(item.status),
    subtitle: [formatDateLabel(item.dueDate ?? item.billDate), item.payeeText].filter(Boolean).join(" - "),
    title: item.title,
  }
}

function paymentRow(item: Payment): WorkspaceListRow {
  return {
    detail: moneyText(item.amountCents, item.currency),
    id: item.id,
    meta: readableToken(item.status),
    subtitle: [formatDateLabel(item.paidAt), item.payeeText].filter(Boolean).join(" - "),
    title: item.title,
  }
}

function claimRow(item: Claim): WorkspaceListRow {
  return {
    detail: moneyText(item.amountCents, item.currency),
    id: item.id,
    meta: readableToken(item.status),
    subtitle: [formatDateLabel(item.serviceDate), item.providerText, item.payerText].filter(Boolean).join(" - "),
    title: item.title,
  }
}

function authorizationRow(item: Authorization): WorkspaceListRow {
  return {
    id: item.id,
    meta: readableToken(item.status),
    subtitle: [item.serviceText, item.expirationDate ? `expires ${formatDateLabel(item.expirationDate)}` : ""].filter(Boolean).join(" - "),
    title: item.title,
  }
}

function conceptText(concept: CodeableConcept | undefined) {
  return concept?.text || concept?.preferredCoding?.display || concept?.preferredCoding?.code || "Unknown"
}

function observationValueText(value: ObservationValue | undefined) {
  if (!value) return ""
  if (value.kind === "quantity") return `${value.comparator ?? ""}${value.value} ${value.unit}`.trim()
  return String(value.value)
}

export function readableToken(value: string | undefined) {
  if (!value) return ""
  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function historySectionLabel(value: string | undefined) {
  return historySections.find((section) => section.id === value)?.label ?? readableToken(value)
}

function moneyText(amountCents: number | undefined, currency = "USD") {
  if (amountCents === undefined) return ""
  return new Intl.NumberFormat("en", {
    currency,
    style: "currency",
  }).format(amountCents / 100)
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

  if (!evidenceBearingRecords.length) return 0
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

export function formatDateLabel(value: string | undefined) {
  if (!value) return ""
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`)
  if (Number.isNaN(date.valueOf())) return value

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(date)
}

function compareByDateDesc(left: string | undefined, right: string | undefined) {
  return dateValue(right) - dateValue(left)
}

function dateValue(value: string | undefined) {
  if (!value) return 0
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`)
  return Number.isNaN(date.valueOf()) ? 0 : date.valueOf()
}
