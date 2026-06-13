import { z } from "zod"

import { EvidenceBackedClaimSchema, EvidenceLinkSchema } from "./evidence"
import { ConfidenceScoreSchema, HealthViewIdSchema, IsoDateSchema, IsoDateTimeSchema } from "./primitives"
import { RecordLifecycleStatusSchema, VerificationStatusSchema } from "./records"

export const DerivedSummarySchema = z.object({
  id: HealthViewIdSchema,
  subjectPersonId: HealthViewIdSchema.optional(),
  title: z.string().min(1),
  summaryText: z.string().min(1),
  category: z.enum(["health_overview", "condition_summary", "medication_summary", "billing_summary", "other"]),
  generatedAt: IsoDateTimeSchema,
  method: z.string().min(1),
  inputRecordIds: z.array(HealthViewIdSchema).default([]),
  confidence: ConfidenceScoreSchema.optional(),
  limitations: z.array(z.string().min(1)).default([]),
  evidence: z.array(EvidenceLinkSchema).min(1),
})

export const DerivedTimelineEventSchema = z.object({
  id: HealthViewIdSchema,
  subjectPersonId: HealthViewIdSchema.optional(),
  title: z.string().min(1),
  eventDate: z.union([IsoDateSchema, IsoDateTimeSchema]),
  category: z.enum(["clinical", "medication", "visit", "billing", "source", "derived", "other"]),
  description: z.string().min(1).optional(),
  inputRecordIds: z.array(HealthViewIdSchema).default([]),
  method: z.string().min(1),
  evidence: z.array(EvidenceLinkSchema).min(1),
})

export const DerivedInsightSchema = z.object({
  id: HealthViewIdSchema,
  subjectPersonId: HealthViewIdSchema.optional(),
  title: z.string().min(1),
  category: z.enum(["risk", "trend", "reminder", "gap", "opportunity", "warning_sign", "health_map_signal", "other"]),
  status: z.enum(["active", "dismissed", "resolved", "unknown"]),
  description: z.string().min(1),
  generatedAt: IsoDateTimeSchema,
  dueDate: IsoDateSchema.optional(),
  inputRecordIds: z.array(HealthViewIdSchema).default([]),
  confidence: ConfidenceScoreSchema.optional(),
  evidence: z.array(EvidenceLinkSchema).min(1),
})

export const VisualVitalMetricSchema = EvidenceBackedClaimSchema.extend({
  detail: z.string().min(1),
  score: z.number().min(0).max(100),
  unit: z.string(),
  value: z.string().min(1),
})

export const WarningSignSchema = EvidenceBackedClaimSchema.extend({
  subjectPersonId: HealthViewIdSchema.optional(),
  supportingRecordIds: z.array(HealthViewIdSchema).default([]),
  lifecycleStatus: RecordLifecycleStatusSchema.default("active"),
  verificationStatus: VerificationStatusSchema.default("unknown"),
  tone: z.enum(["attention", "neutral", "watch"]),
})

export const HealthMapSignalSchema = EvidenceBackedClaimSchema.extend({
  subjectPersonId: HealthViewIdSchema.optional(),
  supportingRecordIds: z.array(HealthViewIdSchema).default([]),
  lifecycleStatus: RecordLifecycleStatusSchema.default("active"),
  verificationStatus: VerificationStatusSchema.default("unknown"),
  label: z.string().min(1),
  score: z.number().min(0).max(100),
  value: z.string().min(1),
  bodySystem: z.enum([
    "skin",
    "skeletal",
    "muscular",
    "cardiovascular",
    "nervous",
    "respiratory",
    "digestive",
    "urinary",
    "endocrine",
    "reproductive",
    "immune",
    "metabolic",
    "recovery",
    "other",
  ]),
})

export type DerivedSummary = z.infer<typeof DerivedSummarySchema>
export type DerivedTimelineEvent = z.infer<typeof DerivedTimelineEventSchema>
export type DerivedInsight = z.infer<typeof DerivedInsightSchema>
export type VisualVitalMetric = z.infer<typeof VisualVitalMetricSchema>
export type WarningSign = z.infer<typeof WarningSignSchema>
export type HealthMapSignal = z.infer<typeof HealthMapSignalSchema>
