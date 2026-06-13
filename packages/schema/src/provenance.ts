import type { AcquisitionContext } from "./source"

export type ProvenanceEventType =
  | "imported"
  | "manual_entry"
  | "normalized"
  | "mapped"
  | "derived"
  | "edited"
  | "exported"
  | "shared"
  | "remote_processed"
  | "permission_changed"

export type ProvenanceEvent = {
  id: string
  type: ProvenanceEventType
  occurredAt: string
  actor: "user" | "healthview_os" | "integration" | "remote_processor"
  acquisition?: AcquisitionContext
  inputIds: string[]
  outputIds: string[]
  method?: string
  methodVersion?: string
  notes?: string
}
