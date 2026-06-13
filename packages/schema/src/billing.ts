import { z } from "zod"

import { EvidenceLinkSchema } from "./evidence"
import {
  AddressSchema,
  CodeableConceptSchema,
  ContactPointSchema,
  HealthViewIdSchema,
  IdentifierSchema,
  IsoDateSchema,
  PeriodSchema,
} from "./primitives"

export const OrganizationSchema = z.object({
  id: HealthViewIdSchema,
  name: z.string().min(1),
  type: z.enum(["provider_group", "facility", "lab", "pharmacy", "payer", "public_health", "other", "unknown"]),
  identifiers: z.array(IdentifierSchema).default([]),
  contactPoints: z.array(ContactPointSchema).default([]),
  address: AddressSchema.optional(),
  active: z.boolean().default(true),
  note: z.string().min(1).optional(),
  evidence: z.array(EvidenceLinkSchema).min(1),
})

export const ProviderSchema = z.object({
  id: HealthViewIdSchema,
  name: z.string().min(1),
  providerType: z.enum(["practitioner", "practitioner_role", "care_team_member", "other", "unknown"]),
  specialty: CodeableConceptSchema.optional(),
  organizationId: HealthViewIdSchema.optional(),
  locationIds: z.array(HealthViewIdSchema).default([]),
  identifiers: z.array(IdentifierSchema).default([]),
  contactPoints: z.array(ContactPointSchema).default([]),
  active: z.boolean().default(true),
  note: z.string().min(1).optional(),
  evidence: z.array(EvidenceLinkSchema).min(1),
})

export const LocationSchema = z.object({
  id: HealthViewIdSchema,
  name: z.string().min(1),
  status: z.enum(["active", "suspended", "inactive", "unknown"]),
  mode: z.enum(["instance", "kind", "unknown"]).default("instance"),
  type: z.enum(["clinic", "hospital", "lab", "pharmacy", "virtual", "home", "other", "unknown"]),
  organizationId: HealthViewIdSchema.optional(),
  address: AddressSchema.optional(),
  contactPoints: z.array(ContactPointSchema).default([]),
  note: z.string().min(1).optional(),
  evidence: z.array(EvidenceLinkSchema).min(1),
})

export const CoverageSchema = z.object({
  id: HealthViewIdSchema,
  subjectPersonId: HealthViewIdSchema,
  payerText: z.string().min(1),
  planName: z.string().min(1).optional(),
  memberId: z.string().min(1).optional(),
  groupNumber: z.string().min(1).optional(),
  status: z.enum(["active", "cancelled", "draft", "entered_in_error", "unknown"]),
  period: PeriodSchema.optional(),
  coverageType: z.enum(["medical", "dental", "vision", "pharmacy", "other", "unknown"]).default("medical"),
  note: z.string().min(1).optional(),
  evidence: z.array(EvidenceLinkSchema).min(1),
})

export const ClaimSchema = z.object({
  id: HealthViewIdSchema,
  subjectPersonId: HealthViewIdSchema,
  title: z.string().min(1),
  status: z.enum(["active", "cancelled", "draft", "entered_in_error", "unknown"]),
  claimType: z.enum(["professional", "institutional", "pharmacy", "oral", "vision", "other", "unknown"]),
  providerText: z.string().min(1).optional(),
  payerText: z.string().min(1).optional(),
  serviceDate: IsoDateSchema.optional(),
  amountCents: z.number().int().nonnegative().optional(),
  currency: z.string().min(3).max(3).optional(),
  coverageId: HealthViewIdSchema.optional(),
  note: z.string().min(1).optional(),
  evidence: z.array(EvidenceLinkSchema).min(1),
})

export const BillSchema = z.object({
  id: HealthViewIdSchema,
  subjectPersonId: HealthViewIdSchema,
  title: z.string().min(1),
  status: z.enum(["open", "pending", "paid", "overdue", "cancelled", "unknown"]),
  billDate: IsoDateSchema.optional(),
  dueDate: IsoDateSchema.optional(),
  amountCents: z.number().int().nonnegative().optional(),
  currency: z.string().min(3).max(3).optional(),
  payeeText: z.string().min(1).optional(),
  claimId: HealthViewIdSchema.optional(),
  note: z.string().min(1).optional(),
  evidence: z.array(EvidenceLinkSchema).min(1),
})

export const PaymentSchema = z.object({
  id: HealthViewIdSchema,
  subjectPersonId: HealthViewIdSchema,
  title: z.string().min(1),
  status: z.enum(["pending", "completed", "failed", "cancelled", "unknown"]),
  paidAt: IsoDateSchema.optional(),
  amountCents: z.number().int().nonnegative().optional(),
  currency: z.string().min(3).max(3).optional(),
  payerText: z.string().min(1).optional(),
  payeeText: z.string().min(1).optional(),
  billId: HealthViewIdSchema.optional(),
  note: z.string().min(1).optional(),
  evidence: z.array(EvidenceLinkSchema).min(1),
})

export const AuthorizationSchema = z.object({
  id: HealthViewIdSchema,
  subjectPersonId: HealthViewIdSchema,
  title: z.string().min(1),
  status: z.enum(["requested", "approved", "denied", "pending", "cancelled", "expired", "unknown"]),
  category: z.enum(["referral", "prior_authorization", "precertification", "other", "unknown"]),
  requestedDate: IsoDateSchema.optional(),
  expirationDate: IsoDateSchema.optional(),
  payerText: z.string().min(1).optional(),
  providerText: z.string().min(1).optional(),
  serviceText: z.string().min(1).optional(),
  coverageId: HealthViewIdSchema.optional(),
  note: z.string().min(1).optional(),
  evidence: z.array(EvidenceLinkSchema).min(1),
})

export const ServiceItemSchema = z.object({
  id: HealthViewIdSchema,
  subjectPersonId: HealthViewIdSchema.optional(),
  title: z.string().min(1),
  category: z.enum(["provider", "facility", "lab", "pharmacy", "digital_service", "other"]),
  status: z.enum(["active", "available", "archived", "unknown"]),
  description: z.string().min(1).optional(),
  evidence: z.array(EvidenceLinkSchema).default([]),
})

export const BillingItemSchema = z.object({
  id: HealthViewIdSchema,
  subjectPersonId: HealthViewIdSchema.optional(),
  title: z.string().min(1),
  category: z.enum(["coverage", "claim", "bill", "authorization", "payment", "other"]),
  status: z.enum(["active", "pending", "paid", "denied", "archived", "unknown"]),
  amountCents: z.number().int().nonnegative().optional(),
  currency: z.string().min(3).max(3).optional(),
  description: z.string().min(1).optional(),
  evidence: z.array(EvidenceLinkSchema).default([]),
})

export type Organization = z.infer<typeof OrganizationSchema>
export type Provider = z.infer<typeof ProviderSchema>
export type Location = z.infer<typeof LocationSchema>
export type Coverage = z.infer<typeof CoverageSchema>
export type Claim = z.infer<typeof ClaimSchema>
export type Bill = z.infer<typeof BillSchema>
export type Payment = z.infer<typeof PaymentSchema>
export type Authorization = z.infer<typeof AuthorizationSchema>
export type ServiceItem = z.infer<typeof ServiceItemSchema>
export type BillingItem = z.infer<typeof BillingItemSchema>
