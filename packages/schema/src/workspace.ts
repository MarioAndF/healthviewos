import { z } from "zod"

import {
  AuthorizationSchema,
  BillSchema,
  BillingItemSchema,
  ClaimSchema,
  CoverageSchema,
  LocationSchema,
  OrganizationSchema,
  PaymentSchema,
  ProviderSchema,
  ServiceItemSchema,
} from "./billing"
import {
  AllergyIntoleranceSchema,
  ConditionSchema,
  DiagnosticReportSchema,
  EncounterSchema,
  HealthHistoryItemSchema,
  HealthRecordSchema,
  ImmunizationSchema,
  MedicationDispenseSchema,
  MedicationOrderSchema,
  MedicationUseSchema,
  ObservationSchema,
  PersonSchema,
} from "./clinical"
import {
  DerivedInsightSchema,
  DerivedSummarySchema,
  DerivedTimelineEventSchema,
  HealthMapSignalSchema,
  VisualVitalMetricSchema,
  WarningSignSchema,
} from "./derived"
import { HealthViewIdSchema, IsoDateTimeSchema } from "./primitives"
import { ProvenanceEventSchema } from "./provenance"
import {
  AcquisitionEventSchema,
  DocumentRecordSchema,
  ExternalResourceSnapshotSchema,
  SourceArtifactSchema,
  SourceOriginSchema,
  VaultFileSchema,
  VaultProfileSchema,
} from "./sources"
import { TerminologyMappingSchema } from "./terminology"

export const HealthViewRecordSetSchema = z.object({
  vaults: z.array(VaultProfileSchema),
  healthRecords: z.array(HealthRecordSchema),
  people: z.array(PersonSchema),
  origins: z.array(SourceOriginSchema),
  acquisitions: z.array(AcquisitionEventSchema),
  files: z.array(VaultFileSchema),
  artifacts: z.array(SourceArtifactSchema),
  documents: z.array(DocumentRecordSchema),
  provenanceEvents: z.array(ProvenanceEventSchema),
  externalResourceSnapshots: z.array(ExternalResourceSnapshotSchema).default([]),
  terminologyMappings: z.array(TerminologyMappingSchema).default([]),
  observations: z.array(ObservationSchema),
  conditions: z.array(ConditionSchema).default([]),
  healthHistoryItems: z.array(HealthHistoryItemSchema).default([]),
  allergyIntolerances: z.array(AllergyIntoleranceSchema).default([]),
  medicationUses: z.array(MedicationUseSchema).default([]),
  medicationOrders: z.array(MedicationOrderSchema).default([]),
  medicationDispenses: z.array(MedicationDispenseSchema).default([]),
  encounters: z.array(EncounterSchema).default([]),
  immunizations: z.array(ImmunizationSchema).default([]),
  diagnosticReports: z.array(DiagnosticReportSchema).default([]),
  providers: z.array(ProviderSchema).default([]),
  organizations: z.array(OrganizationSchema).default([]),
  locations: z.array(LocationSchema).default([]),
  coverages: z.array(CoverageSchema).default([]),
  claims: z.array(ClaimSchema).default([]),
  bills: z.array(BillSchema).default([]),
  payments: z.array(PaymentSchema).default([]),
  authorizations: z.array(AuthorizationSchema).default([]),
  derivedSummaries: z.array(DerivedSummarySchema).default([]),
  derivedTimelineEvents: z.array(DerivedTimelineEventSchema).default([]),
  derivedInsights: z.array(DerivedInsightSchema).default([]),
  visualVitals: z.array(VisualVitalMetricSchema).default([]),
  warningSigns: z.array(WarningSignSchema).default([]),
  healthMapSignals: z.array(HealthMapSignalSchema).default([]),
})

export const HealthViewSettingsSchema = z.object({
  id: HealthViewIdSchema,
  activePersonId: HealthViewIdSchema.optional(),
  backupMode: z.enum(["none", "readable_folder", "encrypted_backup"]),
  remoteProcessingMode: z.enum(["local_only", "redact_when_possible", "ask_each_time"]),
  vaultReadability: z.enum(["readable_files", "encrypted_files"]),
  updatedAt: IsoDateTimeSchema,
})

export const HealthViewWorkspaceSchema = z.object({
  schemaVersion: z.number().int().positive(),
  vault: VaultProfileSchema,
  settings: HealthViewSettingsSchema,
  recordSet: HealthViewRecordSetSchema,
  serviceItems: z.array(ServiceItemSchema),
  billingItems: z.array(BillingItemSchema),
})

export type HealthViewRecordSet = z.infer<typeof HealthViewRecordSetSchema>
export type HealthViewSettings = z.infer<typeof HealthViewSettingsSchema>
export type HealthViewWorkspace = z.infer<typeof HealthViewWorkspaceSchema>
