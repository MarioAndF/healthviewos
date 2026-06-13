import { z } from "zod"

import { ConfidenceScoreSchema, HealthViewIdSchema, IsoDateTimeSchema } from "./primitives"

export const ProvenanceEventTypeSchema = z.enum([
  "imported",
  "manual_entry",
  "classified",
  "extracted",
  "normalized",
  "mapped",
  "derived",
  "corrected",
  "edited",
  "exported",
  "shared",
  "remote_processed",
  "permission_changed",
])

export const ProvenanceEventSchema = z.object({
  id: HealthViewIdSchema,
  type: ProvenanceEventTypeSchema,
  occurredAt: IsoDateTimeSchema,
  actor: z.enum(["user", "healthview_os", "integration", "external_system", "remote_processor"]),
  inputIds: z.array(HealthViewIdSchema).default([]),
  outputIds: z.array(HealthViewIdSchema).default([]),
  method: z.string().min(1).optional(),
  methodVersion: z.string().min(1).optional(),
  confidence: ConfidenceScoreSchema.optional(),
  notes: z.string().min(1).optional(),
})

export type ProvenanceEventType = z.infer<typeof ProvenanceEventTypeSchema>
export type ProvenanceEvent = z.infer<typeof ProvenanceEventSchema>
