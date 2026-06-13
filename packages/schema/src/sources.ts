import { z } from "zod"

import {
  CodingSchema,
  HealthViewIdSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
  relativePathPattern,
  sha256Pattern,
} from "./primitives"

export const SourceTrustLevelSchema = z.enum([
  "user_entered",
  "imported_document",
  "provider_api",
  "signed_clinical_document",
  "lab_result",
  "payer_claim",
  "device_or_wearable",
  "ai_derived",
  "public_directory",
  "unknown",
])

export const SourceFreshnessSchema = z.enum(["current", "stale", "superseded", "unknown"])

export const AcquisitionMethodSchema = z.enum([
  "manual_entry",
  "user_file_upload",
  "local_file_import",
  "local_file_selection",
  "selected_cloud_file",
  "cloud_file_selection",
  "email_attachment",
  "native_health_platform",
  "smart_on_fhir_api",
  "payer_patient_access_api",
  "medicare_blue_button",
  "portal_browser_assist",
  "portal_download",
  "record_request",
  "public_dataset",
  "generated_by_healthview",
  "derived_by_healthview",
])

export const VaultProfileSchema = z.object({
  id: HealthViewIdSchema,
  label: z.string().min(1),
  createdAt: IsoDateTimeSchema,
  schemaVersion: z.number().int().positive(),
})

export const SourceOriginSchema = z.object({
  id: HealthViewIdSchema,
  type: z.enum(["person", "organization", "device", "user", "system", "public_dataset", "unknown"]),
  name: z.string().min(1),
  trustLevel: SourceTrustLevelSchema.default("unknown"),
  identifiers: z.array(CodingSchema).default([]),
  url: z.string().url().optional(),
})

export const AcquisitionEventSchema = z.object({
  id: HealthViewIdSchema,
  method: AcquisitionMethodSchema,
  acquiredAt: IsoDateTimeSchema,
  originId: HealthViewIdSchema,
  actor: z.enum(["user", "healthview_os", "integration", "external_system"]).default("user"),
  permissionScope: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
})

export const VaultFileSchema = z.object({
  id: HealthViewIdSchema,
  relativePath: z
    .string()
    .min(1)
    .regex(relativePathPattern, "Use a vault-relative path without '..'."),
  mediaType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative().optional(),
  sha256: z.string().regex(sha256Pattern).optional(),
})

export const SourceArtifactSchema = z.object({
  id: HealthViewIdSchema,
  kind: z.enum([
    "fhir_json",
    "document",
    "image",
    "structured_export",
    "message",
    "manual_entry",
    "wearable_export",
    "portal_download",
    "public_dataset",
    "other",
  ]),
  title: z.string().min(1),
  originId: HealthViewIdSchema,
  acquisitionEventId: HealthViewIdSchema,
  fileIds: z.array(HealthViewIdSchema).default([]),
  receivedAt: IsoDateTimeSchema,
  observedAt: z.union([IsoDateSchema, IsoDateTimeSchema]).optional(),
  freshness: SourceFreshnessSchema.default("unknown"),
  trustLevel: SourceTrustLevelSchema.default("unknown"),
})

export const DocumentRecordSchema = z.object({
  id: HealthViewIdSchema,
  artifactId: HealthViewIdSchema,
  subjectPersonIds: z.array(HealthViewIdSchema).min(1),
  documentType: z.enum([
    "lab_report",
    "visit_note",
    "imaging_report",
    "pathology_report",
    "insurance_document",
    "medication_record",
    "immunization_record",
    "user_note",
    "portal_record",
    "wearable_export",
    "other",
    "unknown",
  ]),
  title: z.string().min(1),
  documentDate: IsoDateSchema.optional(),
  status: z.enum(["available", "superseded", "entered_in_error", "unknown"]),
})

export const ExternalResourceSnapshotSchema = z.object({
  id: HealthViewIdSchema,
  artifactId: HealthViewIdSchema,
  standard: z.enum(["fhir_r4", "fhir_r5", "cda", "dicom", "healthkit", "health_connect", "other"]),
  resourceType: z.string().min(1),
  profileUrl: z.string().url().optional(),
  payloadPath: z
    .string()
    .min(1)
    .regex(relativePathPattern, "Use a vault-relative path without '..'."),
  importedAt: IsoDateTimeSchema,
})

export type SourceTrustLevel = z.infer<typeof SourceTrustLevelSchema>
export type SourceFreshness = z.infer<typeof SourceFreshnessSchema>
export type AcquisitionMethod = z.infer<typeof AcquisitionMethodSchema>
export type VaultProfile = z.infer<typeof VaultProfileSchema>
export type SourceOrigin = z.infer<typeof SourceOriginSchema>
export type AcquisitionEvent = z.infer<typeof AcquisitionEventSchema>
export type VaultFile = z.infer<typeof VaultFileSchema>
export type SourceArtifact = z.infer<typeof SourceArtifactSchema>
export type DocumentRecord = z.infer<typeof DocumentRecordSchema>
export type ExternalResourceSnapshot = z.infer<typeof ExternalResourceSnapshotSchema>
