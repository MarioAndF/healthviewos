import type {
  AcquisitionEvent,
  DocumentRecord,
  EvidenceBackedClaim,
  EvidenceLink,
  EvidenceSummary,
  HealthMapSignal,
  HealthRecord,
  HealthViewWorkspace,
  SourceArtifact,
  SourceOrigin,
  VaultFile,
  VisualVitalMetric,
  WarningSign,
} from "@healthviewos/schema"

const createdAt = "2026-06-13T15:00:00Z"
const importedAt = "2026-06-13T16:12:00Z"
const generatedAt = "2026-06-13T16:30:00Z"
const personId = "person_sofia_reyes"

const origins: SourceOrigin[] = [
  {
    id: "origin_user_manual_entry",
    type: "user",
    name: "Manual entry",
    trustLevel: "user_entered",
    identifiers: [],
  },
  {
    id: "origin_quest_diagnostics",
    type: "organization",
    name: "Quest Diagnostics",
    trustLevel: "lab_result",
    identifiers: [],
  },
  {
    id: "origin_apple_health",
    type: "device",
    name: "Apple Health",
    trustLevel: "device_or_wearable",
    identifiers: [],
  },
  {
    id: "origin_northside_medical",
    type: "organization",
    name: "Northside Medical Group",
    trustLevel: "provider_api",
    identifiers: [],
  },
  {
    id: "origin_corner_pharmacy",
    type: "organization",
    name: "Corner Pharmacy",
    trustLevel: "imported_document",
    identifiers: [],
  },
  {
    id: "origin_acme_health_plan",
    type: "organization",
    name: "Acme Health Plan",
    trustLevel: "payer_claim",
    identifiers: [],
  },
]

type SourceSeed = {
  acquisitionMethod: AcquisitionEvent["method"]
  documentType: DocumentRecord["documentType"]
  freshness: SourceArtifact["freshness"]
  id: string
  kind: SourceArtifact["kind"]
  mediaType: string
  observedAt?: string
  originId: string
  path: string
  receivedAt: string
  subjectPersonId?: string
  title: string
  trustLevel: SourceArtifact["trustLevel"]
}

type ComparisonPatientFixture = {
  address: {
    city: string
    country: string
    text: string
  }
  administrativeGender: "female" | "male" | "other" | "unknown" | "not_specified"
  bloodPressure: {
    diastolic: number
    score: number
    systolic: number
  }
  care: {
    authorizationService: string
    encounterTitle: string
    medication: string
    medicationDose: string
    medicationFrequency: string
    provider: string
  }
  crp: {
    score: number
    tone: WarningSign["tone"]
    value: number
    warning: string
  }
  dateOfBirth: string
  displayName: string
  family: string
  glucose: {
    interpretation: "normal" | "high" | "low" | "critical" | "abnormal" | "unknown"
    score: number
    value: number
  }
  heartRate: {
    score: number
    value: number
  }
  hrv: {
    interpretation?: "normal" | "high" | "low" | "critical" | "abnormal" | "unknown"
    score: number
    value: number
  }
  id: string
  sleep: {
    score: number
    value: number
  }
  sexAtBirth: "female" | "male" | "intersex" | "unknown" | "not_specified"
  systemScores: {
    cardiovascular: number
    endocrine: number
    immune: number
    nervous: number
    respiratory: number
  }
}

const comparisonPatientFixtures: ComparisonPatientFixture[] = [
  {
    id: "person_mateo_chen",
    displayName: "Mateo Chen",
    family: "Chen",
    dateOfBirth: "1976-09-03",
    sexAtBirth: "male",
    administrativeGender: "male",
    address: {
      text: "Seattle, WA",
      city: "Seattle",
      country: "United States",
    },
    heartRate: { value: 72, score: 70 },
    sleep: { value: 6.1, score: 58 },
    glucose: { value: 104, interpretation: "high", score: 58 },
    hrv: { value: 35, interpretation: "low", score: 45 },
    bloodPressure: { systolic: 132, diastolic: 84, score: 54 },
    crp: { value: 1.8, score: 78, tone: "attention", warning: "Blood pressure trend" },
    care: {
      authorizationService: "Home blood pressure monitor",
      encounterTitle: "Cardiology follow-up",
      medication: "Lisinopril",
      medicationDose: "10 mg",
      medicationFrequency: "daily",
      provider: "Dr. Elena Morales",
    },
    systemScores: { cardiovascular: 56, endocrine: 61, immune: 78, nervous: 55, respiratory: 86 },
  },
  {
    id: "person_amina_patel",
    displayName: "Amina Patel",
    family: "Patel",
    dateOfBirth: "1992-01-24",
    sexAtBirth: "female",
    administrativeGender: "female",
    address: {
      text: "Austin, TX",
      city: "Austin",
      country: "United States",
    },
    heartRate: { value: 68, score: 76 },
    sleep: { value: 7.9, score: 90 },
    glucose: { value: 86, interpretation: "normal", score: 86 },
    hrv: { value: 62, score: 86 },
    bloodPressure: { systolic: 112, diastolic: 70, score: 92 },
    crp: { value: 3.6, score: 62, tone: "watch", warning: "Respiratory flare risk" },
    care: {
      authorizationService: "Pulmonary function testing",
      encounterTitle: "Asthma action plan review",
      medication: "Albuterol",
      medicationDose: "90 mcg",
      medicationFrequency: "as needed",
      provider: "Dr. Priya Shah",
    },
    systemScores: { cardiovascular: 88, endocrine: 86, immune: 66, nervous: 84, respiratory: 58 },
  },
  {
    id: "person_elena_williams",
    displayName: "Elena Williams",
    family: "Williams",
    dateOfBirth: "1958-11-18",
    sexAtBirth: "female",
    administrativeGender: "female",
    address: {
      text: "Portland, OR",
      city: "Portland",
      country: "United States",
    },
    heartRate: { value: 60, score: 84 },
    sleep: { value: 6.8, score: 72 },
    glucose: { value: 97, interpretation: "normal", score: 74 },
    hrv: { value: 41, interpretation: "low", score: 60 },
    bloodPressure: { systolic: 124, diastolic: 78, score: 72 },
    crp: { value: 0.9, score: 88, tone: "neutral", warning: "Bone health follow-up" },
    care: {
      authorizationService: "DEXA scan",
      encounterTitle: "Bone density follow-up",
      medication: "Atorvastatin",
      medicationDose: "20 mg",
      medicationFrequency: "nightly",
      provider: "Dr. Lena Ortiz",
    },
    systemScores: { cardiovascular: 72, endocrine: 74, immune: 88, nervous: 66, respiratory: 82 },
  },
]

export const comparisonPatientIds = comparisonPatientFixtures.map((patient) => patient.id)

function comparisonPatientSlug(patient: ComparisonPatientFixture) {
  return patient.id.replace(/^person_/, "")
}

function comparisonRecordIds(patient: ComparisonPatientFixture) {
  const slug = comparisonPatientSlug(patient)

  return {
    authorization: `authorization_${slug}_care_plan`,
    bloodPressure: `observation_blood_pressure_${slug}_2026_06_12`,
    crp: `observation_crp_${slug}_2026_06_05`,
    encounter: `encounter_${slug}_planned_2026_06_18`,
    glucose: `observation_glucose_${slug}_2026_06_05`,
    heartRate: `observation_heart_rate_${slug}_2026_06_13`,
    hrv: `observation_hrv_${slug}_2026_06_13`,
    medicationOrder: `medication_order_${slug}`,
    sleep: `observation_sleep_${slug}_2026_06_13`,
  }
}

function comparisonSeed(input: {
  acquisitionMethod: AcquisitionEvent["method"]
  documentType: DocumentRecord["documentType"]
  id: string
  kind: SourceArtifact["kind"]
  mediaType: string
  observedAt: string
  originId: string
  path: string
  receivedAt: string
  subjectPersonId: string
  title: string
  trustLevel: SourceArtifact["trustLevel"]
}): SourceSeed {
  return {
    freshness: "current",
    ...input,
  }
}

const comparisonPatientSourceSeeds: SourceSeed[] = comparisonPatientFixtures.flatMap((patient) => {
  const ids = comparisonRecordIds(patient)
  const slug = comparisonPatientSlug(patient)
  const basePath = `notes/manual/comparison-patients/${slug}`

  return [
    comparisonSeed({
      id: patient.id,
      title: `${patient.displayName} profile`,
      originId: "origin_user_manual_entry",
      acquisitionMethod: "manual_entry",
      kind: "manual_entry",
      mediaType: "text/markdown",
      path: `${basePath}/profile.md`,
      documentType: "user_note",
      receivedAt: createdAt,
      observedAt: "2026-06-13",
      subjectPersonId: patient.id,
      trustLevel: "user_entered",
    }),
    comparisonSeed({
      id: ids.heartRate,
      title: `${patient.displayName} heart rate samples`,
      originId: "origin_apple_health",
      acquisitionMethod: "native_health_platform",
      kind: "wearable_export",
      mediaType: "application/json",
      path: `files/wearables/apple-health/${slug}/2026-06-13-heart-rate.json`,
      documentType: "wearable_export",
      receivedAt: "2026-06-13T16:21:00Z",
      observedAt: "2026-06-13",
      subjectPersonId: patient.id,
      trustLevel: "device_or_wearable",
    }),
    comparisonSeed({
      id: ids.sleep,
      title: `${patient.displayName} sleep analysis`,
      originId: "origin_apple_health",
      acquisitionMethod: "native_health_platform",
      kind: "wearable_export",
      mediaType: "application/json",
      path: `files/wearables/apple-health/${slug}/2026-06-13-sleep.json`,
      documentType: "wearable_export",
      receivedAt: "2026-06-13T16:21:00Z",
      observedAt: "2026-06-13",
      subjectPersonId: patient.id,
      trustLevel: "device_or_wearable",
    }),
    comparisonSeed({
      id: ids.glucose,
      title: `${patient.displayName} metabolic panel.pdf`,
      originId: "origin_quest_diagnostics",
      acquisitionMethod: "local_file_import",
      kind: "document",
      mediaType: "application/pdf",
      path: `files/labs/quest/${slug}/2026-06-05-metabolic-panel.pdf`,
      documentType: "lab_report",
      receivedAt: importedAt,
      observedAt: "2026-06-05",
      subjectPersonId: patient.id,
      trustLevel: "lab_result",
    }),
    comparisonSeed({
      id: ids.hrv,
      title: `${patient.displayName} HRV export`,
      originId: "origin_apple_health",
      acquisitionMethod: "native_health_platform",
      kind: "wearable_export",
      mediaType: "application/json",
      path: `files/wearables/apple-health/${slug}/2026-06-13-hrv.json`,
      documentType: "wearable_export",
      receivedAt: "2026-06-13T16:21:00Z",
      observedAt: "2026-06-13",
      subjectPersonId: patient.id,
      trustLevel: "device_or_wearable",
    }),
    comparisonSeed({
      id: ids.bloodPressure,
      title: `${patient.displayName} home blood pressure reading`,
      originId: "origin_user_manual_entry",
      acquisitionMethod: "manual_entry",
      kind: "manual_entry",
      mediaType: "text/markdown",
      path: `${basePath}/2026-06-12-blood-pressure.md`,
      documentType: "user_note",
      receivedAt: "2026-06-12T18:10:00Z",
      observedAt: "2026-06-12",
      subjectPersonId: patient.id,
      trustLevel: "user_entered",
    }),
    comparisonSeed({
      id: ids.crp,
      title: `${patient.displayName} inflammation panel.pdf`,
      originId: "origin_quest_diagnostics",
      acquisitionMethod: "local_file_import",
      kind: "document",
      mediaType: "application/pdf",
      path: `files/labs/quest/${slug}/2026-06-05-inflammation-panel.pdf`,
      documentType: "lab_report",
      receivedAt: importedAt,
      observedAt: "2026-06-05",
      subjectPersonId: patient.id,
      trustLevel: "lab_result",
    }),
    comparisonSeed({
      id: ids.medicationOrder,
      title: `${patient.care.medication} prescription for ${patient.displayName}`,
      originId: "origin_northside_medical",
      acquisitionMethod: "portal_browser_assist",
      kind: "portal_download",
      mediaType: "application/json",
      path: `external/fhir/MedicationRequest/${slug}.json`,
      documentType: "portal_record",
      receivedAt: "2026-06-13T16:07:00Z",
      observedAt: "2026-06-01",
      subjectPersonId: patient.id,
      trustLevel: "provider_api",
    }),
    comparisonSeed({
      id: ids.encounter,
      title: `${patient.displayName} planned visit`,
      originId: "origin_northside_medical",
      acquisitionMethod: "portal_browser_assist",
      kind: "portal_download",
      mediaType: "application/json",
      path: `external/fhir/Encounter/${slug}-planned.json`,
      documentType: "portal_record",
      receivedAt: "2026-06-13T16:08:00Z",
      observedAt: "2026-06-18",
      subjectPersonId: patient.id,
      trustLevel: "provider_api",
    }),
    comparisonSeed({
      id: ids.authorization,
      title: `${patient.care.authorizationService} authorization`,
      originId: "origin_acme_health_plan",
      acquisitionMethod: "payer_patient_access_api",
      kind: "structured_export",
      mediaType: "application/json",
      path: `external/payer/acme/${slug}-authorization.json`,
      documentType: "insurance_document",
      receivedAt: "2026-06-13T16:09:00Z",
      observedAt: "2026-06-10",
      subjectPersonId: patient.id,
      trustLevel: "payer_claim",
    }),
  ]
})

const sourceSeeds: SourceSeed[] = [
  {
    id: personId,
    title: "Sofia Reyes profile",
    originId: "origin_user_manual_entry",
    acquisitionMethod: "manual_entry",
    kind: "manual_entry",
    mediaType: "text/markdown",
    path: "notes/manual/person/2026/person_sofia_reyes.md",
    documentType: "user_note",
    receivedAt: createdAt,
    observedAt: "2026-06-13",
    freshness: "current",
    trustLevel: "user_entered",
  },
  ...comparisonPatientSourceSeeds,
  {
    id: "observation_heart_rate_2026_06_13",
    title: "Apple Health heart rate samples",
    originId: "origin_apple_health",
    acquisitionMethod: "native_health_platform",
    kind: "wearable_export",
    mediaType: "application/json",
    path: "files/wearables/apple-health/2026-06-13-heart-rate.json",
    documentType: "wearable_export",
    receivedAt: "2026-06-13T16:20:00Z",
    observedAt: "2026-06-13",
    freshness: "current",
    trustLevel: "device_or_wearable",
  },
  {
    id: "observation_sleep_2026_06_13",
    title: "Apple Health sleep analysis",
    originId: "origin_apple_health",
    acquisitionMethod: "native_health_platform",
    kind: "wearable_export",
    mediaType: "application/json",
    path: "files/wearables/apple-health/2026-06-13-sleep.json",
    documentType: "wearable_export",
    receivedAt: "2026-06-13T16:20:00Z",
    observedAt: "2026-06-13",
    freshness: "current",
    trustLevel: "device_or_wearable",
  },
  {
    id: "observation_glucose_2026_06_05",
    title: "Quest Diagnostics metabolic panel.pdf",
    originId: "origin_quest_diagnostics",
    acquisitionMethod: "local_file_import",
    kind: "document",
    mediaType: "application/pdf",
    path: "files/labs/quest/2026-06-05-metabolic-panel.pdf",
    documentType: "lab_report",
    receivedAt: importedAt,
    observedAt: "2026-06-05",
    freshness: "current",
    trustLevel: "lab_result",
  },
  {
    id: "observation_hrv_2026_06_13",
    title: "Apple Health HRV export",
    originId: "origin_apple_health",
    acquisitionMethod: "native_health_platform",
    kind: "wearable_export",
    mediaType: "application/json",
    path: "files/wearables/apple-health/2026-06-13-hrv.json",
    documentType: "wearable_export",
    receivedAt: "2026-06-13T16:20:00Z",
    observedAt: "2026-06-13",
    freshness: "current",
    trustLevel: "device_or_wearable",
  },
  {
    id: "observation_blood_pressure_2026_06_12",
    title: "Home cuff reading",
    originId: "origin_user_manual_entry",
    acquisitionMethod: "manual_entry",
    kind: "manual_entry",
    mediaType: "text/markdown",
    path: "notes/manual/vitals/2026-06-12-blood-pressure.md",
    documentType: "user_note",
    receivedAt: "2026-06-12T18:05:00Z",
    observedAt: "2026-06-12",
    freshness: "current",
    trustLevel: "user_entered",
  },
  {
    id: "observation_crp_2026_06_05",
    title: "Quest Diagnostics inflammation panel.pdf",
    originId: "origin_quest_diagnostics",
    acquisitionMethod: "local_file_import",
    kind: "document",
    mediaType: "application/pdf",
    path: "files/labs/quest/2026-06-05-inflammation-panel.pdf",
    documentType: "lab_report",
    receivedAt: importedAt,
    observedAt: "2026-06-05",
    freshness: "current",
    trustLevel: "lab_result",
  },
  {
    id: "health_history_type_2_diabetes",
    title: "Type 2 diabetes",
    originId: "origin_northside_medical",
    acquisitionMethod: "portal_browser_assist",
    kind: "portal_download",
    mediaType: "text/markdown",
    path: "files/portal/northside/2026-06-13-problem-list.md",
    documentType: "visit_note",
    receivedAt: "2026-06-13T16:05:00Z",
    observedAt: "2024-08-15",
    freshness: "current",
    trustLevel: "provider_api",
  },
  {
    id: "condition_type_2_diabetes",
    title: "Type 2 diabetes mellitus",
    originId: "origin_northside_medical",
    acquisitionMethod: "portal_browser_assist",
    kind: "portal_download",
    mediaType: "application/json",
    path: "external/fhir/Condition/type-2-diabetes.json",
    documentType: "portal_record",
    receivedAt: "2026-06-13T16:05:00Z",
    observedAt: "2024-08-15",
    freshness: "current",
    trustLevel: "provider_api",
  },
  {
    id: "allergy_intolerance_penicillin",
    title: "Penicillin allergy",
    originId: "origin_user_manual_entry",
    acquisitionMethod: "manual_entry",
    kind: "manual_entry",
    mediaType: "text/markdown",
    path: "notes/manual/allergies/penicillin.md",
    documentType: "user_note",
    receivedAt: createdAt,
    observedAt: "2019-03-01",
    freshness: "current",
    trustLevel: "user_entered",
  },
  {
    id: "medication_use_metformin",
    title: "Metformin",
    originId: "origin_corner_pharmacy",
    acquisitionMethod: "portal_browser_assist",
    kind: "portal_download",
    mediaType: "text/markdown",
    path: "files/pharmacy/corner/2026-06-13-medication-list.md",
    documentType: "medication_record",
    receivedAt: "2026-06-13T16:06:00Z",
    observedAt: "2025-01-15",
    freshness: "current",
    trustLevel: "imported_document",
  },
  {
    id: "medication_order_metformin",
    title: "Metformin prescription",
    originId: "origin_northside_medical",
    acquisitionMethod: "portal_browser_assist",
    kind: "portal_download",
    mediaType: "application/json",
    path: "external/fhir/MedicationRequest/metformin.json",
    documentType: "portal_record",
    receivedAt: "2026-06-13T16:06:00Z",
    observedAt: "2025-01-15",
    freshness: "current",
    trustLevel: "provider_api",
  },
  {
    id: "medication_dispense_metformin",
    title: "Metformin pharmacy fill",
    originId: "origin_corner_pharmacy",
    acquisitionMethod: "portal_browser_assist",
    kind: "portal_download",
    mediaType: "application/json",
    path: "external/fhir/MedicationDispense/metformin.json",
    documentType: "medication_record",
    receivedAt: "2026-06-13T16:06:00Z",
    observedAt: "2026-06-01",
    freshness: "current",
    trustLevel: "imported_document",
  },
  {
    id: "encounter_primary_care_2026_05_28",
    title: "Primary care follow-up",
    originId: "origin_northside_medical",
    acquisitionMethod: "portal_browser_assist",
    kind: "portal_download",
    mediaType: "text/markdown",
    path: "files/portal/northside/2026-05-28-visit-note.md",
    documentType: "visit_note",
    receivedAt: "2026-06-13T16:05:00Z",
    observedAt: "2026-05-28",
    freshness: "current",
    trustLevel: "provider_api",
  },
  {
    id: "immunization_influenza_2025_10_12",
    title: "Influenza vaccine",
    originId: "origin_corner_pharmacy",
    acquisitionMethod: "portal_browser_assist",
    kind: "portal_download",
    mediaType: "text/markdown",
    path: "files/pharmacy/corner/2025-10-12-flu-shot.md",
    documentType: "immunization_record",
    receivedAt: "2026-06-13T16:06:00Z",
    observedAt: "2025-10-12",
    freshness: "current",
    trustLevel: "imported_document",
  },
  {
    id: "diagnostic_report_quest_metabolic_2026_06_05",
    title: "Quest metabolic and inflammation report",
    originId: "origin_quest_diagnostics",
    acquisitionMethod: "local_file_import",
    kind: "document",
    mediaType: "application/pdf",
    path: "files/labs/quest/2026-06-05-full-lab-report.pdf",
    documentType: "lab_report",
    receivedAt: importedAt,
    observedAt: "2026-06-05",
    freshness: "current",
    trustLevel: "lab_result",
  },
  {
    id: "organization_northside_medical",
    title: "Northside Medical Group profile",
    originId: "origin_northside_medical",
    acquisitionMethod: "portal_browser_assist",
    kind: "portal_download",
    mediaType: "application/json",
    path: "external/fhir/Organization/northside-medical.json",
    documentType: "portal_record",
    receivedAt: "2026-06-13T16:05:00Z",
    freshness: "current",
    trustLevel: "provider_api",
  },
  {
    id: "provider_elena_morales",
    title: "Dr. Elena Morales profile",
    originId: "origin_northside_medical",
    acquisitionMethod: "portal_browser_assist",
    kind: "portal_download",
    mediaType: "application/json",
    path: "external/fhir/Practitioner/elena-morales.json",
    documentType: "portal_record",
    receivedAt: "2026-06-13T16:05:00Z",
    freshness: "current",
    trustLevel: "provider_api",
  },
  {
    id: "location_northside_clinic",
    title: "Northside clinic location",
    originId: "origin_northside_medical",
    acquisitionMethod: "portal_browser_assist",
    kind: "portal_download",
    mediaType: "application/json",
    path: "external/fhir/Location/northside-clinic.json",
    documentType: "portal_record",
    receivedAt: "2026-06-13T16:05:00Z",
    freshness: "current",
    trustLevel: "provider_api",
  },
  {
    id: "coverage_acme_ppo",
    title: "Acme PPO coverage",
    originId: "origin_acme_health_plan",
    acquisitionMethod: "payer_patient_access_api",
    kind: "structured_export",
    mediaType: "application/json",
    path: "external/fhir/Coverage/acme-ppo.json",
    documentType: "insurance_document",
    receivedAt: "2026-06-13T16:10:00Z",
    freshness: "current",
    trustLevel: "payer_claim",
  },
  {
    id: "claim_primary_care_2026_05_28",
    title: "Primary care claim",
    originId: "origin_acme_health_plan",
    acquisitionMethod: "payer_patient_access_api",
    kind: "structured_export",
    mediaType: "application/json",
    path: "external/fhir/Claim/primary-care-2026-05-28.json",
    documentType: "insurance_document",
    receivedAt: "2026-06-13T16:10:00Z",
    observedAt: "2026-05-28",
    freshness: "current",
    trustLevel: "payer_claim",
  },
  {
    id: "bill_primary_care_2026_05_28",
    title: "Primary care bill",
    originId: "origin_northside_medical",
    acquisitionMethod: "portal_browser_assist",
    kind: "portal_download",
    mediaType: "application/pdf",
    path: "files/billing/northside/2026-05-28-primary-care-bill.pdf",
    documentType: "insurance_document",
    receivedAt: "2026-06-13T16:05:00Z",
    observedAt: "2026-05-28",
    freshness: "current",
    trustLevel: "imported_document",
  },
  {
    id: "payment_primary_care_2026_06_01",
    title: "Primary care payment",
    originId: "origin_acme_health_plan",
    acquisitionMethod: "payer_patient_access_api",
    kind: "structured_export",
    mediaType: "application/json",
    path: "external/fhir/ExplanationOfBenefit/primary-care-payment.json",
    documentType: "insurance_document",
    receivedAt: "2026-06-13T16:10:00Z",
    observedAt: "2026-06-01",
    freshness: "current",
    trustLevel: "payer_claim",
  },
  {
    id: "authorization_physical_therapy",
    title: "Physical therapy authorization",
    originId: "origin_acme_health_plan",
    acquisitionMethod: "payer_patient_access_api",
    kind: "structured_export",
    mediaType: "application/json",
    path: "external/fhir/Claim/physical-therapy-authorization.json",
    documentType: "insurance_document",
    receivedAt: "2026-06-13T16:10:00Z",
    observedAt: "2026-06-10",
    freshness: "current",
    trustLevel: "payer_claim",
  },
]

function evidenceFor(recordId: string, confidence = 1): EvidenceLink[] {
  return [
    {
      artifactId: `artifact_${recordId}`,
      documentId: `document_${recordId}`,
      provenanceEventId: `provenance_${recordId}`,
      confidence,
      confidenceLabel: confidence >= 0.9 ? "high" : confidence >= 0.65 ? "medium" : "low",
      freshness: "current",
    },
  ]
}

function sourceSeedFor(recordId: string) {
  const seed = sourceSeeds.find((item) => item.id === recordId)
  if (!seed) {
    throw new Error(`Missing source seed for ${recordId}`)
  }
  return seed
}

function originFor(originId: string) {
  const origin = origins.find((item) => item.id === originId)
  if (!origin) {
    throw new Error(`Missing source origin for ${originId}`)
  }
  return origin
}

function evidenceSummaryFor(
  recordId: string,
  confidence: EvidenceSummary["confidence"],
  note?: string,
): EvidenceSummary {
  const source = sourceSeedFor(recordId)
  const origin = originFor(source.originId)
  return {
    id: `evidence_${recordId}`,
    sourceArtifactId: `artifact_${recordId}`,
    provenanceEventId: `provenance_${recordId}`,
    sourceName: origin.name,
    sourceTrust: source.trustLevel,
    artifactTitle: source.title,
    acquisitionMethod: source.acquisitionMethod,
    confidence,
    freshness: source.freshness,
    observedAt: source.observedAt,
    acquiredAt: source.receivedAt,
    note,
  }
}

const files: VaultFile[] = sourceSeeds.map((source) => ({
  id: `file_${source.id}`,
  relativePath: source.path,
  mediaType: source.mediaType,
}))

const acquisitions: AcquisitionEvent[] = sourceSeeds.map((source) => ({
  id: `acquisition_${source.id}`,
  method: source.acquisitionMethod,
  acquiredAt: source.receivedAt,
  originId: source.originId,
  actor: source.acquisitionMethod === "manual_entry" ? "user" : "healthview_os",
  note: `Synthetic acquisition for ${source.title}.`,
}))

const artifacts: SourceArtifact[] = sourceSeeds.map((source) => ({
  id: `artifact_${source.id}`,
  kind: source.kind,
  title: source.title,
  originId: source.originId,
  acquisitionEventId: `acquisition_${source.id}`,
  fileIds: [`file_${source.id}`],
  receivedAt: source.receivedAt,
  observedAt: source.observedAt,
  freshness: source.freshness,
  trustLevel: source.trustLevel,
}))

const documents: DocumentRecord[] = sourceSeeds.map((source) => ({
  id: `document_${source.id}`,
  artifactId: `artifact_${source.id}`,
  subjectPersonIds: [source.subjectPersonId ?? personId],
  documentType: source.documentType,
  title: source.title,
  documentDate: source.observedAt?.slice(0, 10),
  status: "available",
}))

const provenanceEvents = sourceSeeds.map((source) => ({
  id: `provenance_${source.id}`,
  type: source.acquisitionMethod === "manual_entry" ? "manual_entry" : "imported",
  occurredAt: source.receivedAt,
  actor: source.acquisitionMethod === "manual_entry" ? "user" : "healthview_os",
  inputIds: [`document_${source.id}`],
  outputIds: [source.id],
  method: "synthetic_seed_v1",
  confidence: source.trustLevel === "user_entered" ? 0.8 : 0.95,
})) satisfies HealthViewWorkspace["recordSet"]["provenanceEvents"]

const healthRecord = (
  id: string,
  kind: HealthRecord["kind"],
  title: string,
  confidence = 1,
  subjectPersonId = personId,
): HealthRecord => ({
  id,
  kind,
  subjectPersonId,
  title,
  lifecycleStatus: "active",
  recordedAt: createdAt,
  createdAt,
  updatedAt: createdAt,
  evidence: evidenceFor(id, confidence),
})

const comparisonHealthRecords: HealthRecord[] = comparisonPatientFixtures.flatMap((patient) => {
  const ids = comparisonRecordIds(patient)

  return [
    healthRecord(patient.id, "person", patient.displayName, 1, patient.id),
    healthRecord(ids.heartRate, "observation", "Resting heart rate", 0.9, patient.id),
    healthRecord(ids.sleep, "observation", "Sleep duration", 0.86, patient.id),
    healthRecord(ids.glucose, "observation", "Fasting glucose", 0.92, patient.id),
    healthRecord(ids.hrv, "observation", "Heart rate variability", 0.86, patient.id),
    healthRecord(ids.bloodPressure, "observation", "Blood pressure", 0.82, patient.id),
    healthRecord(ids.crp, "observation", "C-reactive protein", 0.9, patient.id),
    healthRecord(ids.medicationOrder, "medication_order", `${patient.care.medication} prescription`, 0.9, patient.id),
    healthRecord(ids.encounter, "encounter", patient.care.encounterTitle, 0.9, patient.id),
    healthRecord(ids.authorization, "authorization", `${patient.care.authorizationService} authorization`, 0.9, patient.id),
  ]
})

const healthRecords: HealthRecord[] = [
  healthRecord(personId, "person", "Sofia Reyes"),
  healthRecord("observation_heart_rate_2026_06_13", "observation", "Resting heart rate"),
  healthRecord("observation_sleep_2026_06_13", "observation", "Sleep duration", 0.82),
  healthRecord("observation_glucose_2026_06_05", "observation", "Fasting glucose"),
  healthRecord("observation_hrv_2026_06_13", "observation", "Heart rate variability", 0.82),
  healthRecord("observation_blood_pressure_2026_06_12", "observation", "Blood pressure", 0.82),
  healthRecord("observation_crp_2026_06_05", "observation", "C-reactive protein"),
  healthRecord("health_history_type_2_diabetes", "health_history_item", "Type 2 diabetes", 0.92),
  healthRecord("condition_type_2_diabetes", "condition", "Type 2 diabetes mellitus", 0.92),
  healthRecord("allergy_intolerance_penicillin", "allergy_intolerance", "Penicillin allergy", 0.9),
  healthRecord("medication_use_metformin", "medication_use", "Metformin", 0.9),
  healthRecord("medication_order_metformin", "medication_order", "Metformin prescription", 0.9),
  healthRecord("medication_dispense_metformin", "medication_dispense", "Metformin pharmacy fill", 0.9),
  healthRecord("encounter_primary_care_2026_05_28", "encounter", "Primary care follow-up", 0.94),
  healthRecord("immunization_influenza_2025_10_12", "immunization", "Influenza vaccine", 0.91),
  healthRecord("diagnostic_report_quest_metabolic_2026_06_05", "diagnostic_report", "Quest lab report"),
  healthRecord("organization_northside_medical", "organization", "Northside Medical Group", 0.94),
  healthRecord("provider_elena_morales", "provider", "Dr. Elena Morales", 0.94),
  healthRecord("location_northside_clinic", "location", "Northside Clinic", 0.94),
  healthRecord("coverage_acme_ppo", "coverage", "Acme PPO coverage", 0.95),
  healthRecord("claim_primary_care_2026_05_28", "claim", "Primary care claim", 0.95),
  healthRecord("bill_primary_care_2026_05_28", "bill", "Primary care bill", 0.9),
  healthRecord("payment_primary_care_2026_06_01", "payment", "Primary care payment", 0.95),
  healthRecord("authorization_physical_therapy", "authorization", "Physical therapy authorization", 0.95),
  ...comparisonHealthRecords,
]

const comparisonPeople: HealthViewWorkspace["recordSet"]["people"] = comparisonPatientFixtures.map((patient) => ({
  id: patient.id,
  displayName: patient.displayName,
  names: [
    {
      text: patient.displayName,
      family: patient.family,
      given: patient.displayName.split(" ").slice(0, -1),
      prefix: [],
      suffix: [],
      use: "official",
    },
  ],
  dateOfBirth: patient.dateOfBirth,
  sexAtBirth: patient.sexAtBirth,
  administrativeGender: patient.administrativeGender,
  identifiers: [],
  contactPoints: [],
  addresses: [
    {
      text: patient.address.text,
      line: [],
      city: patient.address.city,
      country: patient.address.country,
      use: "home",
    },
  ],
  addressText: patient.address.text,
  preferredLanguage: "en",
  emergencyContacts: [],
  relatedPersons: [],
  delegatedAccess: [],
  active: true,
  evidence: evidenceFor(patient.id),
}))

function comparisonVitalsFor(patient: ComparisonPatientFixture): VisualVitalMetric[] {
  const ids = comparisonRecordIds(patient)

  return [
    {
      id: `claim_vital_heart_rate_${comparisonPatientSlug(patient)}`,
      title: "Heart Rate",
      description: "Resting heart rate from the latest wearable sync.",
      confidence: "high",
      freshness: "current",
      generatedBy: "HealthView OS vital snapshot v0.1",
      generatedAt,
      lastUpdatedAt: "2026-06-13T16:24:00Z",
      evidence: [evidenceSummaryFor(ids.heartRate, "high")],
      recommendedAction: "Review source samples",
      detail: "Resting average",
      score: patient.heartRate.score,
      unit: "bpm",
      value: String(patient.heartRate.value),
    },
    {
      id: `claim_vital_sleep_${comparisonPatientSlug(patient)}`,
      title: "Sleep",
      description: "Sleep duration from the latest wearable sync.",
      confidence: "medium",
      freshness: "current",
      generatedBy: "HealthView OS sleep summary v0.1",
      generatedAt,
      lastUpdatedAt: "2026-06-13T16:24:00Z",
      evidence: [evidenceSummaryFor(ids.sleep, "medium")],
      detail: "Last night",
      score: patient.sleep.score,
      unit: "hrs",
      value: String(patient.sleep.value),
    },
    {
      id: `claim_vital_glucose_${comparisonPatientSlug(patient)}`,
      title: "Glucose",
      description: "Fasting glucose from an imported lab result.",
      confidence: "high",
      freshness: "current",
      generatedBy: "HealthView OS lab parser v0.1",
      generatedAt,
      lastUpdatedAt: "2026-06-13T16:18:00Z",
      evidence: [evidenceSummaryFor(ids.glucose, "high")],
      detail: "Fasting",
      score: patient.glucose.score,
      unit: "mg/dL",
      value: String(patient.glucose.value),
    },
    {
      id: `claim_vital_hrv_${comparisonPatientSlug(patient)}`,
      title: "HRV",
      description: "Seven day HRV median from wearable data.",
      confidence: "medium",
      freshness: "current",
      generatedBy: "HealthView OS recovery model v0.1",
      generatedAt,
      lastUpdatedAt: "2026-06-13T16:24:00Z",
      evidence: [evidenceSummaryFor(ids.hrv, "medium")],
      detail: "7 day median",
      score: patient.hrv.score,
      unit: "ms",
      value: String(patient.hrv.value),
    },
    {
      id: `claim_vital_blood_pressure_${comparisonPatientSlug(patient)}`,
      title: "Blood Pressure",
      description: "Latest blood pressure reading from manual entry.",
      confidence: "medium",
      freshness: "current",
      generatedBy: "HealthView OS vital snapshot v0.1",
      generatedAt,
      lastUpdatedAt: "2026-06-12T18:10:00Z",
      evidence: [evidenceSummaryFor(ids.bloodPressure, "medium")],
      detail: "Latest reading",
      score: patient.bloodPressure.score,
      unit: "",
      value: `${patient.bloodPressure.systolic}/${patient.bloodPressure.diastolic}`,
    },
  ]
}

const comparisonVitals = comparisonPatientFixtures.flatMap(comparisonVitalsFor)

function comparisonWarningsFor(patient: ComparisonPatientFixture): WarningSign[] {
  const ids = comparisonRecordIds(patient)
  const slug = comparisonPatientSlug(patient)

  return [
    {
      id: `claim_warning_${slug}_primary`,
      title: patient.crp.warning,
      description: `${patient.displayName}'s comparison profile has a watch item tied to recent vitals and lab context.`,
      confidence: "medium",
      freshness: "current",
      generatedBy: "HealthView OS trend rule v0.1",
      generatedAt,
      lastUpdatedAt: generatedAt,
      evidence: [
        evidenceSummaryFor(ids.bloodPressure, "medium"),
        evidenceSummaryFor(ids.crp, "medium"),
      ],
      recommendedAction: "Compare vitals, labs, and upcoming care.",
      subjectPersonId: patient.id,
      supportingRecordIds: [ids.bloodPressure, ids.crp],
      lifecycleStatus: "active",
      verificationStatus: "provisional",
      tone: patient.crp.tone,
    },
  ]
}

const comparisonWarnings = comparisonPatientFixtures.flatMap(comparisonWarningsFor)

function comparisonObservationsFor(patient: ComparisonPatientFixture): HealthViewWorkspace["recordSet"]["observations"] {
  const ids = comparisonRecordIds(patient)

  return [
    {
      id: ids.heartRate,
      subjectPersonId: patient.id,
      category: "wearable",
      code: { text: "Resting heart rate", codings: [{ system: "LOINC", code: "40443-4", display: "Heart rate" }] },
      effectiveDate: "2026-06-13",
      value: { kind: "quantity", value: patient.heartRate.value, unit: "bpm", ucumCode: "/min" },
      components: [],
      referenceRanges: [],
      status: "final",
      performerText: "Apple Health",
      evidence: evidenceFor(ids.heartRate, 0.9),
    },
    {
      id: ids.sleep,
      subjectPersonId: patient.id,
      category: "wearable",
      code: { text: "Sleep duration", codings: [] },
      effectiveDate: "2026-06-13",
      value: { kind: "quantity", value: patient.sleep.value, unit: "hrs", ucumCode: "h" },
      components: [],
      referenceRanges: [],
      status: "final",
      performerText: "Apple Health",
      evidence: evidenceFor(ids.sleep, 0.86),
    },
    {
      id: ids.glucose,
      subjectPersonId: patient.id,
      category: "laboratory",
      code: { text: "Fasting glucose", codings: [{ system: "LOINC", code: "1558-6" }] },
      effectiveDate: "2026-06-05",
      issuedAt: importedAt,
      value: { kind: "quantity", value: patient.glucose.value, unit: "mg/dL", ucumCode: "mg/dL" },
      components: [],
      interpretation: patient.glucose.interpretation,
      status: "final",
      performerText: "Quest Diagnostics",
      referenceRanges: [{ text: "70-99 mg/dL", appliesTo: [] }],
      evidence: evidenceFor(ids.glucose, 0.92),
    },
    {
      id: ids.hrv,
      subjectPersonId: patient.id,
      category: "wearable",
      code: { text: "Heart rate variability", codings: [] },
      effectiveDate: "2026-06-13",
      value: { kind: "quantity", value: patient.hrv.value, unit: "ms", ucumCode: "ms" },
      components: [],
      referenceRanges: [],
      interpretation: patient.hrv.interpretation,
      status: "final",
      performerText: "Apple Health",
      evidence: evidenceFor(ids.hrv, 0.86),
    },
    {
      id: ids.bloodPressure,
      subjectPersonId: patient.id,
      category: "manual",
      code: { text: "Blood pressure", codings: [{ system: "LOINC", code: "85354-9" }] },
      effectiveDate: "2026-06-12",
      components: [
        {
          code: { text: "Systolic blood pressure", codings: [{ system: "LOINC", code: "8480-6" }] },
          value: { kind: "quantity", value: patient.bloodPressure.systolic, unit: "mmHg", ucumCode: "mm[Hg]" },
          referenceRanges: [],
        },
        {
          code: { text: "Diastolic blood pressure", codings: [{ system: "LOINC", code: "8462-4" }] },
          value: { kind: "quantity", value: patient.bloodPressure.diastolic, unit: "mmHg", ucumCode: "mm[Hg]" },
          referenceRanges: [],
        },
      ],
      referenceRanges: [],
      status: "final",
      evidence: evidenceFor(ids.bloodPressure, 0.82),
    },
    {
      id: ids.crp,
      subjectPersonId: patient.id,
      category: "laboratory",
      code: { text: "C-reactive protein", codings: [{ system: "LOINC", code: "1988-5" }] },
      effectiveDate: "2026-06-05",
      issuedAt: importedAt,
      value: { kind: "quantity", value: patient.crp.value, unit: "mg/L", ucumCode: "mg/L" },
      components: [],
      referenceRanges: [],
      interpretation: patient.crp.value > 3 ? "high" : "normal",
      status: "final",
      performerText: "Quest Diagnostics",
      evidence: evidenceFor(ids.crp, 0.9),
    },
  ]
}

const comparisonObservations = comparisonPatientFixtures.flatMap(comparisonObservationsFor)

const comparisonMedicationOrders: HealthViewWorkspace["recordSet"]["medicationOrders"] = comparisonPatientFixtures.map((patient) => {
  const ids = comparisonRecordIds(patient)

  return {
    id: ids.medicationOrder,
    subjectPersonId: patient.id,
    medication: { text: patient.care.medication, codings: [] },
    status: "active",
    intent: "order",
    authoredDate: "2026-06-01",
    doseText: patient.care.medicationDose,
    frequencyText: patient.care.medicationFrequency,
    prescriberText: patient.care.provider,
    evidence: evidenceFor(ids.medicationOrder, 0.9),
  }
})

const comparisonEncounters: HealthViewWorkspace["recordSet"]["encounters"] = comparisonPatientFixtures.map((patient) => {
  const ids = comparisonRecordIds(patient)

  return {
    id: ids.encounter,
    subjectPersonId: patient.id,
    title: patient.care.encounterTitle,
    type: { text: "Office visit", codings: [] },
    class: "ambulatory",
    status: "planned",
    date: "2026-06-18",
    reason: { text: patient.crp.warning, codings: [] },
    providerText: patient.care.provider,
    organizationText: "Northside Medical Group",
    locationText: "Northside Clinic",
    linkedObservationIds: [ids.bloodPressure, ids.crp],
    linkedConditionIds: [],
    linkedDocumentIds: [],
    evidence: evidenceFor(ids.encounter, 0.9),
  }
})

const comparisonAuthorizations: HealthViewWorkspace["recordSet"]["authorizations"] = comparisonPatientFixtures.map((patient) => {
  const ids = comparisonRecordIds(patient)

  return {
    id: ids.authorization,
    subjectPersonId: patient.id,
    title: `${patient.care.authorizationService} authorization`,
    status: "approved",
    category: "prior_authorization",
    requestedDate: "2026-06-10",
    expirationDate: "2026-09-10",
    payerText: "Acme Health Plan",
    providerText: "Northside Medical Group",
    serviceText: patient.care.authorizationService,
    coverageId: "coverage_acme_ppo",
    evidence: evidenceFor(ids.authorization, 0.9),
  }
})

const comparisonServiceItems: HealthViewWorkspace["serviceItems"] = comparisonPatientFixtures.map((patient) => {
  const ids = comparisonRecordIds(patient)

  return {
    id: `service_${comparisonPatientSlug(patient)}_planned_care`,
    subjectPersonId: patient.id,
    title: patient.care.encounterTitle,
    category: "provider",
    status: "active",
    description: `Saved care plan for ${patient.displayName}.`,
    evidence: evidenceFor(ids.encounter, 0.9),
  }
})

const comparisonBillingItems: HealthViewWorkspace["billingItems"] = comparisonPatientFixtures.map((patient) => {
  const ids = comparisonRecordIds(patient)

  return {
    id: `billing_${comparisonPatientSlug(patient)}_authorization`,
    subjectPersonId: patient.id,
    title: `${patient.care.authorizationService} authorization`,
    category: "authorization",
    status: "active",
    description: `Approved authorization for ${patient.displayName}.`,
    evidence: evidenceFor(ids.authorization, 0.9),
  }
})

export const sampleVitals: VisualVitalMetric[] = [
  {
    id: "claim_vital_heart_rate",
    title: "Heart Rate",
    description: "Resting heart rate from the latest wearable sync.",
    confidence: "high",
    freshness: "current",
    generatedBy: "HealthView OS vital snapshot v0.1",
    generatedAt,
    lastUpdatedAt: "2026-06-13T16:24:00Z",
    evidence: [evidenceSummaryFor("observation_heart_rate_2026_06_13", "high")],
    recommendedAction: "Review source samples",
    detail: "Resting average",
    score: 78,
    unit: "bpm",
    value: "64",
  },
  {
    id: "claim_vital_sleep",
    title: "Sleep",
    description: "Sleep duration from the latest wearable sync.",
    confidence: "medium",
    freshness: "current",
    generatedBy: "HealthView OS sleep summary v0.1",
    generatedAt,
    lastUpdatedAt: "2026-06-13T16:24:00Z",
    evidence: [evidenceSummaryFor("observation_sleep_2026_06_13", "medium")],
    detail: "Last night",
    score: 84,
    unit: "hrs",
    value: "7.4",
  },
  {
    id: "claim_vital_glucose",
    title: "Glucose",
    description: "Fasting glucose from an imported lab result.",
    confidence: "high",
    freshness: "current",
    generatedBy: "HealthView OS lab parser v0.1",
    generatedAt,
    lastUpdatedAt: "2026-06-13T16:18:00Z",
    evidence: [evidenceSummaryFor("observation_glucose_2026_06_05", "high")],
    detail: "Fasting",
    score: 72,
    unit: "mg/dL",
    value: "91",
  },
  {
    id: "claim_vital_hrv",
    title: "HRV",
    description: "Seven day HRV median from wearable data.",
    confidence: "medium",
    freshness: "current",
    generatedBy: "HealthView OS recovery model v0.1",
    generatedAt,
    lastUpdatedAt: "2026-06-13T16:24:00Z",
    evidence: [
      evidenceSummaryFor(
        "observation_hrv_2026_06_13",
        "medium",
        "Nightly HRV is below the 30 day median for three consecutive nights.",
      ),
    ],
    detail: "7 day median",
    score: 61,
    unit: "ms",
    value: "48",
  },
  {
    id: "claim_vital_blood_pressure",
    title: "Blood Pressure",
    description: "Latest blood pressure reading from manual entry.",
    confidence: "medium",
    freshness: "current",
    generatedBy: "HealthView OS vital snapshot v0.1",
    generatedAt,
    lastUpdatedAt: "2026-06-12T18:05:00Z",
    evidence: [evidenceSummaryFor("observation_blood_pressure_2026_06_12", "medium")],
    detail: "Latest reading",
    score: 88,
    unit: "",
    value: "118/76",
  },
  ...comparisonVitals,
]

export const sampleWarningSigns: WarningSign[] = [
  {
    id: "claim_warning_inflammation",
    title: "Inflammation markers rising",
    description: "CRP trend is up 12% across the last two lab imports.",
    confidence: "medium",
    freshness: "current",
    generatedBy: "HealthView OS trend rule v0.1",
    generatedAt,
    lastUpdatedAt: generatedAt,
    evidence: [
      evidenceSummaryFor(
        "observation_crp_2026_06_05",
        "high",
        "CRP value increased compared with two earlier imported lab reports.",
      ),
    ],
    recommendedAction: "Review lab source",
    subjectPersonId: personId,
    supportingRecordIds: ["observation_crp_2026_06_05"],
    lifecycleStatus: "active",
    verificationStatus: "provisional",
    tone: "watch",
  },
  {
    id: "claim_warning_recovery",
    title: "Recovery strain",
    description: "HRV is below your 30 day baseline for 3 consecutive days.",
    confidence: "medium",
    freshness: "current",
    generatedBy: "HealthView OS recovery model v0.1",
    generatedAt,
    lastUpdatedAt: generatedAt,
    evidence: [
      evidenceSummaryFor(
        "observation_hrv_2026_06_13",
        "medium",
        "Nightly HRV is below the 30 day median for three consecutive nights.",
      ),
    ],
    recommendedAction: "Compare sleep, strain, and recovery evidence",
    subjectPersonId: personId,
    supportingRecordIds: ["observation_hrv_2026_06_13", "observation_sleep_2026_06_13"],
    lifecycleStatus: "active",
    verificationStatus: "provisional",
    tone: "attention",
  },
  {
    id: "claim_warning_preventive_care",
    title: "Preventive care due",
    description: "Annual wellness visit has not been scheduled.",
    confidence: "low",
    freshness: "unknown",
    generatedBy: "HealthView OS preventive care rule v0.1",
    generatedAt,
    lastUpdatedAt: generatedAt,
    evidence: [
      evidenceSummaryFor(
        "encounter_primary_care_2026_05_28",
        "low",
        "Portal list did not include an upcoming annual wellness visit.",
      ),
    ],
    recommendedAction: "Confirm with provider portal",
    subjectPersonId: personId,
    supportingRecordIds: ["encounter_primary_care_2026_05_28"],
    lifecycleStatus: "active",
    verificationStatus: "unknown",
    tone: "neutral",
  },
  ...comparisonWarnings,
]

function sampleSystemRow(input: {
  bodySystem: HealthMapSignal["bodySystem"]
  confidence: HealthMapSignal["confidence"]
  description: string
  evidence: HealthMapSignal["evidence"]
  freshness: HealthMapSignal["freshness"]
  id: string
  label: string
  score: number
  subjectPersonId?: string
  supportingRecordIds: string[]
  value: string
  verificationStatus?: HealthMapSignal["verificationStatus"]
}): HealthMapSignal {
  return {
    id: `claim_system_${input.id}`,
    title: input.label,
    label: input.label,
    value: input.value,
    bodySystem: input.bodySystem,
    description: input.description,
    confidence: input.confidence,
    freshness: input.freshness,
    generatedBy: "HealthView OS system map v0.1",
    generatedAt,
    lastUpdatedAt: generatedAt,
    evidence: input.evidence,
    subjectPersonId: input.subjectPersonId ?? personId,
    supportingRecordIds: input.supportingRecordIds,
    lifecycleStatus: "active",
    verificationStatus: input.verificationStatus ?? "provisional",
    score: input.score,
  }
}

function comparisonSystemRowsFor(patient: ComparisonPatientFixture): HealthMapSignal[] {
  const ids = comparisonRecordIds(patient)
  const slug = comparisonPatientSlug(patient)

  return [
    sampleSystemRow({
      id: `${slug}_cardio`,
      label: "Cardio",
      value: patient.systemScores.cardiovascular >= 75 ? "Stable" : "Watch",
      bodySystem: "cardiovascular",
      description: "Cardio status combines resting heart rate, blood pressure, and recovery trend.",
      confidence: "medium",
      freshness: "current",
      evidence: [
        evidenceSummaryFor(ids.heartRate, "high"),
        evidenceSummaryFor(ids.bloodPressure, "medium"),
      ],
      supportingRecordIds: [ids.heartRate, ids.bloodPressure],
      subjectPersonId: patient.id,
      score: patient.systemScores.cardiovascular,
    }),
    sampleSystemRow({
      id: `${slug}_nervous`,
      label: "Nervous",
      value: patient.systemScores.nervous >= 75 ? "Recovered" : "Strained",
      bodySystem: "nervous",
      description: "Nervous system status uses sleep, HRV, and stress-adjacent recovery signals.",
      confidence: "medium",
      freshness: "current",
      evidence: [
        evidenceSummaryFor(ids.sleep, "medium"),
        evidenceSummaryFor(ids.hrv, "medium"),
      ],
      supportingRecordIds: [ids.sleep, ids.hrv],
      subjectPersonId: patient.id,
      score: patient.systemScores.nervous,
    }),
    sampleSystemRow({
      id: `${slug}_respiratory`,
      label: "Respiratory",
      value: patient.systemScores.respiratory >= 75 ? "Clear" : "Watch",
      bodySystem: "respiratory",
      description: "Respiratory status is currently inferred from recent encounter notes and available vitals.",
      confidence: "medium",
      freshness: "current",
      evidence: [evidenceSummaryFor(ids.encounter, "medium")],
      supportingRecordIds: [ids.encounter],
      subjectPersonId: patient.id,
      score: patient.systemScores.respiratory,
    }),
    sampleSystemRow({
      id: `${slug}_endocrine`,
      label: "Endocrine",
      value: patient.systemScores.endocrine >= 75 ? "Stable" : "Watch",
      bodySystem: "endocrine",
      description: "Endocrine status combines glucose and current medication context.",
      confidence: "medium",
      freshness: "current",
      evidence: [
        evidenceSummaryFor(ids.glucose, "high"),
        evidenceSummaryFor(ids.medicationOrder, "medium"),
      ],
      supportingRecordIds: [ids.glucose, ids.medicationOrder],
      subjectPersonId: patient.id,
      score: patient.systemScores.endocrine,
    }),
    sampleSystemRow({
      id: `${slug}_immune`,
      label: "Immune",
      value: patient.systemScores.immune >= 75 ? "Quiet" : "Watch",
      bodySystem: "immune",
      description: "Immune status reflects inflammation markers and current care context.",
      confidence: "medium",
      freshness: "current",
      evidence: [evidenceSummaryFor(ids.crp, "high")],
      supportingRecordIds: [ids.crp],
      subjectPersonId: patient.id,
      score: patient.systemScores.immune,
    }),
  ]
}

export const sampleSystemRows: HealthMapSignal[] = [
  sampleSystemRow({
    id: "skin",
    label: "Skin",
    value: "No flags",
    bodySystem: "skin",
    description: "Skin status is inferred from recent visit documentation and imported health records.",
    confidence: "low",
    freshness: "unknown",
    evidence: [evidenceSummaryFor("encounter_primary_care_2026_05_28", "low")],
    supportingRecordIds: ["encounter_primary_care_2026_05_28"],
    verificationStatus: "unknown",
    score: 82,
  }),
  sampleSystemRow({
    id: "skeletal",
    label: "Skeletal",
    value: "In rehab",
    bodySystem: "skeletal",
    description: "Skeletal status reflects the active physical therapy authorization and care context.",
    confidence: "medium",
    freshness: "current",
    evidence: [evidenceSummaryFor("authorization_physical_therapy", "medium")],
    supportingRecordIds: ["authorization_physical_therapy"],
    score: 72,
  }),
  sampleSystemRow({
    id: "muscular",
    label: "Muscular",
    value: "Building",
    bodySystem: "muscular",
    description: "Muscular status is estimated from activity recovery signals and physical therapy context.",
    confidence: "medium",
    freshness: "current",
    evidence: [
      evidenceSummaryFor("observation_hrv_2026_06_13", "medium"),
      evidenceSummaryFor("authorization_physical_therapy", "medium"),
    ],
    supportingRecordIds: ["observation_hrv_2026_06_13", "authorization_physical_therapy"],
    score: 74,
  }),
  sampleSystemRow({
    id: "cardio",
    label: "Cardio",
    value: "Stable",
    bodySystem: "cardiovascular",
    description: "Cardio status combines resting heart rate, blood pressure, and recovery trend.",
    confidence: "medium",
    freshness: "current",
    evidence: [
      evidenceSummaryFor("observation_heart_rate_2026_06_13", "high"),
      evidenceSummaryFor("observation_blood_pressure_2026_06_12", "medium"),
    ],
    supportingRecordIds: ["observation_heart_rate_2026_06_13", "observation_blood_pressure_2026_06_12"],
    score: 86,
  }),
  sampleSystemRow({
    id: "nervous",
    label: "Nervous",
    value: "Strained",
    bodySystem: "nervous",
    description: "Nervous system status uses sleep, HRV, and stress-adjacent recovery signals.",
    confidence: "medium",
    freshness: "current",
    evidence: [
      evidenceSummaryFor("observation_sleep_2026_06_13", "medium"),
      evidenceSummaryFor("observation_hrv_2026_06_13", "medium"),
    ],
    supportingRecordIds: ["observation_sleep_2026_06_13", "observation_hrv_2026_06_13"],
    score: 66,
  }),
  sampleSystemRow({
    id: "respiratory",
    label: "Respiratory",
    value: "Clear",
    bodySystem: "respiratory",
    description: "Respiratory status is currently inferred from recent encounter notes and available vitals.",
    confidence: "low",
    freshness: "unknown",
    evidence: [evidenceSummaryFor("encounter_primary_care_2026_05_28", "low")],
    supportingRecordIds: ["encounter_primary_care_2026_05_28"],
    verificationStatus: "unknown",
    score: 91,
  }),
  sampleSystemRow({
    id: "digestive",
    label: "Digestive",
    value: "Watch",
    bodySystem: "digestive",
    description: "Digestive status reflects metabolic history, medication context, and recent lab imports.",
    confidence: "medium",
    freshness: "current",
    evidence: [
      evidenceSummaryFor("condition_type_2_diabetes", "medium"),
      evidenceSummaryFor("medication_use_metformin", "medium"),
    ],
    supportingRecordIds: ["condition_type_2_diabetes", "medication_use_metformin"],
    score: 69,
  }),
  sampleSystemRow({
    id: "urinary",
    label: "Urinary",
    value: "No flags",
    bodySystem: "urinary",
    description: "Urinary status has no dedicated abnormal signal in the current local sample workspace.",
    confidence: "low",
    freshness: "unknown",
    evidence: [evidenceSummaryFor("encounter_primary_care_2026_05_28", "low")],
    supportingRecordIds: ["encounter_primary_care_2026_05_28"],
    verificationStatus: "unknown",
    score: 80,
  }),
  sampleSystemRow({
    id: "endocrine",
    label: "Endocrine",
    value: "Watch",
    bodySystem: "endocrine",
    description: "Endocrine status combines glucose, diabetes history, and medication records.",
    confidence: "medium",
    freshness: "current",
    evidence: [
      evidenceSummaryFor("observation_glucose_2026_06_05", "high"),
      evidenceSummaryFor("condition_type_2_diabetes", "medium"),
    ],
    supportingRecordIds: ["observation_glucose_2026_06_05", "condition_type_2_diabetes"],
    score: 68,
  }),
  sampleSystemRow({
    id: "reproductive",
    label: "Reproductive",
    value: "No flags",
    bodySystem: "reproductive",
    description: "Reproductive status is inferred from available demographics and recent primary care context.",
    confidence: "low",
    freshness: "unknown",
    evidence: [evidenceSummaryFor("encounter_primary_care_2026_05_28", "low")],
    supportingRecordIds: ["encounter_primary_care_2026_05_28"],
    verificationStatus: "unknown",
    score: 78,
  }),
  sampleSystemRow({
    id: "immune",
    label: "Immune",
    value: "Inflamed",
    bodySystem: "immune",
    description: "Immune status reflects inflammation markers and recent immunization context.",
    confidence: "medium",
    freshness: "current",
    evidence: [
      evidenceSummaryFor("observation_crp_2026_06_05", "high"),
      evidenceSummaryFor("immunization_influenza_2025_10_12", "medium"),
    ],
    supportingRecordIds: ["observation_crp_2026_06_05", "immunization_influenza_2025_10_12"],
    score: 64,
  }),
  ...comparisonPatientFixtures.flatMap(comparisonSystemRowsFor),
]

export const sampleSystemStatus: EvidenceBackedClaim = {
  id: "claim_system_status",
  title: "System status",
  description: "Overall readiness is based on connected sources, recent syncs, and available evidence coverage.",
  confidence: "medium",
  freshness: "current",
  generatedBy: "HealthView OS readiness model v0.1",
  generatedAt,
  lastUpdatedAt: generatedAt,
  evidence: [
    evidenceSummaryFor("observation_heart_rate_2026_06_13", "high"),
    evidenceSummaryFor("observation_sleep_2026_06_13", "medium"),
    evidenceSummaryFor("observation_glucose_2026_06_05", "high"),
    evidenceSummaryFor("observation_crp_2026_06_05", "high"),
  ],
  recommendedAction: "Review source coverage",
}

export const sampleUpcomingCare = [
  { title: "Primary care checkup", detail: "Jun 18, 10:30 AM" },
  { title: "Lipid panel follow-up", detail: "Results expected in 2 days" },
  { title: "Medication renewal", detail: "Atorvastatin refill window opens" },
]

export const exampleWorkspaceSeed = {
  schemaVersion: 1,
  vault: {
    id: "vault_default",
    label: "Example HealthView OS Vault",
    createdAt,
    schemaVersion: 1,
  },
  settings: {
    id: "settings_default",
    activePersonId: personId,
    backupMode: "none",
    remoteProcessingMode: "ask_each_time",
    vaultReadability: "readable_files",
    updatedAt: generatedAt,
  },
  recordSet: {
    vaults: [
      {
        id: "vault_default",
        label: "Example HealthView OS Vault",
        createdAt,
        schemaVersion: 1,
      },
    ],
    healthRecords,
    people: [
      {
        id: personId,
        displayName: "Sofia Reyes",
        names: [
          {
            text: "Sofia Reyes",
            family: "Reyes",
            given: ["Sofia"],
            prefix: [],
            suffix: [],
            use: "official",
          },
        ],
        dateOfBirth: "1988-04-12",
        sexAtBirth: "female",
        administrativeGender: "female",
        identifiers: [],
        contactPoints: [],
        addresses: [
          {
            text: "San Salvador, El Salvador",
            line: [],
            city: "San Salvador",
            country: "El Salvador",
            use: "home",
          },
        ],
        addressText: "San Salvador, El Salvador",
        preferredLanguage: "en",
        emergencyContacts: [],
        relatedPersons: [],
        delegatedAccess: [],
        active: true,
        evidence: evidenceFor(personId),
      },
      ...comparisonPeople,
    ],
    origins,
    acquisitions,
    files,
    artifacts,
    documents,
    provenanceEvents,
    externalResourceSnapshots: [],
    terminologyMappings: [
      {
        id: "mapping_observation_glucose_loinc",
        recordId: "observation_glucose_2026_06_05",
        fieldPath: "code",
        sourceDisplay: "Glucose fasting",
        targetSystem: "LOINC",
        targetCode: "1558-6",
        targetDisplay: "Fasting glucose [Mass/volume] in Serum or Plasma",
        confidence: 0.98,
        method: "synthetic_seed_v1",
        mappingStatus: "accepted",
      },
      {
        id: "mapping_medication_metformin_rxnorm",
        recordId: "medication_use_metformin",
        fieldPath: "medication",
        sourceDisplay: "Metformin",
        targetSystem: "RxNorm",
        targetCode: "6809",
        targetDisplay: "Metformin",
        confidence: 0.98,
        method: "synthetic_seed_v1",
        mappingStatus: "accepted",
      },
    ],
    observations: [
      {
        id: "observation_heart_rate_2026_06_13",
        subjectPersonId: personId,
        category: "wearable",
        code: { text: "Resting heart rate", codings: [{ system: "LOINC", code: "40443-4", display: "Heart rate" }] },
        effectiveDate: "2026-06-13",
        value: { kind: "quantity", value: 64, unit: "bpm", ucumCode: "/min" },
        components: [],
        referenceRanges: [],
        status: "final",
        performerText: "Apple Health",
        evidence: evidenceFor("observation_heart_rate_2026_06_13"),
      },
      {
        id: "observation_sleep_2026_06_13",
        subjectPersonId: personId,
        category: "wearable",
        code: { text: "Sleep duration", codings: [] },
        effectiveDate: "2026-06-13",
        value: { kind: "quantity", value: 7.4, unit: "hrs", ucumCode: "h" },
        components: [],
        referenceRanges: [],
        status: "final",
        performerText: "Apple Health",
        evidence: evidenceFor("observation_sleep_2026_06_13", 0.82),
      },
      {
        id: "observation_glucose_2026_06_05",
        subjectPersonId: personId,
        category: "laboratory",
        code: { text: "Fasting glucose", codings: [{ system: "LOINC", code: "1558-6" }] },
        effectiveDate: "2026-06-05",
        issuedAt: importedAt,
        value: { kind: "quantity", value: 91, unit: "mg/dL", ucumCode: "mg/dL" },
        components: [],
        interpretation: "normal",
        status: "final",
        performerText: "Quest Diagnostics",
        referenceRanges: [{ text: "70-99 mg/dL", appliesTo: [] }],
        evidence: evidenceFor("observation_glucose_2026_06_05"),
      },
      {
        id: "observation_hrv_2026_06_13",
        subjectPersonId: personId,
        category: "wearable",
        code: { text: "Heart rate variability", codings: [] },
        effectiveDate: "2026-06-13",
        value: { kind: "quantity", value: 48, unit: "ms", ucumCode: "ms" },
        components: [],
        referenceRanges: [],
        interpretation: "low",
        status: "final",
        performerText: "Apple Health",
        evidence: evidenceFor("observation_hrv_2026_06_13", 0.82),
      },
      {
        id: "observation_blood_pressure_2026_06_12",
        subjectPersonId: personId,
        category: "manual",
        code: { text: "Blood pressure", codings: [{ system: "LOINC", code: "85354-9" }] },
        effectiveDate: "2026-06-12",
        components: [
          {
            code: { text: "Systolic blood pressure", codings: [{ system: "LOINC", code: "8480-6" }] },
            value: { kind: "quantity", value: 118, unit: "mmHg", ucumCode: "mm[Hg]" },
            referenceRanges: [],
          },
          {
            code: { text: "Diastolic blood pressure", codings: [{ system: "LOINC", code: "8462-4" }] },
            value: { kind: "quantity", value: 76, unit: "mmHg", ucumCode: "mm[Hg]" },
            referenceRanges: [],
          },
        ],
        referenceRanges: [],
        status: "final",
        evidence: evidenceFor("observation_blood_pressure_2026_06_12", 0.82),
      },
      {
        id: "observation_crp_2026_06_05",
        subjectPersonId: personId,
        category: "laboratory",
        code: { text: "C-reactive protein", codings: [{ system: "LOINC", code: "1988-5" }] },
        effectiveDate: "2026-06-05",
        issuedAt: importedAt,
        value: { kind: "quantity", value: 4.2, unit: "mg/L", ucumCode: "mg/L" },
        components: [],
        referenceRanges: [],
        interpretation: "high",
        status: "final",
        performerText: "Quest Diagnostics",
        evidence: evidenceFor("observation_crp_2026_06_05"),
      },
      ...comparisonObservations,
    ],
    conditions: [
      {
        id: "condition_type_2_diabetes",
        subjectPersonId: personId,
        code: { text: "Type 2 diabetes mellitus", codings: [{ system: "ICD-10-CM", code: "E11.9" }] },
        category: "diagnosis",
        clinicalStatus: "active",
        verificationStatus: "confirmed",
        onsetDate: "2024-08-15",
        recordedDate: "2026-06-13",
        evidence: evidenceFor("condition_type_2_diabetes", 0.92),
      },
    ],
    healthHistoryItems: [
      {
        id: "health_history_type_2_diabetes",
        subjectPersonId: personId,
        section: "medical",
        title: "Type 2 diabetes",
        status: "current",
        date: "2024-08-15",
        note: "Synthetic medical history item used for model development.",
        evidence: evidenceFor("health_history_type_2_diabetes", 0.92),
      },
    ],
    allergyIntolerances: [
      {
        id: "allergy_intolerance_penicillin",
        subjectPersonId: personId,
        substance: { text: "Penicillin", codings: [] },
        type: "allergy",
        categories: ["medication"],
        criticality: "high",
        clinicalStatus: "active",
        verificationStatus: "confirmed",
        onsetDate: "2019-03-01",
        lastOccurrenceDate: "2019-03-01",
        reactions: [{ manifestations: [{ text: "Hives", codings: [] }], severity: "moderate" }],
        evidence: evidenceFor("allergy_intolerance_penicillin", 0.9),
      },
    ],
    medicationUses: [
      {
        id: "medication_use_metformin",
        subjectPersonId: personId,
        medication: { text: "Metformin", codings: [{ system: "RxNorm", code: "6809", display: "Metformin" }] },
        status: "active",
        doseText: "500 mg",
        routeText: "by mouth",
        frequencyText: "twice daily",
        startDate: "2025-01-15",
        reason: { text: "Type 2 diabetes mellitus", codings: [] },
        prescriberText: "Northside Primary Care",
        evidence: evidenceFor("medication_use_metformin", 0.9),
      },
    ],
    medicationOrders: [
      {
        id: "medication_order_metformin",
        subjectPersonId: personId,
        medication: { text: "Metformin", codings: [{ system: "RxNorm", code: "6809", display: "Metformin" }] },
        status: "active",
        intent: "order",
        authoredDate: "2025-01-15",
        doseText: "500 mg",
        frequencyText: "twice daily",
        prescriberText: "Dr. Elena Morales",
        evidence: evidenceFor("medication_order_metformin", 0.9),
      },
      ...comparisonMedicationOrders,
    ],
    medicationDispenses: [
      {
        id: "medication_dispense_metformin",
        subjectPersonId: personId,
        medication: { text: "Metformin", codings: [{ system: "RxNorm", code: "6809", display: "Metformin" }] },
        status: "completed",
        dispenseDate: "2026-06-01",
        quantityText: "60 tablets",
        daysSupplyText: "30 days",
        pharmacyText: "Corner Pharmacy",
        evidence: evidenceFor("medication_dispense_metformin", 0.9),
      },
    ],
    encounters: [
      {
        id: "encounter_primary_care_2026_05_28",
        subjectPersonId: personId,
        title: "Primary care follow-up",
        type: { text: "Office visit", codings: [] },
        class: "ambulatory",
        status: "finished",
        date: "2026-05-28",
        reason: { text: "Diabetes follow-up", codings: [] },
        providerText: "Dr. Elena Morales",
        organizationText: "Northside Medical Group",
        locationText: "Northside Clinic",
        linkedObservationIds: ["observation_glucose_2026_06_05", "observation_crp_2026_06_05"],
        linkedConditionIds: ["condition_type_2_diabetes"],
        linkedDocumentIds: ["document_encounter_primary_care_2026_05_28"],
        evidence: evidenceFor("encounter_primary_care_2026_05_28", 0.94),
      },
      ...comparisonEncounters,
    ],
    immunizations: [
      {
        id: "immunization_influenza_2025_10_12",
        subjectPersonId: personId,
        vaccine: { text: "Influenza vaccine", codings: [{ system: "CVX", code: "158" }] },
        status: "completed",
        occurrenceDate: "2025-10-12",
        lotNumber: "FLU25EX",
        performerText: "Corner Pharmacy",
        doseText: "0.5 mL",
        evidence: evidenceFor("immunization_influenza_2025_10_12", 0.91),
      },
    ],
    diagnosticReports: [
      {
        id: "diagnostic_report_quest_metabolic_2026_06_05",
        subjectPersonId: personId,
        title: "Quest metabolic and inflammation report",
        category: "laboratory",
        status: "final",
        effectiveDate: "2026-06-05",
        issuedAt: importedAt,
        performerText: "Quest Diagnostics",
        resultObservationIds: ["observation_glucose_2026_06_05", "observation_crp_2026_06_05"],
        documentIds: ["document_diagnostic_report_quest_metabolic_2026_06_05"],
        evidence: evidenceFor("diagnostic_report_quest_metabolic_2026_06_05"),
      },
    ],
    providers: [
      {
        id: "provider_elena_morales",
        name: "Dr. Elena Morales",
        providerType: "practitioner",
        specialty: { text: "Primary care", codings: [] },
        organizationId: "organization_northside_medical",
        locationIds: ["location_northside_clinic"],
        identifiers: [],
        contactPoints: [],
        active: true,
        evidence: evidenceFor("provider_elena_morales", 0.94),
      },
    ],
    organizations: [
      {
        id: "organization_northside_medical",
        name: "Northside Medical Group",
        type: "provider_group",
        identifiers: [],
        contactPoints: [],
        active: true,
        evidence: evidenceFor("organization_northside_medical", 0.94),
      },
    ],
    locations: [
      {
        id: "location_northside_clinic",
        name: "Northside Clinic",
        status: "active",
        mode: "instance",
        type: "clinic",
        organizationId: "organization_northside_medical",
        contactPoints: [],
        evidence: evidenceFor("location_northside_clinic", 0.94),
      },
    ],
    coverages: [
      {
        id: "coverage_acme_ppo",
        subjectPersonId: personId,
        payerText: "Acme Health Plan",
        planName: "Acme PPO",
        status: "active",
        coverageType: "medical",
        evidence: evidenceFor("coverage_acme_ppo", 0.95),
      },
    ],
    claims: [
      {
        id: "claim_primary_care_2026_05_28",
        subjectPersonId: personId,
        title: "Primary care claim",
        status: "active",
        claimType: "professional",
        providerText: "Northside Medical Group",
        payerText: "Acme Health Plan",
        serviceDate: "2026-05-28",
        amountCents: 14800,
        currency: "USD",
        coverageId: "coverage_acme_ppo",
        evidence: evidenceFor("claim_primary_care_2026_05_28", 0.95),
      },
    ],
    bills: [
      {
        id: "bill_primary_care_2026_05_28",
        subjectPersonId: personId,
        title: "Primary care bill",
        status: "open",
        billDate: "2026-05-28",
        dueDate: "2026-06-28",
        amountCents: 4200,
        currency: "USD",
        payeeText: "Northside Medical Group",
        claimId: "claim_primary_care_2026_05_28",
        evidence: evidenceFor("bill_primary_care_2026_05_28", 0.9),
      },
    ],
    payments: [
      {
        id: "payment_primary_care_2026_06_01",
        subjectPersonId: personId,
        title: "Primary care insurance payment",
        status: "completed",
        paidAt: "2026-06-01",
        amountCents: 10600,
        currency: "USD",
        payerText: "Acme Health Plan",
        payeeText: "Northside Medical Group",
        billId: "bill_primary_care_2026_05_28",
        evidence: evidenceFor("payment_primary_care_2026_06_01", 0.95),
      },
    ],
    authorizations: [
      {
        id: "authorization_physical_therapy",
        subjectPersonId: personId,
        title: "Physical therapy authorization",
        status: "approved",
        category: "prior_authorization",
        requestedDate: "2026-06-10",
        expirationDate: "2026-09-10",
        payerText: "Acme Health Plan",
        providerText: "Northside Medical Group",
        serviceText: "Physical therapy evaluation",
        coverageId: "coverage_acme_ppo",
        evidence: evidenceFor("authorization_physical_therapy", 0.95),
      },
      ...comparisonAuthorizations,
    ],
    derivedSummaries: [
      {
        id: "derived_summary_readiness",
        subjectPersonId: personId,
        title: "Readiness summary",
        summaryText: "Readiness is stable, with metabolic and recovery signals worth watching.",
        category: "health_overview",
        generatedAt,
        method: "synthetic_seed_v1",
        inputRecordIds: ["observation_hrv_2026_06_13", "observation_crp_2026_06_05"],
        confidence: 0.74,
        limitations: ["Synthetic data for development only."],
        evidence: [
          ...evidenceFor("observation_hrv_2026_06_13", 0.82),
          ...evidenceFor("observation_crp_2026_06_05"),
        ],
      },
    ],
    derivedTimelineEvents: [
      {
        id: "derived_timeline_lab_import_2026_06_13",
        subjectPersonId: personId,
        title: "Quest labs imported",
        eventDate: importedAt,
        category: "source",
        description: "Metabolic and inflammation panels were imported into the local vault.",
        inputRecordIds: ["diagnostic_report_quest_metabolic_2026_06_05"],
        method: "synthetic_seed_v1",
        evidence: evidenceFor("diagnostic_report_quest_metabolic_2026_06_05"),
      },
    ],
    derivedInsights: [
      {
        id: "derived_insight_inflammation",
        subjectPersonId: personId,
        title: "Inflammation markers rising",
        category: "warning_sign",
        status: "active",
        description: "CRP trend is up 12% across the last two lab imports.",
        generatedAt,
        inputRecordIds: ["observation_crp_2026_06_05"],
        confidence: 0.74,
        evidence: evidenceFor("observation_crp_2026_06_05"),
      },
    ],
    visualVitals: sampleVitals,
    warningSigns: sampleWarningSigns,
    healthMapSignals: sampleSystemRows,
  },
  serviceItems: [
    {
      id: "service_primary_care",
      subjectPersonId: personId,
      title: "Northside primary care",
      category: "provider",
      status: "active",
      description: "Saved primary care service.",
      evidence: evidenceFor("provider_elena_morales", 0.94),
    },
    ...comparisonServiceItems,
  ],
  billingItems: [
    {
      id: "billing_open_primary_care_bill",
      subjectPersonId: personId,
      title: "Primary care bill",
      category: "bill",
      status: "pending",
      amountCents: 4200,
      currency: "USD",
      description: "Open bill after insurance payment.",
      evidence: evidenceFor("bill_primary_care_2026_05_28", 0.9),
    },
    ...comparisonBillingItems,
  ],
} satisfies HealthViewWorkspace
