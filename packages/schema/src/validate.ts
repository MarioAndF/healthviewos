import {
  AllergyIntoleranceSchema,
  AuthorizationSchema,
  BillSchema,
  ClaimSchema,
  ConditionSchema,
  CoverageSchema,
  DiagnosticReportSchema,
  EncounterSchema,
  HealthHistoryItemSchema,
  HealthRecordSchema,
  HealthViewIdSchema,
  ImmunizationSchema,
  IsoDateSchema,
  LocationSchema,
  MedicationDispenseSchema,
  MedicationOrderSchema,
  MedicationUseSchema,
  ObservationSchema,
  OrganizationSchema,
  PaymentSchema,
  PersonSchema,
  ProviderSchema,
  SourceArtifactSchema,
  VaultFileSchema,
} from "./index"

function expectInvalid(label: string, parse: () => unknown) {
  try {
    parse()
  } catch {
    return
  }

  throw new Error(`Expected invalid schema input to fail: ${label}`)
}

const evidence = [
  {
    artifactId: "artifact_manual",
    documentId: "document_manual",
    provenanceEventId: "provenance_manual",
    confidence: 1,
    confidenceLabel: "high",
    freshness: "current",
  },
] as const

const personId = "person_example"

HealthViewIdSchema.parse("person_example")
IsoDateSchema.parse("2026-06-13")

PersonSchema.parse({
  id: personId,
  displayName: "Example Person",
  dateOfBirth: "1988-04-12",
  sexAtBirth: "female",
  administrativeGender: "female",
  identifiers: [],
  contactPoints: [],
  addresses: [],
  emergencyContacts: [],
  relatedPersons: [],
  delegatedAccess: [],
  evidence,
})

HealthRecordSchema.parse({
  id: "condition_example",
  kind: "condition",
  subjectPersonId: personId,
  title: "Example condition",
  lifecycleStatus: "active",
  recordedAt: "2026-06-13T15:00:00Z",
  createdAt: "2026-06-13T15:00:00Z",
  updatedAt: "2026-06-13T15:00:00Z",
  evidence,
})

ObservationSchema.parse({
  id: "observation_example",
  subjectPersonId: personId,
  category: "laboratory",
  code: { text: "Example lab", codings: [] },
  effectiveDate: "2026-06-13",
  value: { kind: "quantity", value: 1, unit: "mg/dL" },
  status: "final",
  evidence,
})

ConditionSchema.parse({
  id: "condition_example",
  subjectPersonId: personId,
  code: { text: "Example condition" },
  category: "diagnosis",
  clinicalStatus: "active",
  verificationStatus: "confirmed",
  evidence,
})

HealthHistoryItemSchema.parse({
  id: "health_history_example",
  subjectPersonId: personId,
  section: "medical",
  title: "Example medical history",
  status: "current",
  date: "2026-06-13",
  evidence,
})

AllergyIntoleranceSchema.parse({
  id: "allergy_intolerance_example",
  subjectPersonId: personId,
  substance: { text: "Example allergen" },
  type: "allergy",
  categories: ["medication"],
  criticality: "unknown",
  clinicalStatus: "active",
  verificationStatus: "confirmed",
  reactions: [{ manifestations: [{ text: "Rash" }], severity: "mild" }],
  evidence,
})

MedicationUseSchema.parse({
  id: "medication_use_example",
  subjectPersonId: personId,
  medication: { text: "Example medication" },
  status: "active",
  doseText: "1 tablet",
  evidence,
})

MedicationOrderSchema.parse({
  id: "medication_order_example",
  subjectPersonId: personId,
  medication: { text: "Example medication" },
  status: "active",
  intent: "order",
  evidence,
})

MedicationDispenseSchema.parse({
  id: "medication_dispense_example",
  subjectPersonId: personId,
  medication: { text: "Example medication" },
  status: "completed",
  evidence,
})

EncounterSchema.parse({
  id: "encounter_example",
  subjectPersonId: personId,
  title: "Example visit",
  class: "ambulatory",
  status: "finished",
  date: "2026-06-13",
  evidence,
})

ImmunizationSchema.parse({
  id: "immunization_example",
  subjectPersonId: personId,
  vaccine: { text: "Example vaccine" },
  status: "completed",
  occurrenceDate: "2026-06-13",
  evidence,
})

DiagnosticReportSchema.parse({
  id: "diagnostic_report_example",
  subjectPersonId: personId,
  title: "Example report",
  category: "laboratory",
  status: "final",
  evidence,
})

OrganizationSchema.parse({
  id: "organization_example",
  name: "Example Organization",
  type: "provider_group",
  evidence,
})

ProviderSchema.parse({
  id: "provider_example",
  name: "Example Provider",
  providerType: "practitioner",
  evidence,
})

LocationSchema.parse({
  id: "location_example",
  name: "Example Location",
  status: "active",
  type: "clinic",
  evidence,
})

CoverageSchema.parse({
  id: "coverage_example",
  subjectPersonId: personId,
  payerText: "Example Payer",
  status: "active",
  evidence,
})

ClaimSchema.parse({
  id: "claim_example",
  subjectPersonId: personId,
  title: "Example claim",
  status: "active",
  claimType: "professional",
  evidence,
})

BillSchema.parse({
  id: "bill_example",
  subjectPersonId: personId,
  title: "Example bill",
  status: "open",
  evidence,
})

PaymentSchema.parse({
  id: "payment_example",
  subjectPersonId: personId,
  title: "Example payment",
  status: "completed",
  evidence,
})

AuthorizationSchema.parse({
  id: "authorization_example",
  subjectPersonId: personId,
  title: "Example authorization",
  status: "approved",
  category: "prior_authorization",
  evidence,
})

SourceArtifactSchema.parse({
  id: "artifact_manual",
  kind: "manual_entry",
  title: "Manual entry",
  originId: "origin_manual",
  acquisitionEventId: "acquisition_manual",
  fileIds: ["file_manual"],
  receivedAt: "2026-06-13T15:00:00Z",
  freshness: "current",
  trustLevel: "user_entered",
})

VaultFileSchema.parse({
  id: "file_manual",
  relativePath: "notes/manual/example.md",
  mediaType: "text/markdown",
})

expectInvalid("invalid id", () => HealthViewIdSchema.parse("Person Example"))
expectInvalid("invalid date", () => IsoDateSchema.parse("2026-02-30"))
expectInvalid("missing evidence", () =>
  ConditionSchema.parse({
    id: "condition_missing_evidence",
    subjectPersonId: personId,
    code: { text: "Missing evidence" },
    category: "diagnosis",
    clinicalStatus: "active",
    verificationStatus: "confirmed",
    evidence: [],
  }),
)
expectInvalid("observation without value or components", () =>
  ObservationSchema.parse({
    id: "observation_missing_value",
    subjectPersonId: personId,
    category: "laboratory",
    code: { text: "Missing value" },
    effectiveDate: "2026-06-13",
    status: "final",
    evidence,
  }),
)
expectInvalid("unsafe relative path", () =>
  VaultFileSchema.parse({
    id: "file_bad",
    relativePath: "../secrets.txt",
    mediaType: "text/plain",
  }),
)

console.log("Validated @healthviewos/schema guards")
