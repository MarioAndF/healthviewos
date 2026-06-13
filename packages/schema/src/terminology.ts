import { z } from "zod"

import { ConfidenceScoreSchema, HealthViewIdSchema } from "./primitives"

export const TerminologyMappingSchema = z.object({
  id: HealthViewIdSchema,
  recordId: HealthViewIdSchema,
  fieldPath: z.string().min(1),
  sourceSystem: z.string().min(1).optional(),
  sourceCode: z.string().min(1).optional(),
  sourceDisplay: z.string().min(1).optional(),
  targetSystem: z.string().min(1),
  targetCode: z.string().min(1),
  targetDisplay: z.string().min(1).optional(),
  confidence: ConfidenceScoreSchema,
  method: z.string().min(1),
  mappingStatus: z.enum(["unreviewed", "accepted", "rejected", "needs_review"]).default("unreviewed"),
})

export type TerminologyMapping = z.infer<typeof TerminologyMappingSchema>
