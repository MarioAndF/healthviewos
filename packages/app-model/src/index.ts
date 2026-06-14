export type HealthViewIconKey =
  | "activity"
  | "alert"
  | "arrow-left"
  | "baby"
  | "bone"
  | "brain"
  | "building"
  | "calendar"
  | "card"
  | "chevron-right"
  | "clipboard-list"
  | "close"
  | "digestive"
  | "dna"
  | "droplet"
  | "dumbbell"
  | "file"
  | "folder"
  | "globe"
  | "heart"
  | "hospital"
  | "id-card"
  | "lab"
  | "medication"
  | "message"
  | "microscope"
  | "scan"
  | "security"
  | "settings"
  | "stethoscope"
  | "syringe"
  | "user"
  | "utensils"
  | "wind"

export const mainDestinations = [
  {
    id: "health",
    label: "Health",
    icon: "heart",
    iosSymbol: { default: "heart", selected: "heart.fill" },
    materialSymbol: "favorite",
  },
  {
    id: "services",
    label: "Services",
    icon: "hospital",
    iosSymbol: { default: "cross.case", selected: "cross.case.fill" },
    materialSymbol: "medical_services",
  },
  {
    id: "records",
    label: "Records",
    icon: "clipboard-list",
    iosSymbol: { default: "clipboard", selected: "clipboard.fill" },
    materialSymbol: "assignment",
  },
  {
    id: "billing",
    label: "Billing",
    icon: "card",
    iosSymbol: { default: "creditcard", selected: "creditcard.fill" },
    materialSymbol: "credit_card",
  },
  {
    id: "settings",
    label: "Settings",
    icon: "settings",
    iosSymbol: { default: "gearshape", selected: "gearshape.fill" },
    materialSymbol: "settings",
  },
] as const satisfies readonly {
  icon: HealthViewIconKey
  id: string
  iosSymbol: { default: string; selected: string }
  label: string
  materialSymbol: string
}[]

export type MainDestinationId = (typeof mainDestinations)[number]["id"]

export const pageDescriptions: Record<MainDestinationId, string> = {
  health: "A visual operating layer for current state, trends, warning signs, and care context.",
  services: "Find saved providers, care options, labs, pharmacies, and virtual services.",
  records: "Connected sources and normalized records in one lightweight view.",
  billing: "Bills, claims, coverage, and authorizations from the local workspace.",
  settings: "Vault controls and assistant preferences.",
}

export const recordCategories = [
  { id: "demographics", label: "Demographics", icon: "id-card", description: "Identity, contact, and profile details." },
  { id: "medications", label: "Medications", icon: "medication", description: "Medication use, prescriptions, and pharmacy fills." },
  { id: "history", label: "History", icon: "folder", description: "Medical, family, social, and condition history." },
  { id: "allergies", label: "Allergies", icon: "security", description: "Allergies, intolerances, reactions, and criticality." },
  { id: "visits", label: "Visits", icon: "stethoscope", description: "Encounters, appointments, and visit context." },
  { id: "labs", label: "Labs", icon: "microscope", description: "Laboratory observations and diagnostic values." },
  { id: "immunizations", label: "Immunizations", icon: "syringe", description: "Vaccines and immunization records." },
  { id: "diagnostic_reports", label: "Reports", icon: "file", description: "Diagnostic reports and linked observations." },
  { id: "imaging", label: "Imaging", icon: "scan", description: "Imaging studies and radiology reports." },
  { id: "pathology", label: "Pathology", icon: "lab", description: "Pathology reports and specimen results." },
  { id: "other", label: "Others", icon: "file", description: "Records that do not fit another category." },
] as const satisfies readonly {
  description: string
  icon: HealthViewIconKey
  id: string
  label: string
}[]

export type RecordCategoryId = (typeof recordCategories)[number]["id"]

export const billingSections = [
  { id: "bills", label: "Bills", icon: "card", description: "Patient balances, due dates, and payment status." },
  { id: "claims", label: "Claims", icon: "file", description: "Insurance claims with payer, provider, and amount context." },
  { id: "authorizations", label: "Authorizations", icon: "security", description: "Referrals, prior authorizations, and expiration windows." },
] as const satisfies readonly {
  description: string
  icon: HealthViewIconKey
  id: string
  label: string
}[]

export type BillingSectionId = (typeof billingSections)[number]["id"]

export const historySections = [
  { id: "medical", label: "Medical", description: "Conditions, diagnoses, and medical history." },
  { id: "surgical", label: "Surgical", description: "Procedures and surgical history." },
  { id: "family", label: "Family", description: "Family health history." },
  { id: "social", label: "Social", description: "Social and lifestyle history." },
  { id: "reproductive", label: "Reproductive", description: "Reproductive health history." },
  { id: "other", label: "Other", description: "Other history items." },
] as const

export type HistorySectionId = (typeof historySections)[number]["id"]

export const bodySystems = [
  { id: "skin", label: "Skin", icon: "droplet" },
  { id: "skeletal", label: "Skeletal", icon: "bone" },
  { id: "muscular", label: "Muscular", icon: "dumbbell" },
  { id: "cardiovascular", label: "Cardio", icon: "heart" },
  { id: "nervous", label: "Nervous", icon: "brain" },
  { id: "respiratory", label: "Respiratory", icon: "wind" },
  { id: "digestive", label: "Digestive", icon: "utensils" },
  { id: "urinary", label: "Urinary", icon: "droplet" },
  { id: "endocrine", label: "Endocrine", icon: "dna" },
  { id: "reproductive", label: "Reproductive", icon: "baby" },
  { id: "immune", label: "Immune", icon: "security" },
] as const satisfies readonly {
  icon: HealthViewIconKey
  id: string
  label: string
}[]

export type BodySystemId = (typeof bodySystems)[number]["id"]
