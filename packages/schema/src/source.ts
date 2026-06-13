export type SourceTrustLevel =
  | "user_entered"
  | "imported_document"
  | "provider_api"
  | "signed_clinical_document"
  | "lab_result"
  | "payer_claim"
  | "device_or_wearable"
  | "ai_derived"
  | "public_directory"

export type SourceFreshness = "current" | "stale" | "superseded" | "unknown"

export type AcquisitionMethod =
  | "manual_entry"
  | "local_file_import"
  | "selected_cloud_file"
  | "email_attachment"
  | "native_health_platform"
  | "smart_on_fhir_api"
  | "payer_patient_access_api"
  | "medicare_blue_button"
  | "portal_browser_assist"
  | "record_request"
  | "public_dataset"
  | "derived_by_healthview"

export type SourceOrigin = {
  id: string
  name: string
  kind: SourceTrustLevel
  organizationId?: string
  url?: string
}

export type SourceArtifact = {
  id: string
  originId: string
  title: string
  artifactType:
    | "fhir_json"
    | "pdf"
    | "image"
    | "csv"
    | "email"
    | "portal_download"
    | "wearable_export"
    | "manual_note"
    | "public_dataset"
  storagePath?: string
  externalId?: string
  importedAt: string
  observedAt?: string
  checksum?: string
}

export type AcquisitionContext = {
  method: AcquisitionMethod
  acquiredAt: string
  permissionScope?: string
  userInitiated: boolean
  notes?: string
}
