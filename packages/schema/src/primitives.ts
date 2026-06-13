import { z } from "zod"

const idPattern = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

export const relativePathPattern =
  /^(?!\/)(?![A-Za-z]:[\\/])(?!.*(?:^|\/)\.\.(?:\/|$)).+/

export const sha256Pattern = /^[a-f0-9]{64}$/i

export const HealthViewIdSchema = z
  .string()
  .min(1)
  .regex(idPattern, "Use lowercase snake_case IDs such as person_sofia_reyes.")

export const IsoDateSchema = z
  .string()
  .regex(isoDatePattern, "Use an ISO date in YYYY-MM-DD format.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value)
  }, "Use a valid calendar date.")

export const IsoDateTimeSchema = z.string().datetime({ offset: true })
export const ConfidenceScoreSchema = z.number().min(0).max(1)

export const PeriodSchema = z
  .object({
    start: z.union([IsoDateSchema, IsoDateTimeSchema]).optional(),
    end: z.union([IsoDateSchema, IsoDateTimeSchema]).optional(),
  })
  .refine((value) => value.start || value.end, "A period needs a start or end.")

export const IdentifierSchema = z.object({
  system: z.string().min(1),
  value: z.string().min(1),
  assigner: z.string().min(1).optional(),
  period: PeriodSchema.optional(),
})

export const CodingSchema = z.object({
  system: z.string().min(1),
  code: z.string().min(1),
  display: z.string().min(1).optional(),
})

export const CodeableConceptSchema = z.object({
  text: z.string().min(1),
  codings: z.array(CodingSchema).default([]),
  preferredCoding: CodingSchema.optional(),
  mappingConfidence: ConfidenceScoreSchema.optional(),
})

export const QuantitySchema = z.object({
  value: z.number(),
  unit: z.string().min(1),
  ucumCode: z.string().min(1).optional(),
  comparator: z.enum(["<", "<=", ">=", ">"]).optional(),
})

export const ReferenceRangeSchema = z.object({
  low: QuantitySchema.optional(),
  high: QuantitySchema.optional(),
  text: z.string().min(1).optional(),
  appliesTo: z.array(CodeableConceptSchema).default([]),
})

export const HumanNameSchema = z.object({
  text: z.string().min(1),
  family: z.string().min(1).optional(),
  given: z.array(z.string().min(1)).default([]),
  prefix: z.array(z.string().min(1)).default([]),
  suffix: z.array(z.string().min(1)).default([]),
  use: z
    .enum(["usual", "official", "temp", "nickname", "anonymous", "old", "maiden"])
    .optional(),
})

export const ContactPointSchema = z.object({
  system: z.enum(["phone", "fax", "email", "pager", "url", "sms", "other"]),
  value: z.string().min(1),
  use: z.enum(["home", "work", "temp", "old", "mobile"]).optional(),
  rank: z.number().int().positive().optional(),
  period: PeriodSchema.optional(),
})

export const AddressSchema = z.object({
  text: z.string().min(1).optional(),
  line: z.array(z.string().min(1)).default([]),
  city: z.string().min(1).optional(),
  district: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  postalCode: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  use: z.enum(["home", "work", "temp", "old", "billing"]).optional(),
})

export const AnnotationSchema = z.object({
  author: z.string().min(1).optional(),
  time: IsoDateTimeSchema.optional(),
  text: z.string().min(1),
})

export type HealthViewId = z.infer<typeof HealthViewIdSchema>
export type IsoDate = z.infer<typeof IsoDateSchema>
export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>
export type ConfidenceScore = z.infer<typeof ConfidenceScoreSchema>
export type Period = z.infer<typeof PeriodSchema>
export type Identifier = z.infer<typeof IdentifierSchema>
export type Coding = z.infer<typeof CodingSchema>
export type CodeableConcept = z.infer<typeof CodeableConceptSchema>
export type Quantity = z.infer<typeof QuantitySchema>
export type ReferenceRange = z.infer<typeof ReferenceRangeSchema>
export type HumanName = z.infer<typeof HumanNameSchema>
export type ContactPoint = z.infer<typeof ContactPointSchema>
export type Address = z.infer<typeof AddressSchema>
export type Annotation = z.infer<typeof AnnotationSchema>
