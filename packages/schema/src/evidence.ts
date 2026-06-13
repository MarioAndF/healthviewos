import { z } from "zod"

import { ConfidenceScoreSchema, HealthViewIdSchema, IsoDateTimeSchema } from "./primitives"
import { AcquisitionMethodSchema, SourceFreshnessSchema, SourceTrustLevelSchema } from "./sources"

export const EvidenceConfidenceSchema = z.enum(["high", "medium", "low", "unknown"])

export const EvidenceLinkSchema = z.object({
  id: HealthViewIdSchema.optional(),
  artifactId: HealthViewIdSchema,
  documentId: HealthViewIdSchema.optional(),
  provenanceEventId: HealthViewIdSchema.optional(),
  confidence: ConfidenceScoreSchema.optional(),
  confidenceLabel: EvidenceConfidenceSchema.optional(),
  freshness: SourceFreshnessSchema.optional(),
  fieldPath: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
})

export const EvidenceSummarySchema = z.object({
  id: HealthViewIdSchema,
  sourceArtifactId: HealthViewIdSchema.optional(),
  provenanceEventId: HealthViewIdSchema.optional(),
  sourceName: z.string().min(1),
  sourceTrust: SourceTrustLevelSchema,
  artifactTitle: z.string().min(1),
  acquisitionMethod: AcquisitionMethodSchema,
  confidence: EvidenceConfidenceSchema,
  freshness: SourceFreshnessSchema,
  observedAt: z.string().min(1).optional(),
  acquiredAt: IsoDateTimeSchema,
  note: z.string().min(1).optional(),
})

export const EvidenceBackedClaimSchema = z.object({
  id: HealthViewIdSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  confidence: EvidenceConfidenceSchema,
  freshness: SourceFreshnessSchema,
  generatedBy: z.string().min(1),
  generatedAt: IsoDateTimeSchema,
  lastUpdatedAt: IsoDateTimeSchema,
  evidence: z.array(EvidenceSummarySchema).min(1),
  recommendedAction: z.string().min(1).optional(),
})

export type EvidenceConfidence = z.infer<typeof EvidenceConfidenceSchema>
export type EvidenceLink = z.infer<typeof EvidenceLinkSchema>
export type EvidenceSummary = z.infer<typeof EvidenceSummarySchema>
export type EvidenceBackedClaim = z.infer<typeof EvidenceBackedClaimSchema>
