import type {
  AllergyIntolerance,
  CodeableConcept,
  Condition,
  Coverage,
  DiagnosticReport,
  Encounter,
  ExternalResourceSnapshot,
  Immunization,
  Location,
  MedicationDispense,
  MedicationOrder,
  MedicationUse,
  Observation,
  Organization,
  Person,
  Provider,
  TerminologyMapping,
} from "@healthviewos/schema"

export type FhirR4Resource = {
  resourceType: string
  id?: string
  [key: string]: unknown
}

export type FhirImportContext = {
  artifactId: string
  importedAt: string
  payloadPath: string
  subjectPersonId?: string
}

export type CanonicalProjection =
  | Partial<Person>
  | Partial<Observation>
  | Partial<Condition>
  | Partial<AllergyIntolerance>
  | Partial<MedicationOrder>
  | Partial<MedicationUse>
  | Partial<MedicationDispense>
  | Partial<Encounter>
  | Partial<Immunization>
  | Partial<DiagnosticReport>
  | Partial<Provider>
  | Partial<Organization>
  | Partial<Location>
  | Partial<Coverage>

export type FhirImportResult = {
  snapshot: ExternalResourceSnapshot
  rawJson: FhirR4Resource
  canonicalRecord?: CanonicalProjection
  terminologyMappings: TerminologyMapping[]
}

const importableResourceTypes = new Set([
  "Patient",
  "Observation",
  "Condition",
  "AllergyIntolerance",
  "MedicationRequest",
  "MedicationStatement",
  "MedicationDispense",
  "Encounter",
  "Immunization",
  "DocumentReference",
  "DiagnosticReport",
  "Practitioner",
  "Organization",
  "Location",
  "Coverage",
  "Claim",
  "ExplanationOfBenefit",
])

function resourceId(resource: FhirR4Resource) {
  return `${resource.resourceType.toLowerCase()}_${resource.id ?? "unknown"}`
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function conceptFromFhir(value: unknown): CodeableConcept | undefined {
  const source = object(value)
  if (!source) return undefined
  const displayText =
    text(source.text) ??
    array(source.coding)
      .map(object)
      .map((coding) => text(coding?.display) ?? text(coding?.code))
      .find(Boolean)

  if (!displayText) return undefined

  return {
    text: displayText,
    codings: array(source.coding)
      .map(object)
      .flatMap((coding) => {
        const system = text(coding?.system)
        const code = text(coding?.code)
        if (!system || !code) return []
        return [{ system, code, display: text(coding?.display) }]
      }),
  }
}

function codingMappings(recordId: string, fieldPath: string, concept?: CodeableConcept): TerminologyMapping[] {
  if (!concept) return []

  return concept.codings.map((coding, index) => ({
    id: `mapping_${recordId}_${fieldPath.replace(/[^a-zA-Z0-9]+/g, "_")}_${index}`,
    recordId,
    fieldPath,
    sourceSystem: coding.system,
    sourceCode: coding.code,
    sourceDisplay: coding.display ?? concept.text,
    targetSystem: coding.system,
    targetCode: coding.code,
    targetDisplay: coding.display,
    confidence: 1,
    method: "fhir_source_coding",
    mappingStatus: "unreviewed",
  }))
}

export function externalResourceSnapshotFromFhir(
  resource: FhirR4Resource,
  context: FhirImportContext,
): ExternalResourceSnapshot {
  return {
    id: `snapshot_${resourceId(resource)}`,
    artifactId: context.artifactId,
    standard: "fhir_r4",
    resourceType: resource.resourceType,
    payloadPath: context.payloadPath,
    importedAt: context.importedAt,
  }
}

export function importFhirR4Resource(resource: FhirR4Resource, context: FhirImportContext): FhirImportResult {
  if (!importableResourceTypes.has(resource.resourceType)) {
    throw new Error(`Unsupported FHIR R4 resource type: ${resource.resourceType}`)
  }

  const snapshot = externalResourceSnapshotFromFhir(resource, context)
  const canonicalRecord = canonicalRecordFromFhirR4(resource, context)
  const recordId = canonicalRecord?.id
  const terminologyMappings = recordId
    ? mappingsForCanonicalProjection(recordId, resource, canonicalRecord)
    : []

  return {
    snapshot,
    rawJson: resource,
    canonicalRecord,
    terminologyMappings,
  }
}

export function canonicalRecordFromFhirR4(
  resource: FhirR4Resource,
  context: FhirImportContext,
): CanonicalProjection | undefined {
  const id = resourceId(resource)
  const subjectPersonId = context.subjectPersonId ?? "person_unknown"
  const code = conceptFromFhir(resource.code)

  switch (resource.resourceType) {
    case "Patient":
      return {
        id,
        displayName:
          array(resource.name)
            .map(object)
            .map((name) => text(name?.text))
            .find(Boolean) ?? id,
      } satisfies Partial<Person>
    case "Observation":
      return {
        id,
        subjectPersonId,
        category: "laboratory",
        code,
        status: text(resource.status) as Observation["status"] | undefined,
        effectiveDate: text(resource.effectiveDateTime)?.slice(0, 10),
      } satisfies Partial<Observation>
    case "Condition":
      return {
        id,
        subjectPersonId,
        code,
        category: "diagnosis",
      } satisfies Partial<Condition>
    case "AllergyIntolerance":
      return {
        id,
        subjectPersonId,
        substance: conceptFromFhir(resource.code),
      } satisfies Partial<AllergyIntolerance>
    case "MedicationRequest":
      return {
        id,
        subjectPersonId,
        medication: conceptFromFhir(resource.medicationCodeableConcept),
        authoredDate: text(resource.authoredOn),
        status: text(resource.status) as MedicationOrder["status"] | undefined,
        intent: text(resource.intent) as MedicationOrder["intent"] | undefined,
      } satisfies Partial<MedicationOrder>
    case "MedicationStatement":
      return {
        id,
        subjectPersonId,
        medication: conceptFromFhir(resource.medicationCodeableConcept),
        status: text(resource.status) as MedicationUse["status"] | undefined,
      } satisfies Partial<MedicationUse>
    case "MedicationDispense":
      return {
        id,
        subjectPersonId,
        medication: conceptFromFhir(resource.medicationCodeableConcept),
        status: text(resource.status) as MedicationDispense["status"] | undefined,
      } satisfies Partial<MedicationDispense>
    case "Encounter":
      return {
        id,
        subjectPersonId,
        title: code?.text ?? id,
        type: code,
        status: text(resource.status) as Encounter["status"] | undefined,
      } satisfies Partial<Encounter>
    case "Immunization":
      return {
        id,
        subjectPersonId,
        vaccine: conceptFromFhir(resource.vaccineCode),
        occurrenceDate: text(resource.occurrenceDateTime)?.slice(0, 10),
        status: text(resource.status) as Immunization["status"] | undefined,
      } satisfies Partial<Immunization>
    case "DiagnosticReport":
      return {
        id,
        subjectPersonId,
        title: code?.text ?? id,
        code,
        status: text(resource.status) as DiagnosticReport["status"] | undefined,
        effectiveDate: text(resource.effectiveDateTime)?.slice(0, 10),
      } satisfies Partial<DiagnosticReport>
    case "Practitioner":
      return {
        id,
        name:
          array(resource.name)
            .map(object)
            .map((name) => text(name?.text))
            .find(Boolean) ?? id,
        providerType: "practitioner",
      } satisfies Partial<Provider>
    case "Organization":
      return {
        id,
        name: text(resource.name) ?? id,
        type: "provider_group",
      } satisfies Partial<Organization>
    case "Location":
      return {
        id,
        name: text(resource.name) ?? id,
        status: text(resource.status) as Location["status"] | undefined,
        type: "unknown",
      } satisfies Partial<Location>
    case "Coverage":
      return {
        id,
        subjectPersonId,
        payerText:
          array(resource.payor)
            .map(object)
            .map((payor) => text(payor?.display) ?? text(payor?.reference))
            .find(Boolean) ?? "Unknown payer",
        status: text(resource.status) as Coverage["status"] | undefined,
      } satisfies Partial<Coverage>
    case "DocumentReference":
    case "Claim":
    case "ExplanationOfBenefit":
      return undefined
    default:
      return undefined
  }
}

function mappingsForCanonicalProjection(
  recordId: string,
  resource: FhirR4Resource,
  canonicalRecord: CanonicalProjection,
) {
  const mappings: TerminologyMapping[] = []
  if ("code" in canonicalRecord) {
    mappings.push(...codingMappings(recordId, "code", canonicalRecord.code))
  }
  if ("medication" in canonicalRecord) {
    mappings.push(...codingMappings(recordId, "medication", canonicalRecord.medication))
  }
  if ("vaccine" in canonicalRecord) {
    mappings.push(...codingMappings(recordId, "vaccine", canonicalRecord.vaccine))
  }
  if ("substance" in canonicalRecord) {
    mappings.push(...codingMappings(recordId, "substance", canonicalRecord.substance))
  }
  if (resource.resourceType === "DocumentReference") return []
  return mappings
}

export function exportCanonicalRecordToFhirR4(record: CanonicalProjection): FhirR4Resource {
  if ("displayName" in record) {
    return { resourceType: "Patient", id: record.id, name: [{ text: record.displayName }] }
  }
  if ("medication" in record && "authoredDate" in record) {
    return { resourceType: "MedicationRequest", id: record.id, status: record.status, intent: "order" }
  }
  if ("medication" in record && "dispenseDate" in record) {
    return { resourceType: "MedicationDispense", id: record.id, status: record.status }
  }
  if ("medication" in record) {
    return { resourceType: "MedicationStatement", id: record.id, status: record.status }
  }
  if ("vaccine" in record) {
    return { resourceType: "Immunization", id: record.id, status: record.status }
  }
  if ("payerText" in record) {
    return { resourceType: "Coverage", id: record.id, status: record.status }
  }
  if ("code" in record && "clinicalStatus" in record) {
    return { resourceType: "Condition", id: record.id }
  }
  if ("code" in record && "category" in record && "status" in record) {
    return { resourceType: "Observation", id: record.id, status: record.status }
  }
  if ("title" in record && "class" in record) {
    return { resourceType: "Encounter", id: record.id, status: record.status }
  }
  return { resourceType: "Basic", id: record.id }
}
