import type { AcquisitionMethod, SourceFreshness, SourceTrustLevel } from "./source"

export type EvidenceConfidence = "high" | "medium" | "low" | "unknown"

export type EvidenceLink = {
  id: string
  recordId: string
  sourceArtifactId: string
  provenanceEventId?: string
  confidence: EvidenceConfidence
  freshness: SourceFreshness
  fieldPath?: string
  note?: string
}

export type EvidenceSummary = {
  id: string
  sourceName: string
  sourceTrust: SourceTrustLevel
  artifactTitle: string
  acquisitionMethod: AcquisitionMethod
  confidence: EvidenceConfidence
  freshness: SourceFreshness
  observedAt?: string
  acquiredAt: string
  note?: string
}

export type EvidenceBackedClaim = {
  id: string
  title: string
  description: string
  confidence: EvidenceConfidence
  freshness: SourceFreshness
  generatedBy: string
  generatedAt: string
  lastUpdatedAt: string
  evidence: EvidenceSummary[]
  recommendedAction?: string
}
