import { importFhirR4Resource } from "./index"

function assertEqual(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`)
  }
}

const context = {
  artifactId: "artifact_fhir_import",
  importedAt: "2026-06-13T15:00:00Z",
  payloadPath: "external/fhir/import.json",
  subjectPersonId: "person_sofia_reyes",
}

const observation = importFhirR4Resource(
  {
    resourceType: "Observation",
    id: "a1c",
    status: "final",
    code: {
      text: "A1C",
      coding: [
        {
          system: "http://loinc.org",
          code: "4548-4",
          display: "Hemoglobin A1c/Hemoglobin.total in Blood",
        },
      ],
    },
    effectiveDateTime: "2026-05-30T12:00:00Z",
  },
  context,
)

assertEqual(observation.snapshot.standard, "fhir_r4")
assertEqual(observation.snapshot.resourceType, "Observation")
assertEqual(observation.canonicalRecord?.id, "observation_a1c")
assertEqual(observation.terminologyMappings[0]?.sourceSystem, "http://loinc.org")
assertEqual(observation.terminologyMappings[0]?.mappingStatus, "unreviewed")

const smokeResources = [
  {
    resourceType: "Patient",
    id: "sofia",
    name: [{ text: "Sofia Reyes" }],
    expectedId: "patient_sofia",
  },
  {
    resourceType: "Condition",
    id: "diabetes",
    code: { text: "Type 2 diabetes" },
    expectedId: "condition_diabetes",
  },
  {
    resourceType: "MedicationRequest",
    id: "metformin",
    status: "active",
    intent: "order",
    medicationCodeableConcept: { text: "Metformin" },
    expectedId: "medicationrequest_metformin",
  },
  {
    resourceType: "Encounter",
    id: "visit",
    status: "finished",
    code: { text: "Office visit" },
    expectedId: "encounter_visit",
  },
  {
    resourceType: "Immunization",
    id: "flu",
    status: "completed",
    vaccineCode: { text: "Influenza vaccine" },
    occurrenceDateTime: "2025-10-12T12:00:00Z",
    expectedId: "immunization_flu",
  },
  {
    resourceType: "DiagnosticReport",
    id: "labs",
    status: "final",
    code: { text: "Lab panel" },
    effectiveDateTime: "2026-06-05T12:00:00Z",
    expectedId: "diagnosticreport_labs",
  },
]

for (const resource of smokeResources) {
  const { expectedId, ...fhirResource } = resource
  const result = importFhirR4Resource(fhirResource, context)
  assertEqual(result.snapshot.resourceType, resource.resourceType)
  assertEqual(result.canonicalRecord?.id, expectedId)
}
