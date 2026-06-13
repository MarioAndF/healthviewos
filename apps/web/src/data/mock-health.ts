import type { EvidenceBackedClaim } from "@healthviewos/schema"

type VitalMetric = EvidenceBackedClaim & {
  detail: string
  score: number
  unit: string
  value: string
}

type WarningSign = EvidenceBackedClaim & {
  tone: "attention" | "neutral" | "watch"
}

type SystemSignal = EvidenceBackedClaim & {
  label: string
  score: number
  value: string
}

const generatedAt = "2026-06-13T16:30:00.000Z"

const questCrpEvidence = {
  acquisitionMethod: "local_file_import",
  acquiredAt: "2026-06-13T16:12:00.000Z",
  artifactTitle: "Quest Diagnostics inflammation panel.pdf",
  confidence: "high",
  freshness: "current",
  id: "evidence_quest_crp_jun",
  note: "CRP value increased compared with two earlier imported lab reports.",
  observedAt: "2026-06-05",
  sourceName: "Quest Diagnostics",
  sourceTrust: "lab_result",
} satisfies EvidenceBackedClaim["evidence"][number]

const wearableRecoveryEvidence = {
  acquisitionMethod: "native_health_platform",
  acquiredAt: "2026-06-13T16:20:00.000Z",
  artifactTitle: "Apple Health HRV export",
  confidence: "medium",
  freshness: "current",
  id: "evidence_apple_health_hrv",
  note: "Nightly HRV is below the 30 day median for three consecutive nights.",
  observedAt: "2026-06-13",
  sourceName: "Apple Health",
  sourceTrust: "device_or_wearable",
} satisfies EvidenceBackedClaim["evidence"][number]

export const vitals: VitalMetric[] = [
  {
    confidence: "high",
    description: "Resting heart rate from the latest wearable sync.",
    detail: "Resting average",
    evidence: [
      {
        acquisitionMethod: "native_health_platform",
        acquiredAt: "2026-06-13T16:20:00.000Z",
        artifactTitle: "Apple Health heart rate samples",
        confidence: "high",
        freshness: "current",
        id: "evidence_heart_rate_wearable",
        observedAt: "2026-06-13",
        sourceName: "Apple Health",
        sourceTrust: "device_or_wearable",
      },
    ],
    freshness: "current",
    generatedAt,
    generatedBy: "HealthView OS vital snapshot v0.1",
    id: "claim_vital_heart_rate",
    lastUpdatedAt: "2026-06-13T16:24:00.000Z",
    recommendedAction: "Review source samples",
    score: 78,
    title: "Heart Rate",
    unit: "bpm",
    value: "64",
  },
  {
    confidence: "medium",
    description: "Sleep duration from the latest wearable sync.",
    detail: "Last night",
    evidence: [
      {
        acquisitionMethod: "native_health_platform",
        acquiredAt: "2026-06-13T16:20:00.000Z",
        artifactTitle: "Apple Health sleep analysis",
        confidence: "medium",
        freshness: "current",
        id: "evidence_sleep_wearable",
        observedAt: "2026-06-13",
        sourceName: "Apple Health",
        sourceTrust: "device_or_wearable",
      },
    ],
    freshness: "current",
    generatedAt,
    generatedBy: "HealthView OS sleep summary v0.1",
    id: "claim_vital_sleep",
    lastUpdatedAt: "2026-06-13T16:24:00.000Z",
    score: 84,
    title: "Sleep",
    unit: "hrs",
    value: "7.4",
  },
  {
    confidence: "high",
    description: "Fasting glucose from an imported lab result.",
    detail: "Fasting",
    evidence: [
      {
        acquisitionMethod: "local_file_import",
        acquiredAt: "2026-06-13T16:12:00.000Z",
        artifactTitle: "Quest Diagnostics metabolic panel.pdf",
        confidence: "high",
        freshness: "current",
        id: "evidence_glucose_lab",
        observedAt: "2026-06-05",
        sourceName: "Quest Diagnostics",
        sourceTrust: "lab_result",
      },
    ],
    freshness: "current",
    generatedAt,
    generatedBy: "HealthView OS lab parser v0.1",
    id: "claim_vital_glucose",
    lastUpdatedAt: "2026-06-13T16:18:00.000Z",
    score: 72,
    title: "Glucose",
    unit: "mg/dL",
    value: "91",
  },
  {
    confidence: "medium",
    description: "Seven day HRV median from wearable data.",
    detail: "7 day median",
    evidence: [wearableRecoveryEvidence],
    freshness: "current",
    generatedAt,
    generatedBy: "HealthView OS recovery model v0.1",
    id: "claim_vital_hrv",
    lastUpdatedAt: "2026-06-13T16:24:00.000Z",
    score: 61,
    title: "HRV",
    unit: "ms",
    value: "48",
  },
  {
    confidence: "medium",
    description: "Latest blood pressure reading from manual entry.",
    detail: "Latest reading",
    evidence: [
      {
        acquisitionMethod: "manual_entry",
        acquiredAt: "2026-06-12T18:05:00.000Z",
        artifactTitle: "Home cuff reading",
        confidence: "medium",
        freshness: "current",
        id: "evidence_bp_manual",
        observedAt: "2026-06-12",
        sourceName: "Manual entry",
        sourceTrust: "user_entered",
      },
    ],
    freshness: "current",
    generatedAt,
    generatedBy: "HealthView OS vital snapshot v0.1",
    id: "claim_vital_blood_pressure",
    lastUpdatedAt: "2026-06-12T18:05:00.000Z",
    score: 88,
    title: "Blood Pressure",
    unit: "",
    value: "118/76",
  },
]

export const warningSigns: WarningSign[] = [
  {
    confidence: "medium",
    description: "CRP trend is up 12% across the last two lab imports.",
    evidence: [questCrpEvidence],
    freshness: "current",
    generatedAt,
    generatedBy: "HealthView OS trend rule v0.1",
    id: "claim_warning_inflammation",
    lastUpdatedAt: "2026-06-13T16:30:00.000Z",
    recommendedAction: "Review lab source",
    title: "Inflammation markers rising",
    tone: "watch",
  },
  {
    confidence: "medium",
    description: "HRV is below your 30 day baseline for 3 consecutive days.",
    evidence: [wearableRecoveryEvidence],
    freshness: "current",
    generatedAt,
    generatedBy: "HealthView OS recovery model v0.1",
    id: "claim_warning_recovery",
    lastUpdatedAt: "2026-06-13T16:30:00.000Z",
    recommendedAction: "Compare sleep, strain, and recovery evidence",
    title: "Recovery strain",
    tone: "attention",
  },
  {
    confidence: "low",
    description: "Annual wellness visit has not been scheduled.",
    evidence: [
      {
        acquisitionMethod: "portal_browser_assist",
        acquiredAt: "2026-06-13T16:05:00.000Z",
        artifactTitle: "Northside Medical portal appointment list",
        confidence: "low",
        freshness: "unknown",
        id: "evidence_annual_visit_portal",
        note: "Portal list did not include an upcoming annual wellness visit.",
        sourceName: "Northside Medical Group",
        sourceTrust: "provider_api",
      },
    ],
    freshness: "unknown",
    generatedAt,
    generatedBy: "HealthView OS preventive care rule v0.1",
    id: "claim_warning_preventive_care",
    lastUpdatedAt: "2026-06-13T16:30:00.000Z",
    recommendedAction: "Confirm with provider portal",
    title: "Preventive care due",
    tone: "neutral",
  },
]

export const systemRows: SystemSignal[] = [
  {
    confidence: "medium",
    description: "Cardiovascular status combines resting heart rate, blood pressure, and recovery trend.",
    evidence: [vitals[0].evidence[0], vitals[4].evidence[0]],
    freshness: "current",
    generatedAt,
    generatedBy: "HealthView OS system map v0.1",
    id: "claim_system_cardiovascular",
    label: "Cardiovascular",
    lastUpdatedAt: "2026-06-13T16:30:00.000Z",
    score: 86,
    title: "Cardiovascular",
    value: "Stable",
  },
  {
    confidence: "medium",
    description: "Metabolic status combines glucose and inflammation markers.",
    evidence: [vitals[2].evidence[0], questCrpEvidence],
    freshness: "current",
    generatedAt,
    generatedBy: "HealthView OS system map v0.1",
    id: "claim_system_metabolic",
    label: "Metabolic",
    lastUpdatedAt: "2026-06-13T16:30:00.000Z",
    score: 68,
    title: "Metabolic",
    value: "Watch",
  },
  {
    confidence: "low",
    description: "Respiratory status is currently inferred from limited available records.",
    evidence: [],
    freshness: "unknown",
    generatedAt,
    generatedBy: "HealthView OS system map v0.1",
    id: "claim_system_respiratory",
    label: "Respiratory",
    lastUpdatedAt: "2026-06-13T16:30:00.000Z",
    score: 91,
    title: "Respiratory",
    value: "Clear",
  },
  {
    confidence: "medium",
    description: "Recovery status combines HRV, sleep duration, and wearable activity data.",
    evidence: [wearableRecoveryEvidence, vitals[1].evidence[0]],
    freshness: "current",
    generatedAt,
    generatedBy: "HealthView OS recovery model v0.1",
    id: "claim_system_recovery",
    label: "Recovery",
    lastUpdatedAt: "2026-06-13T16:30:00.000Z",
    score: 58,
    title: "Recovery",
    value: "Low buffer",
  },
]

export const systemStatus: EvidenceBackedClaim = {
  confidence: "medium",
  description: "Overall readiness is based on connected sources, recent syncs, and available evidence coverage.",
  evidence: [
    ...vitals.slice(0, 3).map((vital) => vital.evidence[0]),
    warningSigns[0].evidence[0],
  ],
  freshness: "current",
  generatedAt,
  generatedBy: "HealthView OS readiness model v0.1",
  id: "claim_system_status",
  lastUpdatedAt: "2026-06-13T16:30:00.000Z",
  recommendedAction: "Review source coverage",
  title: "System status",
}

export const upcomingCare = [
  { title: "Primary care checkup", detail: "Jun 18, 10:30 AM" },
  { title: "Lipid panel follow-up", detail: "Results expected in 2 days" },
  { title: "Medication renewal", detail: "Atorvastatin refill window opens" },
]
