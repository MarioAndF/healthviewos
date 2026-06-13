import type { EvidenceBackedClaim } from "./evidence"

export type RecordLifecycleStatus =
  | "active"
  | "inactive"
  | "resolved"
  | "superseded"
  | "entered_in_error"
  | "unknown"

export type VerificationStatus =
  | "confirmed"
  | "unconfirmed"
  | "provisional"
  | "differential"
  | "refuted"
  | "entered_in_error"
  | "unknown"

export type DerivedInsightKind =
  | "timeline"
  | "trend"
  | "summary"
  | "warning_sign"
  | "health_map_signal"
  | "recommendation"
  | "ai_explanation"

export type DerivedInsight = EvidenceBackedClaim & {
  kind: DerivedInsightKind
  subjectPersonId: string
  supportingRecordIds: string[]
  lifecycleStatus: RecordLifecycleStatus
  verificationStatus: VerificationStatus
}
