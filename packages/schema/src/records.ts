import { z } from "zod"

export const RecordLifecycleStatusSchema = z.enum([
  "active",
  "inactive",
  "resolved",
  "superseded",
  "entered_in_error",
  "unknown",
])

export const VerificationStatusSchema = z.enum([
  "confirmed",
  "unconfirmed",
  "provisional",
  "differential",
  "refuted",
  "entered_in_error",
  "unknown",
])

export type RecordLifecycleStatus = z.infer<typeof RecordLifecycleStatusSchema>
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>
