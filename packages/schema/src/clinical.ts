import { z } from "zod"

import { EvidenceLinkSchema } from "./evidence"
import {
  AddressSchema,
  CodeableConceptSchema,
  ContactPointSchema,
  HealthViewIdSchema,
  HumanNameSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
  PeriodSchema,
  ReferenceRangeSchema,
} from "./primitives"
import { RecordLifecycleStatusSchema, VerificationStatusSchema } from "./records"

export const HealthRecordKindSchema = z.enum([
  "person",
  "observation",
  "condition",
  "health_history_item",
  "allergy_intolerance",
  "medication_use",
  "medication_order",
  "medication_dispense",
  "encounter",
  "immunization",
  "diagnostic_report",
  "provider",
  "organization",
  "location",
  "coverage",
  "claim",
  "bill",
  "payment",
  "authorization",
  "derived_summary",
  "derived_timeline_event",
  "derived_insight",
  "health_map_signal",
  "warning_sign",
])

export const HealthRecordSchema = z.object({
  id: HealthViewIdSchema,
  kind: HealthRecordKindSchema,
  subjectPersonId: HealthViewIdSchema.optional(),
  title: z.string().min(1),
  lifecycleStatus: RecordLifecycleStatusSchema,
  effectiveStart: z.union([IsoDateSchema, IsoDateTimeSchema]).optional(),
  effectiveEnd: z.union([IsoDateSchema, IsoDateTimeSchema]).optional(),
  recordedAt: IsoDateTimeSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  evidence: z.array(EvidenceLinkSchema).min(1),
})

export const PersonSchema = z.object({
  id: HealthViewIdSchema,
  displayName: z.string().min(1),
  names: z.array(HumanNameSchema).default([]),
  dateOfBirth: IsoDateSchema.optional(),
  sexAtBirth: z.enum(["female", "male", "intersex", "unknown", "not_specified"]).optional(),
  administrativeGender: z.enum(["female", "male", "other", "unknown", "not_specified"]).optional(),
  genderIdentity: CodeableConceptSchema.optional(),
  identifiers: z.array(z.object({
    system: z.string().min(1),
    value: z.string().min(1),
    assigner: z.string().min(1).optional(),
    period: PeriodSchema.optional(),
  })).default([]),
  contactPoints: z.array(ContactPointSchema).default([]),
  addresses: z.array(AddressSchema).default([]),
  addressText: z.string().min(1).optional(),
  preferredLanguage: z.string().min(1).optional(),
  emergencyContacts: z
    .array(
      z.object({
        name: z.string().min(1),
        relationship: CodeableConceptSchema.optional(),
        contactPoints: z.array(ContactPointSchema).default([]),
        address: AddressSchema.optional(),
      }),
    )
    .default([]),
  relatedPersons: z
    .array(
      z.object({
        personId: HealthViewIdSchema,
        relationship: z.enum([
          "self",
          "spouse",
          "partner",
          "child",
          "parent",
          "guardian",
          "caregiver",
          "dependent",
          "other",
        ]),
        active: z.boolean().default(true),
        note: z.string().min(1).optional(),
      }),
    )
    .default([]),
  delegatedAccess: z
    .array(
      z.object({
        delegatePersonId: HealthViewIdSchema,
        scope: z.enum(["view", "manage_records", "manage_care", "billing", "full_access"]),
        status: z.enum(["active", "pending", "revoked", "expired"]),
        period: PeriodSchema.optional(),
        note: z.string().min(1).optional(),
      }),
    )
    .default([]),
  active: z.boolean().default(true),
  evidence: z.array(EvidenceLinkSchema).min(1),
})

export const ObservationValueSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("quantity"),
    value: z.number(),
    unit: z.string().min(1),
    ucumCode: z.string().min(1).optional(),
    comparator: z.enum(["<", "<=", ">=", ">"]).optional(),
  }),
  z.object({
    kind: z.literal("text"),
    value: z.string().min(1),
  }),
  z.object({
    kind: z.literal("boolean"),
    value: z.boolean(),
  }),
])

export const ObservationComponentSchema = z.object({
  code: CodeableConceptSchema,
  value: ObservationValueSchema,
  interpretation: z.enum(["low", "normal", "high", "critical", "abnormal", "unknown"]).optional(),
  referenceRanges: z.array(ReferenceRangeSchema).default([]),
})

export const ObservationSchema = z
  .object({
    id: HealthViewIdSchema,
    subjectPersonId: HealthViewIdSchema,
    category: z.enum(["laboratory", "vital_sign", "wearable", "survey", "manual", "other"]),
    code: CodeableConceptSchema,
    effectiveDate: IsoDateSchema.optional(),
    effectiveDateTime: IsoDateTimeSchema.optional(),
    effectivePeriod: PeriodSchema.optional(),
    issuedAt: IsoDateTimeSchema.optional(),
    value: ObservationValueSchema.optional(),
    components: z.array(ObservationComponentSchema).default([]),
    referenceRanges: z.array(ReferenceRangeSchema).default([]),
    interpretation: z.enum(["low", "normal", "high", "critical", "abnormal", "unknown"]).optional(),
    status: z.enum(["registered", "preliminary", "final", "amended", "corrected", "unknown"]),
    performerText: z.string().min(1).optional(),
    sourceText: z.string().min(1).optional(),
    methodText: z.string().min(1).optional(),
    bodySite: CodeableConceptSchema.optional(),
    note: z.string().min(1).optional(),
    evidence: z.array(EvidenceLinkSchema).min(1),
  })
  .refine(
    (value) => value.value || value.components.length > 0,
    "An observation needs a value or at least one component.",
  )
  .refine(
    (value) => value.effectiveDate || value.effectiveDateTime || value.effectivePeriod,
    "An observation needs an effective date, date-time, or period.",
  )

export const ConditionSchema = z.object({
  id: HealthViewIdSchema,
  subjectPersonId: HealthViewIdSchema,
  code: CodeableConceptSchema,
  category: z.enum(["problem", "diagnosis", "symptom", "health_concern", "other"]),
  clinicalStatus: z.enum(["active", "recurrence", "relapse", "inactive", "remission", "resolved", "unknown"]),
  verificationStatus: VerificationStatusSchema,
  severity: CodeableConceptSchema.optional(),
  onsetDate: IsoDateSchema.optional(),
  abatementDate: IsoDateSchema.optional(),
  recordedDate: IsoDateSchema.optional(),
  bodySite: CodeableConceptSchema.optional(),
  encounterId: HealthViewIdSchema.optional(),
  note: z.string().min(1).optional(),
  evidence: z.array(EvidenceLinkSchema).min(1),
})

export const HealthHistoryItemSchema = z.object({
  id: HealthViewIdSchema,
  subjectPersonId: HealthViewIdSchema,
  section: z.enum(["medical", "surgical", "family", "social", "reproductive", "other"]),
  title: z.string().min(1),
  status: z.enum(["current", "past", "unknown", "not_applicable"]).default("unknown"),
  date: IsoDateSchema.optional(),
  relatedPersonText: z.string().min(1).optional(),
  relationshipText: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
  evidence: z.array(EvidenceLinkSchema).min(1),
})

export const AllergyReactionSchema = z.object({
  manifestations: z.array(CodeableConceptSchema).min(1),
  severity: z.enum(["mild", "moderate", "severe", "unknown"]),
  exposureRoute: CodeableConceptSchema.optional(),
  note: z.string().min(1).optional(),
})

export const AllergyIntoleranceSchema = z.object({
  id: HealthViewIdSchema,
  subjectPersonId: HealthViewIdSchema,
  substance: CodeableConceptSchema,
  type: z.enum(["allergy", "intolerance", "unknown"]),
  categories: z.array(z.enum(["food", "medication", "environment", "biologic", "other"])).default([]),
  criticality: z.enum(["low", "high", "unable_to_assess", "unknown"]),
  clinicalStatus: z.enum(["active", "inactive", "resolved", "unknown"]),
  verificationStatus: VerificationStatusSchema,
  onsetDate: IsoDateSchema.optional(),
  lastOccurrenceDate: IsoDateSchema.optional(),
  reactions: z.array(AllergyReactionSchema).default([]),
  note: z.string().min(1).optional(),
  evidence: z.array(EvidenceLinkSchema).min(1),
})

export const MedicationUseSchema = z.object({
  id: HealthViewIdSchema,
  subjectPersonId: HealthViewIdSchema,
  medication: CodeableConceptSchema,
  status: z.enum(["active", "completed", "entered_in_error", "intended", "stopped", "on_hold", "unknown"]),
  doseText: z.string().min(1).optional(),
  routeText: z.string().min(1).optional(),
  frequencyText: z.string().min(1).optional(),
  startDate: IsoDateSchema.optional(),
  endDate: IsoDateSchema.optional(),
  reason: CodeableConceptSchema.optional(),
  prescriberText: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
  evidence: z.array(EvidenceLinkSchema).min(1),
})

export const MedicationOrderSchema = z.object({
  id: HealthViewIdSchema,
  subjectPersonId: HealthViewIdSchema,
  medication: CodeableConceptSchema,
  status: z.enum(["active", "completed", "draft", "entered_in_error", "on_hold", "stopped", "unknown"]),
  intent: z.enum(["proposal", "plan", "order", "original_order", "reflex_order", "filler_order", "unknown"]).default("order"),
  authoredDate: IsoDateSchema.optional(),
  doseText: z.string().min(1).optional(),
  routeText: z.string().min(1).optional(),
  frequencyText: z.string().min(1).optional(),
  quantityText: z.string().min(1).optional(),
  prescriberText: z.string().min(1).optional(),
  organizationText: z.string().min(1).optional(),
  reason: CodeableConceptSchema.optional(),
  note: z.string().min(1).optional(),
  evidence: z.array(EvidenceLinkSchema).min(1),
})

export const MedicationDispenseSchema = z.object({
  id: HealthViewIdSchema,
  subjectPersonId: HealthViewIdSchema,
  medication: CodeableConceptSchema,
  status: z.enum([
    "preparation",
    "in_progress",
    "cancelled",
    "on_hold",
    "completed",
    "entered_in_error",
    "stopped",
    "declined",
    "unknown",
  ]),
  dispenseDate: IsoDateSchema.optional(),
  quantityText: z.string().min(1).optional(),
  daysSupplyText: z.string().min(1).optional(),
  pharmacyText: z.string().min(1).optional(),
  performerText: z.string().min(1).optional(),
  prescriberText: z.string().min(1).optional(),
  prescriptionId: HealthViewIdSchema.optional(),
  note: z.string().min(1).optional(),
  evidence: z.array(EvidenceLinkSchema).min(1),
})

export const EncounterSchema = z.object({
  id: HealthViewIdSchema,
  subjectPersonId: HealthViewIdSchema,
  title: z.string().min(1),
  type: CodeableConceptSchema.optional(),
  class: z.enum(["ambulatory", "inpatient", "emergency", "home_health", "virtual", "other", "unknown"]),
  status: z.enum(["planned", "arrived", "in_progress", "finished", "cancelled", "entered_in_error", "unknown"]),
  date: IsoDateSchema.optional(),
  period: PeriodSchema.optional(),
  reason: CodeableConceptSchema.optional(),
  providerText: z.string().min(1).optional(),
  organizationText: z.string().min(1).optional(),
  locationText: z.string().min(1).optional(),
  linkedObservationIds: z.array(HealthViewIdSchema).default([]),
  linkedConditionIds: z.array(HealthViewIdSchema).default([]),
  linkedDocumentIds: z.array(HealthViewIdSchema).default([]),
  note: z.string().min(1).optional(),
  evidence: z.array(EvidenceLinkSchema).min(1),
})

export const DiagnosticReportSchema = z.object({
  id: HealthViewIdSchema,
  subjectPersonId: HealthViewIdSchema,
  title: z.string().min(1),
  category: z.enum(["laboratory", "imaging", "pathology", "cardiology", "procedure", "other", "unknown"]),
  status: z.enum(["registered", "partial", "preliminary", "final", "amended", "corrected", "appended", "cancelled", "entered_in_error", "unknown"]),
  code: CodeableConceptSchema.optional(),
  effectiveDate: IsoDateSchema.optional(),
  issuedAt: IsoDateTimeSchema.optional(),
  performerText: z.string().min(1).optional(),
  resultObservationIds: z.array(HealthViewIdSchema).default([]),
  documentIds: z.array(HealthViewIdSchema).default([]),
  conclusionText: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
  evidence: z.array(EvidenceLinkSchema).min(1),
})

export const ImmunizationSchema = z.object({
  id: HealthViewIdSchema,
  subjectPersonId: HealthViewIdSchema,
  vaccine: CodeableConceptSchema,
  status: z.enum(["completed", "entered_in_error", "not_done", "unknown"]),
  occurrenceDate: IsoDateSchema,
  lotNumber: z.string().min(1).optional(),
  manufacturerText: z.string().min(1).optional(),
  performerText: z.string().min(1).optional(),
  siteText: z.string().min(1).optional(),
  routeText: z.string().min(1).optional(),
  doseText: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
  evidence: z.array(EvidenceLinkSchema).min(1),
})

export type HealthRecordKind = z.infer<typeof HealthRecordKindSchema>
export type HealthRecord = z.infer<typeof HealthRecordSchema>
export type Person = z.infer<typeof PersonSchema>
export type ObservationValue = z.infer<typeof ObservationValueSchema>
export type ObservationComponent = z.infer<typeof ObservationComponentSchema>
export type Observation = z.infer<typeof ObservationSchema>
export type Condition = z.infer<typeof ConditionSchema>
export type HealthHistoryItem = z.infer<typeof HealthHistoryItemSchema>
export type AllergyReaction = z.infer<typeof AllergyReactionSchema>
export type AllergyIntolerance = z.infer<typeof AllergyIntoleranceSchema>
export type MedicationUse = z.infer<typeof MedicationUseSchema>
export type MedicationOrder = z.infer<typeof MedicationOrderSchema>
export type MedicationDispense = z.infer<typeof MedicationDispenseSchema>
export type Encounter = z.infer<typeof EncounterSchema>
export type DiagnosticReport = z.infer<typeof DiagnosticReportSchema>
export type Immunization = z.infer<typeof ImmunizationSchema>
