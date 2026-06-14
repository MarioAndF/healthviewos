import type {
  EvidenceBackedClaim,
  HealthMapSignal,
  HealthViewWorkspace,
  VisualVitalMetric,
  WarningSign,
  Person,
} from "@healthviewos/schema"
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Baby,
  Bookmark,
  Bone,
  Brain,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Dna,
  Download,
  Droplets,
  Dumbbell,
  FileText,
  FlaskConical,
  Folder,
  Globe2,
  Heart,
  Hospital,
  IdCard,
  LoaderCircle,
  List,
  MessageCircle,
  Mic,
  MicOff,
  Microscope,
  MapPin,
  Pill,
  Plus,
  RotateCcw,
  ScanLine,
  Search,
  Send,
  Settings,
  Shield,
  Stethoscope,
  Syringe,
  Upload,
  UserRound,
  Utensils,
  Wind,
  X,
  type LucideIcon,
} from "lucide-react"
import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent, type ReactNode, type SelectHTMLAttributes } from "react"
import { create } from "zustand"

import type {
  HealthViewAgentMessage,
  HealthViewAgentProviderId,
  HealthViewAgentSettings,
  HealthViewAgentThread,
  HealthViewAppLocation,
  HealthViewAtlasSystemId,
  HealthViewControlClient,
  HealthViewControlCommand,
  HealthViewUiActionRisk,
  HealthViewUiActionSummary,
  HealthViewUiSearchResult,
} from "@healthviewos/agent"
import {
  createHealthViewAgentClient,
  createNewHealthViewAgentThread,
  getHealthViewAgentSettings,
  healthViewProviderOptions,
  listHealthViewAgentThreads,
  updateHealthViewAgentSettings,
} from "@/agent"
import { EvidenceDialog } from "@/components/evidence/evidence-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { SectionTable, SectionTableRow } from "@/components/ui/section-table"
import { Separator } from "@/components/ui/separator"
import {
  selectSystemReadiness,
  selectSystemRows,
  selectSystemStatus,
  selectSystemStatusRows,
  selectUpcomingCare,
  selectVitals,
  selectWarningSigns,
  selectWorkspaceSummary,
  createManualRecordInWorkspace,
  createManualRecordFromFieldsInWorkspace,
  emptyDraftForRecordCategory,
  getRecordFormDefinition,
  getWorkspaceRecordSummary,
  recordInputFromDraft,
  searchWorkspaceRecords,
  updateManualRecordFieldsInWorkspace,
  type RecordFormDefinition,
  type RecordFormField,
  type SystemStatusRow,
  type UpcomingCareItem,
} from "@healthviewos/workspace"
import { createBrowserHealthContextReader } from "@/health-context"
import { findAtlasTargetById, searchAtlasTargets } from "@/data/atlas-targets"
import {
  semanticBadgeVariantForTone,
  semanticDotClass,
  semanticToneForScore,
  semanticToneForValue,
  type SemanticTone,
} from "@/lib/semantic-status"
import { cn } from "@/lib/utils"
import { useNavigationStore, type PageId, type RecordsLocationState, type ServicesLocationState } from "@/store/navigation"
import { useAtlasViewStore, type HealthViewAtlasViewControl } from "@/store/atlas-view"
import { useWorkspaceStore } from "@/store/workspace"
import { startXaiVoiceSession, type HealthViewVoiceSession, type HealthViewVoiceTranscriptUpdate } from "@/voice"

const navItems: Array<{ id: PageId; label: string; icon: LucideIcon }> = [
  { id: "health", label: "Health", icon: Heart },
  { id: "services", label: "Services", icon: Hospital },
  { id: "records", label: "Records", icon: ClipboardList },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "settings", label: "Settings", icon: Settings },
]

const sectionCardClass =
  "border-white/70 bg-card/85 shadow-[0_18px_55px_rgba(15,23,42,0.07)] ring-1 ring-foreground/5 backdrop-blur-xl supports-[backdrop-filter]:bg-card/75 dark:border-white/10 dark:bg-card/65 dark:shadow-[0_18px_55px_rgba(0,0,0,0.28)]"

const metricCardClass = cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")

const settingsFieldControlClass =
  "h-8 w-40 rounded-full border bg-background px-3 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-56"

const settingsSelectControlClass = cn(settingsFieldControlClass, "appearance-none pr-8")

const recordFieldControlClass =
  "min-h-9 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"

const recordTextareaControlClass = cn(recordFieldControlClass, "min-h-24 resize-y leading-6")

const careIcons = [Stethoscope, FileText, CalendarDays]

const OpenHumanBodyScene = lazy(() =>
  import("@/components/health/openhuman-body-scene").then((module) => ({
    default: module.OpenHumanBodyScene,
  })),
)

const bodySystemIcons = {
  skin: Droplets,
  skeletal: Bone,
  muscular: Dumbbell,
  cardiovascular: Heart,
  nervous: Brain,
  respiratory: Wind,
  digestive: Utensils,
  urinary: Droplets,
  endocrine: Dna,
  reproductive: Baby,
  immune: Shield,
  metabolic: Activity,
  recovery: Activity,
  other: Activity,
} satisfies Record<HealthMapSignal["bodySystem"], LucideIcon>

const atlasSystemToHealthBodySystem = {
  skin: "skin",
  skeletal: "skeletal",
  joints: "skeletal",
  muscular: "muscular",
  cardiovascular: "cardiovascular",
  nervous: "nervous",
  respiratory: "respiratory",
  digestive: "digestive",
  urinary: "urinary",
  endocrine: "endocrine",
  reproductive: "reproductive",
  "smplx-female": null,
  "smplx-male": null,
} satisfies Record<HealthViewAtlasSystemId, HealthMapSignal["bodySystem"] | null>

const pageSummaries: Record<
  Exclude<PageId, "health">,
  {
    title: string
    description: string
    icon: LucideIcon
    rows?: Array<{ title: string; description: string; meta: string }>
  }
> = {
  services: {
    title: "Services",
    description: "Find care options, saved providers, labs, pharmacy, and virtual visits.",
    icon: Hospital,
    rows: [
      {
        title: "Primary care",
        description: "Routine visits and care navigation.",
        meta: "2 in-network options",
      },
      {
        title: "Lab testing",
        description: "Diagnostics connected to your recent care plan.",
        meta: "3 nearby labs",
      },
      {
        title: "Virtual care",
        description: "On-demand appointments for low-acuity concerns.",
        meta: "Available today",
      },
    ],
  },
  records: {
    title: "Records",
    description: "A structured map of clinical documents, labs, medications, and visits.",
    icon: ClipboardList,
    rows: [
      {
        title: "Lab results",
        description: "CBC, lipid panel, A1C, metabolic panels.",
        meta: "28 records",
      },
      {
        title: "Medications",
        description: "Active prescriptions and historical changes.",
        meta: "4 active",
      },
      {
        title: "Visit notes",
        description: "Clinical notes and summaries from providers.",
        meta: "11 notes",
      },
    ],
  },
  billing: {
    title: "Billing",
    description: "Bills, claims, and authorizations from the local workspace.",
    icon: CreditCard,
  },
  settings: {
    title: "Settings",
    description: "Local vault controls and assistant settings.",
    icon: Settings,
  },
}

type RecordsPageRow = {
  categoryId: RecordCategoryId
  id: string
  meta: string
  subtitle: string
  title: string
}

type RecordDetailRow = {
  label: string
  value: ReactNode
}

type RecordDetailGroup = {
  rows: RecordDetailRow[]
  title: string
}

type RecordCategoryDefinition = {
  description: string
  icon: LucideIcon
  id: string
  label: string
}

type BillingSectionId = "bills" | "claims" | "authorizations"

type BillingPageRow = {
  amount: string
  date: string
  id: string
  meta: string
  subtitle: string
  title: string
}

type BillingSectionDefinition = {
  description: string
  icon: LucideIcon
  id: BillingSectionId
  label: string
}

const recordCategories = [
  { id: "demographics", label: "Demographics", icon: IdCard, description: "Identity, contact, and profile details." },
  { id: "medications", label: "Medications", icon: Pill, description: "Medication use, prescriptions, and pharmacy fills." },
  { id: "history", label: "History", icon: Folder, description: "Medical, family, social, and condition history." },
  { id: "allergies", label: "Allergies", icon: Shield, description: "Allergies, intolerances, reactions, and criticality." },
  { id: "visits", label: "Visits", icon: Stethoscope, description: "Encounters, appointments, and visit context." },
  { id: "labs", label: "Labs", icon: Microscope, description: "Laboratory observations and diagnostic values." },
  { id: "immunizations", label: "Immunizations", icon: Syringe, description: "Vaccines and immunization records." },
  { id: "diagnostic_reports", label: "Reports", icon: FileText, description: "Diagnostic reports and linked observations." },
  { id: "imaging", label: "Imaging", icon: ScanLine, description: "Imaging studies and radiology reports." },
  { id: "pathology", label: "Pathology", icon: Microscope, description: "Pathology reports and specimen results." },
  { id: "other", label: "Others", icon: FileText, description: "Records that do not fit another Healthio category." },
] as const satisfies readonly RecordCategoryDefinition[]

type RecordCategoryId = (typeof recordCategories)[number]["id"]

const recordsPageSize = 5
const billingPreviewLimit = 3

const billingSections = [
  { id: "bills", label: "Bills", icon: CreditCard, description: "Patient balances, due dates, and payment status." },
  { id: "claims", label: "Claims", icon: FileText, description: "Insurance claims with payer, provider, and amount context." },
  { id: "authorizations", label: "Authorizations", icon: Shield, description: "Referrals, prior authorizations, and expiration windows." },
] as const satisfies readonly BillingSectionDefinition[]

const historySections = [
  { id: "medical", label: "Medical", description: "Conditions, diagnoses, and medical history." },
  { id: "surgical", label: "Surgical", description: "Procedures and surgical history." },
  { id: "family", label: "Family", description: "Family health history." },
  { id: "social", label: "Social", description: "Social and lifestyle history." },
  { id: "reproductive", label: "Reproductive", description: "Reproductive health history." },
  { id: "other", label: "Other", description: "Other history items." },
] as const

type HistorySectionId = (typeof historySections)[number]["id"]

type HealthViewUiAction = HealthViewUiActionSummary & {
  command: Extract<HealthViewControlCommand, { type: "ui/navigate" }>
  keywords: string[]
}

function isHistorySectionId(value: string | null | undefined): value is HistorySectionId {
  return historySections.some((section) => section.id === value)
}

type DirectorySearchMode = "nearby" | "online" | "saved" | "general"

type DirectoryCategory = "provider" | "facility" | "lab" | "pharmacy" | "digital_service" | "other"

type DirectoryAvailabilityMode = "physical" | "virtual" | "mail" | "at_home" | "hybrid" | "unknown"

type DirectorySourceId = "local" | "nppes" | "google_places"

type DirectorySearchInput = {
  category?: DirectoryCategory
  location?: {
    latitude: number
    longitude: number
    radiusMeters?: number
  }
  mode: DirectorySearchMode
  query: string
}

type ServicesNearbyLocation = {
  latitude: number
  longitude: number
}

type ServicesNearbyLocationStatus = "idle" | "requesting" | "ready" | "unavailable"

type ServicesNearbyLocationState = {
  location: ServicesNearbyLocation | null
  status: ServicesNearbyLocationStatus
  setLocation: (location: ServicesNearbyLocation | null) => void
  setStatus: (status: ServicesNearbyLocationStatus) => void
}

const useServicesNearbyLocationStore = create<ServicesNearbyLocationState>((set) => ({
  location: null,
  setLocation: (location) => set({ location, status: location ? "ready" : "idle" }),
  setStatus: (status) => set({ status }),
  status: "idle",
}))

let servicesNearbyLocationRequest: Promise<ServicesNearbyLocation | null> | null = null

function resolveServicesNearbyLocation(): Promise<ServicesNearbyLocation | null> {
  const state = useServicesNearbyLocationStore.getState()
  if (state.location) return Promise.resolve(state.location)
  if (servicesNearbyLocationRequest) return servicesNearbyLocationRequest

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    state.setStatus("unavailable")
    return Promise.resolve(null)
  }

  state.setStatus("requesting")
  const request = new Promise<ServicesNearbyLocation | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        useServicesNearbyLocationStore.getState().setLocation(location)
        resolve(location)
      },
      () => {
        useServicesNearbyLocationStore.getState().setStatus("unavailable")
        resolve(null)
      },
      { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: 6000 },
    )
  }).finally(() => {
    if (servicesNearbyLocationRequest === request) {
      servicesNearbyLocationRequest = null
    }
  })

  servicesNearbyLocationRequest = request
  return request
}

type DirectorySourceClaim = {
  confidence?: number
  externalId?: string
  fetchedAt: string
  note?: string
  sourceId: DirectorySourceId
  sourceName: string
}

type DirectorySearchResult = {
  addressText?: string
  availabilityMode: DirectoryAvailabilityMode
  category: DirectoryCategory
  description?: string
  id: string
  latitude?: number
  localRecordId?: string
  longitude?: number
  npi?: string
  organizationName?: string
  phone?: string
  saved?: boolean
  sourceClaims: DirectorySourceClaim[]
  specialtyText?: string
  title: string
  website?: string
}

type NppesSearchResponse = {
  results?: NppesResult[]
}

type NppesResult = {
  addresses?: NppesAddress[]
  basic?: {
    first_name?: string
    last_name?: string
    middle_name?: string
    organization_name?: string
  }
  enumeration_type?: string
  number: number | string
  taxonomies?: Array<{
    desc?: string
    primary?: boolean
  }>
}

type NppesAddress = {
  address_1?: string
  address_2?: string
  address_purpose?: string
  city?: string
  country_name?: string
  postal_code?: string
  state?: string
  telephone_number?: string
}

type GooglePlace = {
  businessStatus?: string
  displayName?: {
    text?: string
  }
  formattedAddress?: string
  googleMapsUri?: string
  id?: string
  internationalPhoneNumber?: string
  location?: {
    latitude?: number
    longitude?: number
  }
  nationalPhoneNumber?: string
  primaryType?: string
  types?: string[]
  websiteUri?: string
}

type GooglePlacesSearchPayload = {
  places?: GooglePlace[]
}

const serviceDirectoryTabs: Array<{
  category?: DirectoryCategory
  icon: LucideIcon
  id: string
  label: string
  mode: DirectorySearchMode
}> = [
  { id: "nearby", label: "Nearby", icon: MapPin, mode: "nearby" },
  { id: "providers", label: "Providers", icon: Stethoscope, mode: "general", category: "provider" },
  { id: "facilities", label: "Facilities", icon: Hospital, mode: "nearby", category: "facility" },
  { id: "labs", label: "Labs", icon: FlaskConical, mode: "nearby", category: "lab" },
  { id: "pharmacy", label: "Pharmacy", icon: Pill, mode: "nearby", category: "pharmacy" },
  { id: "online", label: "Online", icon: Globe2, mode: "online", category: "digital_service" },
  { id: "saved", label: "Saved", icon: Bookmark, mode: "saved" },
]

function serviceDirectoryTabForId(tabId: string | null | undefined) {
  return serviceDirectoryTabs.find((tab) => tab.id === tabId) ?? serviceDirectoryTabs[0]
}

function serviceDirectoryTabForQuery(query: string | undefined, fallbackTabId?: string | null) {
  const normalizedQuery = normalizedDirectoryText(query ?? "")
  if (/\b(pharmacy|pharmacies|drugstore|medication fill|rx)\b/.test(normalizedQuery)) {
    return serviceDirectoryTabForId("pharmacy")
  }
  if (/\b(lab|labs|laboratory|blood draw|bloodwork|testing)\b/.test(normalizedQuery)) {
    return serviceDirectoryTabForId("labs")
  }
  if (/\b(hospital|clinic|facility|urgent care|imaging center)\b/.test(normalizedQuery)) {
    return serviceDirectoryTabForId("facilities")
  }
  if (/\b(telehealth|virtual|online|remote)\b/.test(normalizedQuery)) {
    return serviceDirectoryTabForId("online")
  }
  if (/\b(saved|my providers|my services)\b/.test(normalizedQuery)) {
    return serviceDirectoryTabForId("saved")
  }
  if (/\b(provider|doctor|physician|specialist|clinician|therapist|dentist)\b/.test(normalizedQuery)) {
    return serviceDirectoryTabForId("providers")
  }

  return serviceDirectoryTabForId(fallbackTabId)
}

function buildServiceDirectoryResults(
  workspace: HealthViewWorkspace | null,
  input: DirectorySearchInput,
  now = new Date(),
) {
  if (!workspace) return []

  const query = normalizedDirectoryText(input.query)
  const localResults = [
    ...workspace.recordSet.providers.map((provider) => providerToDirectoryResult(workspace, provider, now)),
    ...workspace.recordSet.organizations.map((organization) => organizationToDirectoryResult(organization, now)),
    ...workspace.recordSet.locations.map((location) => locationToDirectoryResult(workspace, location, now)),
    ...workspace.serviceItems.map((serviceItem) => serviceItemToDirectoryResult(serviceItem, now)),
  ]

  return localResults
    .map((result) => ({
      ...result,
      saved: true,
    }))
    .filter((result) => directoryResultMatchesInput(result, input, query))
    .sort((left, right) => directoryRank(input, right) - directoryRank(input, left))
}

function directoryResultMatchesInput(
  result: DirectorySearchResult,
  input: DirectorySearchInput,
  query: string,
) {
  if (result.saved && input.mode !== "saved" && !directoryResultIsNearby(result, input)) return false
  if (input.mode === "online" && result.availabilityMode === "physical") return false
  if (input.mode === "saved" && !result.saved) return false
  if (input.category && result.category !== input.category) return false
  if (!query || input.mode === "saved") return true

  return normalizedDirectoryText(
    [
      result.title,
      result.description,
      result.specialtyText,
      result.organizationName,
      result.addressText,
    ].join(" "),
  ).includes(query)
}

function directoryResultIsNearby(result: DirectorySearchResult, input: DirectorySearchInput) {
  if (!input.location || result.latitude === undefined || result.longitude === undefined) return false

  return (
    distanceMeters(input.location, {
      latitude: result.latitude,
      longitude: result.longitude,
    }) <= (input.location.radiusMeters ?? 15000)
  )
}

function providerToDirectoryResult(
  workspace: HealthViewWorkspace,
  provider: HealthViewWorkspace["recordSet"]["providers"][number],
  now: Date,
): DirectorySearchResult {
  const organization = workspace.recordSet.organizations.find((item) => item.id === provider.organizationId)
  const primaryLocation = workspace.recordSet.locations.find((location) => provider.locationIds.includes(location.id))
  const npi = provider.identifiers.find((identifier) => identifier.system.toLowerCase().includes("npi"))?.value

  return {
    addressText: formatAddress(primaryLocation?.address),
    availabilityMode: primaryLocation ? availabilityForLocationType(primaryLocation.type) : "unknown",
    category: "provider",
    description: [readableToken(provider.providerType), provider.specialty?.text].filter(Boolean).join(" - "),
    id: `local_provider_${provider.id}`,
    localRecordId: provider.id,
    npi,
    organizationName: organization?.name,
    phone: provider.contactPoints.find((point) => point.system === "phone")?.value,
    saved: true,
    sourceClaims: [localDirectoryClaim(provider.id, now)],
    specialtyText: provider.specialty?.text,
    title: provider.name,
    website: provider.contactPoints.find((point) => point.system === "url")?.value,
  }
}

function organizationToDirectoryResult(
  organization: HealthViewWorkspace["recordSet"]["organizations"][number],
  now: Date,
): DirectorySearchResult {
  const addressText = formatAddress(organization.address)

  return {
    addressText,
    availabilityMode: addressText ? "physical" : "unknown",
    category: categoryForOrganizationType(organization.type),
    description: readableToken(organization.type),
    id: `local_organization_${organization.id}`,
    localRecordId: organization.id,
    phone: organization.contactPoints.find((point) => point.system === "phone")?.value,
    saved: true,
    sourceClaims: [localDirectoryClaim(organization.id, now)],
    title: organization.name,
    website: organization.contactPoints.find((point) => point.system === "url")?.value,
  }
}

function locationToDirectoryResult(
  workspace: HealthViewWorkspace,
  location: HealthViewWorkspace["recordSet"]["locations"][number],
  now: Date,
): DirectorySearchResult {
  const organization = workspace.recordSet.organizations.find((item) => item.id === location.organizationId)

  return {
    addressText: formatAddress(location.address),
    availabilityMode: availabilityForLocationType(location.type),
    category: categoryForLocationType(location.type),
    description: readableToken(location.type),
    id: `local_location_${location.id}`,
    localRecordId: location.id,
    organizationName: organization?.name,
    phone: location.contactPoints.find((point) => point.system === "phone")?.value,
    saved: true,
    sourceClaims: [localDirectoryClaim(location.id, now)],
    title: location.name,
    website: location.contactPoints.find((point) => point.system === "url")?.value,
  }
}

function serviceItemToDirectoryResult(
  serviceItem: HealthViewWorkspace["serviceItems"][number],
  now: Date,
): DirectorySearchResult {
  return {
    availabilityMode: serviceItem.category === "digital_service" ? "virtual" : "unknown",
    category: serviceItem.category,
    description: serviceItem.description,
    id: `local_service_${serviceItem.id}`,
    localRecordId: serviceItem.id,
    saved: true,
    sourceClaims: [localDirectoryClaim(serviceItem.id, now)],
    title: serviceItem.title,
  }
}

async function searchNppesDirectory(input: DirectorySearchInput): Promise<DirectorySearchResult[]> {
  const query = input.query.trim()
  if (!query || input.mode === "saved" || input.category === "pharmacy" || input.category === "digital_service") {
    return []
  }

  const params = new URLSearchParams({
    country_code: "US",
    limit: "10",
    version: "2.1",
  })

  if (/^\d{10}$/.test(query)) {
    params.set("number", query)
  } else {
    params.set("keyword", query)
  }

  const response = await fetch(`/api/nppes-search?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`NPPES search failed with ${response.status}.`)
  }

  const payload = (await response.json()) as NppesSearchResponse
  return (payload.results ?? [])
    .map((item) => nppesItemToDirectoryResult(item, new Date()))
    .filter((result) => directoryResultMatchesInput(result, input, normalizedDirectoryText(input.query)))
}

function nppesItemToDirectoryResult(item: NppesResult, now: Date): DirectorySearchResult {
  const basic = item.basic ?? {}
  const address = preferredNppesAddress(item.addresses ?? [])
  const taxonomy = item.taxonomies?.find((entry) => entry.primary) ?? item.taxonomies?.[0]
  const isOrganization = item.enumeration_type === "NPI-2"
  const title = isOrganization
    ? basic.organization_name || "Unknown organization"
    : [basic.first_name, basic.middle_name, basic.last_name].filter(Boolean).join(" ") || "Unknown provider"

  return {
    addressText: formatNppesAddress(address),
    availabilityMode: address ? "physical" : "unknown",
    category: isOrganization ? "facility" : "provider",
    description: taxonomy?.desc ?? (isOrganization ? "Organization provider" : "Individual provider"),
    id: `nppes_${item.number}`,
    npi: String(item.number),
    phone: address?.telephone_number,
    sourceClaims: [
      {
        confidence: 0.84,
        externalId: String(item.number),
        fetchedAt: now.toISOString(),
        note: item.enumeration_type,
        sourceId: "nppes",
        sourceName: "NPPES NPI Registry",
      },
    ],
    specialtyText: taxonomy?.desc,
    title,
  }
}

async function searchGooglePlacesDirectory(input: DirectorySearchInput): Promise<DirectorySearchResult[]> {
  const textQuery = googlePlacesTextQuery(input)
  if (!textQuery || input.mode === "saved" || input.category === "digital_service") {
    return []
  }

  const payload = import.meta.env.DEV
    ? await searchGooglePlacesFromBrowser(input, textQuery)
    : await searchGooglePlacesFromApi(input, textQuery)

  return (payload.places ?? [])
    .map((place) => googlePlaceToDirectoryResult(place, input, new Date()))
    .filter((result): result is DirectorySearchResult => Boolean(result))
}

async function searchGooglePlacesFromApi(input: DirectorySearchInput, textQuery: string): Promise<GooglePlacesSearchPayload> {
  const response = await fetch("/api/places-search", {
    body: JSON.stringify({
      location: input.location,
      textQuery,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  })
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
    places?: GooglePlace[]
    status?: string
  }

  if (!response.ok) {
    const message = payload.error ? `: ${payload.error}` : "."
    throw new Error(`Google Places search failed with ${response.status}${message}`)
  }

  return payload
}

async function searchGooglePlacesFromBrowser(input: DirectorySearchInput, textQuery: string): Promise<GooglePlacesSearchPayload> {
  const apiKey = googlePlacesApiKey()
  if (!apiKey) return { places: [] as GooglePlace[] }

  const body: Record<string, unknown> = {
    languageCode: "en",
    maxResultCount: 10,
    regionCode: "US",
    textQuery,
  }

  if (input.location) {
    body.locationBias = {
      circle: {
        center: {
          latitude: input.location.latitude,
          longitude: input.location.longitude,
        },
        radius: Math.min(input.location.radiusMeters ?? 15000, 50000),
      },
    }
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.nationalPhoneNumber",
        "places.internationalPhoneNumber",
        "places.websiteUri",
        "places.googleMapsUri",
        "places.location",
        "places.types",
        "places.primaryType",
        "places.businessStatus",
      ].join(","),
    },
    method: "POST",
  })
  const payload = (await response.json().catch(() => ({}))) as {
    error?: {
      message?: string
      status?: string
    }
    places?: GooglePlace[]
  }

  if (!response.ok) {
    const message = payload.error?.message ? `: ${payload.error.message}` : "."
    throw new Error(`Google Places search failed with ${response.status}${message}`)
  }

  return {
    places: payload.places ?? [],
  }
}

function googlePlacesApiKey() {
  const value = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function googlePlacesTextQuery(input: DirectorySearchInput) {
  const query = input.query.trim()
  if (input.mode === "online" || input.mode === "saved") return ""
  if (input.mode === "nearby" && !input.location && !query) return ""

  if (query) {
    if (input.category === "lab") return `${query} medical laboratory`
    if (input.category === "pharmacy") return `${query} pharmacy`
    if (input.category === "facility") return `${query} hospital clinic urgent care`
    if (input.category === "provider") return `${query} doctor`
    return query
  }

  if (input.category === "lab") return "medical laboratory"
  if (input.category === "pharmacy") return "pharmacy"
  if (input.category === "facility") return "hospital clinic urgent care"
  if (input.category === "provider") return "doctor"
  if (input.mode === "nearby") return "health care services"
  return ""
}

function googlePlaceToDirectoryResult(
  place: GooglePlace,
  input: DirectorySearchInput,
  now: Date,
): DirectorySearchResult | null {
  const title = place.displayName?.text
  const id = place.id
  if (!title || !id) return null

  const category = input.category ?? googlePlaceCategory(place)
  const primaryType = place.primaryType ?? place.types?.[0]
  const description = [
    primaryType ? readableDirectoryToken(primaryType) : readableDirectoryToken(category),
    place.businessStatus ? readableDirectoryToken(place.businessStatus) : undefined,
  ]
    .filter(Boolean)
    .join(" - ")

  return {
    addressText: place.formattedAddress,
    availabilityMode: "physical",
    category,
    description,
    id: `google_places_${slugDirectoryId(id)}`,
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
    phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber,
    sourceClaims: [
      {
        confidence: 0.78,
        externalId: id,
        fetchedAt: now.toISOString(),
        note: place.primaryType ?? place.types?.slice(0, 3).join(", "),
        sourceId: "google_places",
        sourceName: "Google Places",
      },
    ],
    title,
    website: place.websiteUri ?? place.googleMapsUri,
  }
}

function googlePlaceCategory(place: GooglePlace): DirectoryCategory {
  const types = new Set(place.types ?? [])
  if (types.has("pharmacy") || types.has("drugstore")) return "pharmacy"
  if (types.has("hospital")) return "facility"
  if (types.has("doctor") || types.has("dentist") || types.has("physiotherapist")) return "provider"
  return "facility"
}

async function searchServiceDirectory(
  workspace: HealthViewWorkspace | null,
  input: DirectorySearchInput,
  limit?: number,
) {
  const [localSearch, nppesSearch, googlePlacesSearch] = await Promise.allSettled([
    Promise.resolve(buildServiceDirectoryResults(workspace, input)),
    searchNppesDirectory(input),
    searchGooglePlacesDirectory(input),
  ])
  const localResults = localSearch.status === "fulfilled" ? localSearch.value : []
  const nppesResults = nppesSearch.status === "fulfilled" ? nppesSearch.value : []
  const googlePlacesResults = googlePlacesSearch.status === "fulfilled" ? googlePlacesSearch.value : []
  const sourceError = [localSearch, nppesSearch, googlePlacesSearch]
    .filter((search): search is PromiseRejectedResult => search.status === "rejected")
    .map((search) => search.reason)
    .find((reason) => reason instanceof Error)
  const items = mergeDirectoryResults([...localResults, ...nppesResults, ...googlePlacesResults]).sort(
    (left, right) => directoryRank(input, right) - directoryRank(input, left),
  )

  return {
    items: typeof limit === "number" ? items.slice(0, limit) : items,
    sourceError: sourceError instanceof Error ? sourceError.message : null,
  }
}

function mergeDirectoryResults(results: DirectorySearchResult[]) {
  const merged = new Map<string, DirectorySearchResult>()

  for (const result of results) {
    const key = directoryMergeKey(result)
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, result)
      continue
    }

    merged.set(key, {
      ...existing,
      ...Object.fromEntries(
        Object.entries(result).filter(([property, value]) => {
          if (property === "sourceClaims") return false
          return value !== undefined && existing[property as keyof DirectorySearchResult] === undefined
        }),
      ),
      saved: existing.saved || result.saved,
      sourceClaims: [...existing.sourceClaims, ...result.sourceClaims],
    })
  }

  return [...merged.values()]
}

function directoryRank(input: DirectorySearchInput, result: DirectorySearchResult) {
  let rank = 0
  if (result.saved) rank += 100
  if (input.mode === "general" && result.npi) rank += 18
  if (result.localRecordId) rank += 16
  if (result.addressText) rank += 4
  if (result.phone) rank += 2
  return rank
}

function directoryMergeKey(result: DirectorySearchResult) {
  if (result.localRecordId) return `local:${result.localRecordId}`
  if (result.npi) return `npi:${result.npi}`
  return `name:${normalizedDirectoryText([result.title, result.addressText].join("|"))}`
}

function localDirectoryClaim(id: string, now: Date): DirectorySourceClaim {
  return {
    confidence: 1,
    externalId: id,
    fetchedAt: now.toISOString(),
    sourceId: "local",
    sourceName: "HealthView saved records",
  }
}

function serviceDirectoryResultSummary(result: DirectorySearchResult) {
  return {
    addressText: result.addressText,
    availabilityMode: result.availabilityMode,
    category: result.category,
    description: result.description,
    id: result.id,
    npi: result.npi,
    organizationName: result.organizationName,
    saved: Boolean(result.saved),
    sourceNames: result.sourceClaims.map((claim) => claim.sourceName),
    specialtyText: result.specialtyText,
    title: result.title,
  }
}

function categoryForOrganizationType(type: HealthViewWorkspace["recordSet"]["organizations"][number]["type"]): DirectoryCategory {
  if (type === "lab") return "lab"
  if (type === "pharmacy") return "pharmacy"
  if (type === "facility" || type === "provider_group") return "facility"
  return "other"
}

function categoryForLocationType(type: HealthViewWorkspace["recordSet"]["locations"][number]["type"]): DirectoryCategory {
  if (type === "lab") return "lab"
  if (type === "pharmacy") return "pharmacy"
  if (type === "clinic" || type === "hospital") return "facility"
  if (type === "virtual") return "digital_service"
  return "other"
}

function availabilityForLocationType(type: HealthViewWorkspace["recordSet"]["locations"][number]["type"]): DirectoryAvailabilityMode {
  if (type === "virtual") return "virtual"
  if (type === "home") return "at_home"
  if (type === "unknown") return "unknown"
  return "physical"
}

function formatAddress(address: HealthViewWorkspace["recordSet"]["locations"][number]["address"]) {
  if (!address) return undefined
  return (
    address.text ||
    [
      ...address.line,
      [address.city, address.state, address.postalCode].filter(Boolean).join(" "),
      address.country,
    ]
      .filter(Boolean)
      .join(", ")
  )
}

function preferredNppesAddress(addresses: NppesAddress[]) {
  return (
    addresses.find((address) => address.address_purpose === "LOCATION") ??
    addresses.find((address) => address.address_purpose === "MAILING") ??
    addresses[0]
  )
}

function formatNppesAddress(address: NppesAddress | undefined) {
  if (!address) return undefined

  return [
    address.address_1,
    address.address_2,
    [address.city, address.state, address.postal_code].filter(Boolean).join(" "),
    address.country_name,
  ]
    .filter(Boolean)
    .join(", ")
}

function readableDirectoryToken(value: string | undefined) {
  if (!value) return ""
  return value.replace(/_/g, " ")
}

function normalizedDirectoryText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim()
}

function isStringValue(value: string | undefined): value is string {
  return Boolean(value)
}

function slugDirectoryId(value: string) {
  return normalizedDirectoryText(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function distanceMeters(left: MapCoordinate, right: MapCoordinate) {
  const earthRadiusMeters = 6371000
  const leftLatitude = (left.latitude * Math.PI) / 180
  const rightLatitude = (right.latitude * Math.PI) / 180
  const deltaLatitude = ((right.latitude - left.latitude) * Math.PI) / 180
  const deltaLongitude = ((right.longitude - left.longitude) * Math.PI) / 180
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(leftLatitude) * Math.cos(rightLatitude) * Math.sin(deltaLongitude / 2) ** 2

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function createEmptyRecordGroups() {
  const groups = {} as Record<RecordCategoryId, RecordsPageRow[]>

  for (const category of recordCategories) {
    groups[category.id] = []
  }

  return groups
}

function activeSubjectPersonIdFor(workspace: HealthViewWorkspace | null) {
  return workspace?.settings.activePersonId ?? workspace?.recordSet.people[0]?.id
}

function isActiveSubjectRecord(subjectPersonId: string | undefined, activePersonId: string | undefined) {
  return !activePersonId || !subjectPersonId || subjectPersonId === activePersonId
}

function buildRecordsByCategory(workspace: HealthViewWorkspace | null): Record<RecordCategoryId, RecordsPageRow[]> {
  const groups = createEmptyRecordGroups()
  if (!workspace) return groups

  const recordSet = workspace.recordSet
  const activePersonId = activeSubjectPersonIdFor(workspace)

  groups.medications.push(
    ...recordSet.medicationUses.filter((medication) => isActiveSubjectRecord(medication.subjectPersonId, activePersonId)).map((medication) => ({
      categoryId: "medications" as const,
      id: medication.id,
      meta: readableToken(medication.status),
      subtitle: [medication.doseText, medication.frequencyText].filter(Boolean).join(" - ") || "Current use",
      title: medication.medication.text,
    })),
    ...recordSet.medicationOrders.filter((order) => isActiveSubjectRecord(order.subjectPersonId, activePersonId)).map((order) => ({
      categoryId: "medications" as const,
      id: order.id,
      meta: readableToken(order.status),
      subtitle: ["Prescription/order", order.doseText, order.frequencyText, formatRecordDate(order.authoredDate)]
        .filter(Boolean)
        .join(" - "),
      title: order.medication.text,
    })),
    ...recordSet.medicationDispenses.filter((dispense) => isActiveSubjectRecord(dispense.subjectPersonId, activePersonId)).map((dispense) => ({
      categoryId: "medications" as const,
      id: dispense.id,
      meta: readableToken(dispense.status),
      subtitle: ["Pharmacy fill", dispense.quantityText, dispense.daysSupplyText, formatRecordDate(dispense.dispenseDate)]
        .filter(Boolean)
        .join(" - "),
      title: dispense.medication.text,
    })),
  )

  groups.history.push(
    ...recordSet.healthHistoryItems.filter((item) => isActiveSubjectRecord(item.subjectPersonId, activePersonId)).map((item) => ({
      categoryId: "history" as const,
      id: item.id,
      meta: readableToken(item.status),
      subtitle: [readableToken(item.section), formatRecordDate(item.date)].filter(Boolean).join(" - "),
      title: item.title,
    })),
    ...recordSet.conditions.filter((condition) => isActiveSubjectRecord(condition.subjectPersonId, activePersonId)).map((condition) => ({
      categoryId: "history" as const,
      id: condition.id,
      meta: readableToken(condition.clinicalStatus),
      subtitle: [readableToken(condition.category), formatRecordDate(condition.onsetDate)].filter(Boolean).join(" - "),
      title: condition.code.text,
    })),
  )

  groups.allergies.push(
    ...recordSet.allergyIntolerances.filter((allergy) => isActiveSubjectRecord(allergy.subjectPersonId, activePersonId)).map((allergy) => ({
      categoryId: "allergies" as const,
      id: allergy.id,
      meta: readableToken(allergy.criticality),
      subtitle: [readableToken(allergy.type), allergy.reactions[0]?.manifestations[0]?.text].filter(Boolean).join(" - "),
      title: allergy.substance.text,
    })),
  )

  groups.visits.push(
    ...recordSet.encounters.filter((encounter) => isActiveSubjectRecord(encounter.subjectPersonId, activePersonId)).map((encounter) => ({
      categoryId: "visits" as const,
      id: encounter.id,
      meta: readableToken(encounter.status),
      subtitle: [encounter.providerText, formatRecordDate(encounter.date)].filter(Boolean).join(" - "),
      title: encounter.title,
    })),
  )

  groups.labs.push(
    ...recordSet.observations
      .filter((observation) => isActiveSubjectRecord(observation.subjectPersonId, activePersonId))
      .filter((observation) => observation.category === "laboratory")
      .map((observation) => ({
        categoryId: "labs" as const,
        id: observation.id,
        meta: readableToken(observation.interpretation ?? observation.status),
        subtitle: [formatObservationValue(observation), formatRecordDate(observation.effectiveDate ?? observation.effectiveDateTime)]
          .filter(Boolean)
          .join(" - "),
        title: observation.code.text,
      })),
  )

  groups.immunizations.push(
    ...recordSet.immunizations.filter((immunization) => isActiveSubjectRecord(immunization.subjectPersonId, activePersonId)).map((immunization) => ({
      categoryId: "immunizations" as const,
      id: immunization.id,
      meta: readableToken(immunization.status),
      subtitle: [formatRecordDate(immunization.occurrenceDate), immunization.performerText].filter(Boolean).join(" - "),
      title: immunization.vaccine.text,
    })),
  )

  groups.diagnostic_reports.push(
    ...recordSet.diagnosticReports
      .filter((report) => isActiveSubjectRecord(report.subjectPersonId, activePersonId))
      .filter((report) => report.category !== "imaging" && report.category !== "pathology")
      .map((report) => ({
        categoryId: "diagnostic_reports" as const,
        id: report.id,
        meta: readableToken(report.status),
        subtitle: [readableToken(report.category), formatRecordDate(report.effectiveDate ?? report.issuedAt)].filter(Boolean).join(" - "),
        title: report.title,
      })),
  )

  groups.imaging.push(
    ...recordSet.diagnosticReports
      .filter((report) => isActiveSubjectRecord(report.subjectPersonId, activePersonId))
      .filter((report) => report.category === "imaging")
      .map((report) => ({
        categoryId: "imaging" as const,
        id: report.id,
        meta: readableToken(report.status),
        subtitle: [report.performerText, formatRecordDate(report.effectiveDate ?? report.issuedAt)].filter(Boolean).join(" - "),
        title: report.title,
      })),
  )

  groups.pathology.push(
    ...recordSet.diagnosticReports
      .filter((report) => isActiveSubjectRecord(report.subjectPersonId, activePersonId))
      .filter((report) => report.category === "pathology")
      .map((report) => ({
        categoryId: "pathology" as const,
        id: report.id,
        meta: readableToken(report.status),
        subtitle: [report.performerText, formatRecordDate(report.effectiveDate ?? report.issuedAt)].filter(Boolean).join(" - "),
        title: report.title,
      })),
  )

  groups.other.push(
    ...recordSet.observations
      .filter((observation) => isActiveSubjectRecord(observation.subjectPersonId, activePersonId))
      .filter((observation) => observation.category !== "laboratory")
      .map((observation) => ({
        categoryId: "other" as const,
        id: observation.id,
        meta: readableToken(observation.status),
        subtitle: [readableToken(observation.category), formatObservationValue(observation)].filter(Boolean).join(" - "),
        title: observation.code.text,
      })),
    ...recordSet.providers.map((provider) => ({
      categoryId: "other" as const,
      id: provider.id,
      meta: provider.active ? "Active" : "Inactive",
      subtitle: [readableToken(provider.providerType), provider.specialty?.text].filter(Boolean).join(" - "),
      title: provider.name,
    })),
    ...recordSet.organizations.map((organization) => ({
      categoryId: "other" as const,
      id: organization.id,
      meta: organization.active ? "Active" : "Inactive",
      subtitle: readableToken(organization.type),
      title: organization.name,
    })),
    ...recordSet.locations.map((location) => ({
      categoryId: "other" as const,
      id: location.id,
      meta: readableToken(location.status),
      subtitle: readableToken(location.type),
      title: location.name,
    })),
    ...recordSet.coverages.filter((coverage) => isActiveSubjectRecord(coverage.subjectPersonId, activePersonId)).map((coverage) => ({
      categoryId: "other" as const,
      id: coverage.id,
      meta: readableToken(coverage.status),
      subtitle: [coverage.payerText, coverage.memberId].filter(Boolean).join(" - "),
      title: coverage.planName ?? coverage.payerText,
    })),
    ...recordSet.claims.filter((claim) => isActiveSubjectRecord(claim.subjectPersonId, activePersonId)).map((claim) => ({
      categoryId: "other" as const,
      id: claim.id,
      meta: readableToken(claim.status),
      subtitle: [readableToken(claim.claimType), formatMoney(claim.amountCents, claim.currency)].filter(Boolean).join(" - "),
      title: claim.title,
    })),
    ...recordSet.bills.filter((bill) => isActiveSubjectRecord(bill.subjectPersonId, activePersonId)).map((bill) => ({
      categoryId: "other" as const,
      id: bill.id,
      meta: readableToken(bill.status),
      subtitle: [formatMoney(bill.amountCents, bill.currency), bill.dueDate ? `due ${formatRecordDate(bill.dueDate)}` : ""]
        .filter(Boolean)
        .join(" - "),
      title: bill.title,
    })),
    ...recordSet.payments.filter((payment) => isActiveSubjectRecord(payment.subjectPersonId, activePersonId)).map((payment) => ({
      categoryId: "other" as const,
      id: payment.id,
      meta: readableToken(payment.status),
      subtitle: [formatMoney(payment.amountCents, payment.currency), formatRecordDate(payment.paidAt)].filter(Boolean).join(" - "),
      title: payment.title,
    })),
    ...recordSet.authorizations.filter((authorization) => isActiveSubjectRecord(authorization.subjectPersonId, activePersonId)).map((authorization) => ({
      categoryId: "other" as const,
      id: authorization.id,
      meta: readableToken(authorization.status),
      subtitle: [authorization.serviceText, formatRecordDate(authorization.requestedDate)].filter(Boolean).join(" - "),
      title: authorization.title,
    })),
  )

  for (const categoryId of Object.keys(groups) as RecordCategoryId[]) {
    groups[categoryId].sort((first, second) => first.title.localeCompare(second.title))
  }

  return groups
}

function createEmptyBillingGroups() {
  const groups = {} as Record<BillingSectionId, BillingPageRow[]>

  for (const section of billingSections) {
    groups[section.id] = []
  }

  return groups
}

function billingDateValue(value: string | undefined) {
  if (!value) return 0

  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`)
  return Number.isNaN(date.valueOf()) ? 0 : date.valueOf()
}

function buildBillingRows(workspace: HealthViewWorkspace | null): Record<BillingSectionId, BillingPageRow[]> {
  const groups = createEmptyBillingGroups()
  if (!workspace) return groups

  const recordSet = workspace.recordSet
  const activePersonId = activeSubjectPersonIdFor(workspace)

  groups.bills = [
    ...recordSet.bills.filter((bill) => isActiveSubjectRecord(bill.subjectPersonId, activePersonId)).map((bill) => {
      const date = bill.dueDate ?? bill.billDate

      return {
        amount: formatMoney(bill.amountCents, bill.currency),
        date: formatRecordDate(date),
        id: bill.id,
        meta: readableToken(bill.status),
        sortValue: billingDateValue(date),
        subtitle: [bill.payeeText, bill.dueDate ? `Due ${formatRecordDate(bill.dueDate)}` : formatRecordDate(bill.billDate)]
          .filter(Boolean)
          .join(" - "),
        title: bill.title,
      }
    }),
    ...recordSet.payments.filter((payment) => isActiveSubjectRecord(payment.subjectPersonId, activePersonId)).map((payment) => ({
      amount: formatMoney(payment.amountCents, payment.currency),
      date: formatRecordDate(payment.paidAt),
      id: payment.id,
      meta: readableToken(payment.status),
      sortValue: billingDateValue(payment.paidAt),
      subtitle: [payment.payerText, payment.payeeText, formatRecordDate(payment.paidAt)].filter(Boolean).join(" - "),
      title: payment.title,
    })),
  ]
    .sort((first, second) => second.sortValue - first.sortValue)
    .map((row) => ({
      amount: row.amount,
      date: row.date,
      id: row.id,
      meta: row.meta,
      subtitle: row.subtitle,
      title: row.title,
    }))

  groups.claims = recordSet.claims
    .filter((claim) => isActiveSubjectRecord(claim.subjectPersonId, activePersonId))
    .map((claim) => ({
      amount: formatMoney(claim.amountCents, claim.currency),
      date: formatRecordDate(claim.serviceDate),
      id: claim.id,
      meta: readableToken(claim.status),
      sortValue: billingDateValue(claim.serviceDate),
      subtitle: [claim.providerText, claim.payerText, formatRecordDate(claim.serviceDate)].filter(Boolean).join(" - "),
      title: claim.title,
    }))
    .sort((first, second) => second.sortValue - first.sortValue)
    .map((row) => ({
      amount: row.amount,
      date: row.date,
      id: row.id,
      meta: row.meta,
      subtitle: row.subtitle,
      title: row.title,
    }))

  groups.authorizations = recordSet.authorizations
    .filter((authorization) => isActiveSubjectRecord(authorization.subjectPersonId, activePersonId))
    .map((authorization) => ({
      amount: authorization.expirationDate ? `Expires ${formatRecordDate(authorization.expirationDate)}` : "",
      date: formatRecordDate(authorization.requestedDate),
      id: authorization.id,
      meta: readableToken(authorization.status),
      sortValue: billingDateValue(authorization.requestedDate),
      subtitle: [authorization.serviceText, authorization.payerText, formatRecordDate(authorization.requestedDate)]
        .filter(Boolean)
        .join(" - "),
      title: authorization.title,
    }))
    .sort((first, second) => second.sortValue - first.sortValue)
    .map((row) => ({
      amount: row.amount,
      date: row.date,
      id: row.id,
      meta: row.meta,
      subtitle: row.subtitle,
      title: row.title,
    }))

  return groups
}

function formatObservationValue(
  observation: HealthViewWorkspace["recordSet"]["observations"][number],
) {
  if (observation.value) {
    if (observation.value.kind === "quantity") return `${observation.value.value} ${observation.value.unit}`
    return String(observation.value.value)
  }

  return observation.components
    .map((component) =>
      component.value.kind === "quantity"
        ? `${component.code.text}: ${component.value.value} ${component.value.unit}`
        : `${component.code.text}: ${String(component.value.value)}`,
    )
    .join(", ")
}

function formatMoney(amountCents: number | undefined, currency = "USD") {
  if (typeof amountCents !== "number") return ""

  return new Intl.NumberFormat("en-US", {
    currency,
    style: "currency",
  }).format(amountCents / 100)
}

function formatRecordDate(value: string | undefined) {
  if (!value) return ""

  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`)
  if (Number.isNaN(date.valueOf())) return value

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

function readableToken(value: string | undefined) {
  if (!value) return ""
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function SemanticBadge({
  children,
  context,
  tone,
  value,
}: {
  children?: ReactNode
  context?: string
  tone?: SemanticTone
  value: string
}) {
  const badgeTone = tone ?? semanticToneForValue(value, context)

  return <Badge variant={semanticBadgeVariantForTone(badgeTone)}>{children ?? value}</Badge>
}

function SemanticValue({
  className,
  context,
  value,
}: {
  className?: string
  context: string
  value: ReactNode
}) {
  if (typeof value === "string" && shouldRenderSemanticValue(value, context)) {
    return <SemanticBadge context={context} value={value} />
  }

  return <span className={className}>{value}</span>
}

function shouldRenderSemanticValue(value: string, context: string) {
  const normalizedContext = context.toLowerCase()

  return (
    semanticToneForValue(value, context) !== "neutral" ||
    ["criticality", "freshness", "interpretation", "severity", "status", "verification"].some((token) =>
      normalizedContext.includes(token),
    )
  )
}

function recordCategoryLabel(categoryId: RecordCategoryId) {
  return recordCategories.find((category) => category.id === categoryId)?.label ?? "Records"
}

function historySectionLabel(sectionId: HistorySectionId | null) {
  return historySections.find((section) => section.id === sectionId)?.label ?? "History"
}

function rowsForHistorySection(
  rowsByCategory: Record<RecordCategoryId, RecordsPageRow[]>,
  workspace: HealthViewWorkspace | null,
  sectionId: HistorySectionId,
) {
  if (!workspace) return []

  const conditionIds = sectionId === "medical" ? new Set(workspace.recordSet.conditions.map((condition) => condition.id)) : new Set<string>()
  const historyIds = new Set(
    workspace.recordSet.healthHistoryItems
      .filter((item) => item.section === sectionId)
      .map((item) => item.id),
  )

  return rowsByCategory.history.filter((row) => historyIds.has(row.id) || conditionIds.has(row.id))
}

function historySectionRows(
  rowsByCategory: Record<RecordCategoryId, RecordsPageRow[]>,
  workspace: HealthViewWorkspace | null,
): RecordsPageRow[] {
  return historySections.map((section) => {
    const rows = rowsForHistorySection(rowsByCategory, workspace, section.id)
    return {
      categoryId: "history",
      id: `history_section_${section.id}`,
      meta: `${rows.length} ${rows.length === 1 ? "record" : "records"}`,
      subtitle: section.description,
      title: section.label,
    }
  })
}

function activePageForLocation(location: HealthViewAppLocation): PageId {
  return location.page
}

function recordsLocationFrom(location: HealthViewAppLocation): RecordsLocationState {
  return location.page === "records" ? location : { page: "records" }
}

function servicesLocationFrom(location: HealthViewAppLocation): ServicesLocationState {
  return location.page === "services" ? location : { page: "services" }
}

function serviceSearchInputFor(input: {
  location?: { latitude: number; longitude: number } | null
  query: string
  tabId?: string | null
}): DirectorySearchInput {
  const tab = serviceDirectoryTabForId(input.tabId)

  return {
    category: tab.category,
    location: input.location
      ? {
          ...input.location,
          radiusMeters: 15000,
        }
      : undefined,
    mode: tab.mode,
    query: input.query,
  }
}

function actionSummary(action: HealthViewUiAction): HealthViewUiActionSummary {
  return {
    description: action.description,
    id: action.id,
    kind: action.kind,
    label: action.label,
    risk: action.risk,
  }
}

function navigationAction(input: {
  description?: string
  id: string
  kind: string
  keywords?: string[]
  label: string
  location: HealthViewAppLocation
  risk?: HealthViewUiActionRisk
}): HealthViewUiAction {
  return {
    command: {
      location: input.location,
      type: "ui/navigate",
    },
    description: input.description,
    id: input.id,
    kind: input.kind,
    keywords: input.keywords ?? [],
    label: input.label,
    risk: input.risk ?? "navigation",
  }
}

function historySectionIdForRecord(workspace: HealthViewWorkspace | null, recordId: string): HistorySectionId | undefined {
  if (!workspace) return undefined

  const historyItem = workspace.recordSet.healthHistoryItems.find((item) => item.id === recordId)
  if (historyItem) return historyItem.section

  if (workspace.recordSet.conditions.some((condition) => condition.id === recordId)) {
    return "medical"
  }

  return undefined
}

function categoryIdForRecord(
  rowsByCategory: Record<RecordCategoryId, RecordsPageRow[]>,
  recordId: string,
) {
  for (const category of recordCategories) {
    if (rowsByCategory[category.id].some((row) => row.id === recordId)) {
      return category.id
    }
  }

  return undefined
}

function recordsLocationForRecord(
  workspace: HealthViewWorkspace | null,
  rowsByCategory: Record<RecordCategoryId, RecordsPageRow[]>,
  recordId: string,
): RecordsLocationState {
  const categoryId = categoryIdForRecord(rowsByCategory, recordId)
  const historySectionId = categoryId === "history" ? historySectionIdForRecord(workspace, recordId) : undefined

  return {
    categoryId,
    historySectionId,
    page: "records",
    pageIndex: 0,
    recordId,
    sourceId: null,
  }
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[_/-]+/g, " ")
    .replace(/[^a-z0-9.\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function scoreAction(action: HealthViewUiAction, query: string) {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return 0

  const haystack = normalizeSearchText(
    [
      action.id,
      action.kind,
      action.label,
      action.description,
      action.keywords.join(" "),
    ]
      .filter(Boolean)
      .join(" "),
  )
  if (!haystack) return 0

  let score = 0
  if (haystack === normalizedQuery) score += 100
  if (haystack.includes(normalizedQuery)) score += 50

  const terms = normalizedQuery.split(" ").filter(Boolean)
  for (const term of terms) {
    if (haystack.includes(term)) {
      score += term.length > 3 ? 12 : 6
    }
  }

  if (normalizeSearchText(action.label) === normalizedQuery) score += 35
  if (normalizeSearchText(action.label).includes(normalizedQuery)) score += 20
  if (action.id.includes(normalizedQuery.replace(/\s+/g, "."))) score += 20

  return score
}

function searchUiActions(actions: HealthViewUiAction[], query: string, limit = 5): HealthViewUiSearchResult[] {
  return actions
    .map((action) => ({
      ...actionSummary(action),
      actionId: action.id,
      score: scoreAction(action, query),
    }))
    .filter((result) => result.score > 0)
    .sort((first, second) => second.score - first.score || first.label.localeCompare(second.label))
    .slice(0, limit)
}

function buildHealthViewUiActions(input: {
  location: HealthViewAppLocation
  workspace: HealthViewWorkspace | null
}): HealthViewUiAction[] {
  const rowsByCategory = buildRecordsByCategory(input.workspace)
  const actions: HealthViewUiAction[] = navItems.map((item) =>
    navigationAction({
      description: `Open the ${item.label} page.`,
      id: `nav.${item.id}`,
      kind: "navigation",
      keywords: [item.id, item.label],
      label: `Open ${item.label}`,
      location: { page: item.id },
    }),
  )

  const servicesLocation = servicesLocationFrom(input.location)
  const activeServiceTab = serviceDirectoryTabForId(servicesLocation.tabId)
  const serviceQuery = servicesLocation.query ?? ""

  for (const tab of serviceDirectoryTabs) {
    actions.push(
      navigationAction({
        description: `Filter Services to ${tab.label.toLowerCase()} directory results.`,
        id: `services.tab.${tab.id}`,
        kind: "services_filter",
        keywords: [
          tab.id,
          tab.label,
          tab.mode,
          tab.category,
          "services",
          "directory",
          "providers",
          "care",
          "filter",
        ].filter(isStringValue),
        label: `Show ${tab.label}`,
        location: {
          page: "services",
          query: serviceQuery,
          selectedResultId: null,
          tabId: tab.id,
        },
      }),
    )
  }

  if (input.location.page === "services") {
    const serviceInput = serviceSearchInputFor({
      query: serviceQuery,
      tabId: activeServiceTab.id,
    })
    const localServiceResults = buildServiceDirectoryResults(input.workspace, serviceInput).slice(0, 10)

    for (const result of localServiceResults) {
      actions.push(
        navigationAction({
          description: [
            readableDirectoryToken(result.category),
            result.description,
            result.specialtyText,
            result.organizationName,
            result.addressText,
          ]
            .filter(Boolean)
            .join(" - "),
          id: `services.result.${result.id}`,
          kind: "service_result",
          keywords: [
            result.id,
            result.title,
            result.description,
            result.specialtyText,
            result.organizationName,
            result.addressText,
            result.category,
            "services",
            "provider",
            "directory",
          ].filter(isStringValue),
          label: `Open ${result.title}`,
          location: {
            page: "services",
            query: serviceQuery,
            selectedResultId: result.id,
            tabId: activeServiceTab.id,
          },
          risk: "read",
        }),
      )
    }

    if (servicesLocation.selectedResultId) {
      actions.push(
        navigationAction({
          description: "Return to Services directory results.",
          id: "services.back",
          kind: "navigation",
          keywords: ["back", "previous", "return", "services results"],
          label: "Back to Services Results",
          location: {
            page: "services",
            query: serviceQuery,
            selectedResultId: null,
            tabId: activeServiceTab.id,
          },
        }),
      )
    }
  }

  for (const category of recordCategories) {
    actions.push(
      navigationAction({
        description: category.description,
        id: `records.category.${category.id}`,
        kind: "records_category",
        keywords: [category.id, category.label, category.description],
        label: `Open ${category.label}`,
        location: {
          categoryId: category.id,
          historySectionId: null,
          page: "records",
          pageIndex: 0,
          recordId: null,
          sourceId: null,
        },
      }),
    )
  }

  for (const section of historySections) {
    actions.push(
      navigationAction({
        description: section.description,
        id: `records.history.${section.id}`,
        kind: "records_history_section",
        keywords: [section.id, section.label, section.description, "history"],
        label: `Open ${section.label} History`,
        location: {
          categoryId: "history",
          historySectionId: section.id,
          page: "records",
          pageIndex: 0,
          recordId: null,
          sourceId: null,
        },
      }),
    )
  }

  for (const category of recordCategories) {
    for (const row of rowsByCategory[category.id]) {
      actions.push(
        navigationAction({
          description: [recordCategoryLabel(category.id), row.subtitle].filter(Boolean).join(" - "),
          id: `records.record.${row.id}`,
          kind: "record",
          keywords: [row.id, row.title, row.subtitle, row.meta, category.id, category.label],
          label: `Open ${row.title}`,
          location: recordsLocationForRecord(input.workspace, rowsByCategory, row.id),
          risk: "read",
        }),
      )
    }
  }

  for (const artifact of input.workspace?.recordSet.artifacts ?? []) {
    actions.push(
      navigationAction({
        description: readableToken(artifact.kind),
        id: `records.source.${artifact.id}`,
        kind: "source",
        keywords: [artifact.id, artifact.title, artifact.kind, artifact.freshness],
        label: `Open source ${artifact.title}`,
        location: {
          page: "records",
          pageIndex: 0,
          sourceId: artifact.id,
        },
        risk: "read",
      }),
    )
  }

  const recordsLocation = recordsLocationFrom(input.location)
  const selectedCategory = recordsLocation.categoryId
    ? recordCategories.find((category) => category.id === recordsLocation.categoryId)
    : null
  const selectedHistorySectionId = isHistorySectionId(recordsLocation.historySectionId)
    ? recordsLocation.historySectionId
    : null
  const selectedRows =
    selectedCategory?.id === "history" && selectedHistorySectionId
      ? rowsForHistorySection(rowsByCategory, input.workspace, selectedHistorySectionId)
      : selectedCategory
        ? rowsByCategory[selectedCategory.id]
        : []
  const pageCount = Math.max(1, Math.ceil(selectedRows.length / recordsPageSize))
  const currentPageIndex = Math.min(recordsLocation.pageIndex ?? 0, pageCount - 1)

  if (input.location.page === "records") {
    if (recordsLocation.sourceId) {
      actions.push(
        navigationAction({
          description: "Return from the current source view.",
          id: "records.back",
          kind: "navigation",
          keywords: ["back", "previous", "return"],
          label: "Back",
          location: {
            ...recordsLocation,
            sourceId: null,
          },
        }),
      )
    } else if (recordsLocation.recordId) {
      actions.push(
        navigationAction({
          description: "Return from the current record detail.",
          id: "records.back",
          kind: "navigation",
          keywords: ["back", "previous", "return"],
          label: "Back",
          location: {
            ...recordsLocation,
            recordId: null,
          },
        }),
      )
    } else if (recordsLocation.historySectionId) {
      actions.push(
        navigationAction({
          description: "Return to the history section list.",
          id: "records.back",
          kind: "navigation",
          keywords: ["back", "previous", "return"],
          label: "Back",
          location: {
            ...recordsLocation,
            historySectionId: null,
            pageIndex: 0,
          },
        }),
      )
    } else if (recordsLocation.categoryId) {
      actions.push(
        navigationAction({
          description: "Return to the records category list.",
          id: "records.back",
          kind: "navigation",
          keywords: ["back", "previous", "return", "records index"],
          label: "Back to Records",
          location: { page: "records" },
        }),
      )
    }

    if (selectedCategory && !recordsLocation.recordId && !recordsLocation.sourceId && currentPageIndex < pageCount - 1) {
      actions.push(
        navigationAction({
          description: "Go to the next page of records.",
          id: "records.nextPage",
          kind: "navigation",
          keywords: ["next", "next page", "more"],
          label: "Next page",
          location: {
            ...recordsLocation,
            pageIndex: currentPageIndex + 1,
          },
        }),
      )
    }

    if (selectedCategory && !recordsLocation.recordId && !recordsLocation.sourceId && currentPageIndex > 0) {
      actions.push(
        navigationAction({
          description: "Go to the previous page of records.",
          id: "records.previousPage",
          kind: "navigation",
          keywords: ["previous", "previous page", "back page"],
          label: "Previous page",
          location: {
            ...recordsLocation,
            pageIndex: currentPageIndex - 1,
          },
        }),
      )
    }
  }

  return actions
}

function visibleHealthViewUiActions(input: {
  location: HealthViewAppLocation
  workspace: HealthViewWorkspace | null
}) {
  const actions = buildHealthViewUiActions(input)
  const recordsLocation = recordsLocationFrom(input.location)
  const serviceActionIds =
    input.location.page === "services"
      ? actions
          .filter((action) => action.id.startsWith("services."))
          .map((action) => action.id)
      : []
  const pageActionIds = new Set([
    ...navItems.map((item) => `nav.${item.id}`),
    ...serviceActionIds,
    ...(input.location.page === "records" && !recordsLocation.categoryId
      ? recordCategories.map((category) => `records.category.${category.id}`)
      : []),
    ...(input.location.page === "records" && recordsLocation.categoryId === "history" && !recordsLocation.historySectionId
      ? historySections.map((section) => `records.history.${section.id}`)
      : []),
    "records.back",
    "records.nextPage",
    "records.previousPage",
  ])

  return actions.filter((action) => pageActionIds.has(action.id)).map(actionSummary)
}

function recordTitleFor(workspace: HealthViewWorkspace | null, recordId: string) {
  return workspace?.recordSet.healthRecords.find((record) => record.id === recordId)?.title ?? readableToken(recordId)
}

function recordKindFor(workspace: HealthViewWorkspace | null, recordId: string) {
  return workspace?.recordSet.healthRecords.find((record) => record.id === recordId)?.kind
}

function recordEvidenceArtifactIds(workspace: HealthViewWorkspace | null, recordIds: Iterable<string>) {
  const idSet = new Set(recordIds)
  return new Set(
    workspace?.recordSet.healthRecords
      .filter((record) => idSet.has(record.id))
      .flatMap((record) => record.evidence.map((evidence) => evidence.artifactId)) ?? [],
  )
}

function sourceArtifactsForRecordIds(workspace: HealthViewWorkspace | null, recordIds: Iterable<string>) {
  if (!workspace) return []

  const recordIdSet = new Set(recordIds)
  const artifactIds = recordEvidenceArtifactIds(workspace, recordIdSet)

  return workspace.recordSet.artifacts.filter(
    (artifact) => artifactIds.has(artifact.id) || recordIdSet.has(artifact.id.replace(/^artifact_/, "")),
  )
}

function recordsForSourceArtifact(workspace: HealthViewWorkspace | null, artifactId: string) {
  if (!workspace) return []

  return workspace.recordSet.healthRecords.filter((record) =>
    record.evidence.some((evidence) => evidence.artifactId === artifactId),
  )
}

function sourceArtifactById(workspace: HealthViewWorkspace | null, artifactId: string) {
  return workspace?.recordSet.artifacts.find((artifact) => artifact.id === artifactId)
}

function addDetailRow(rows: RecordDetailRow[], label: string, value: ReactNode | undefined | null) {
  if (value === undefined || value === null || value === "") return
  rows.push({ label, value })
}

function detailGroup(title: string, rows: RecordDetailRow[]) {
  return rows.length ? [{ title, rows }] : []
}

function baseRecordDetailGroups(workspace: HealthViewWorkspace, recordId: string): RecordDetailGroup[] {
  const record = workspace.recordSet.healthRecords.find((item) => item.id === recordId)
  if (!record) return []

  const rows: RecordDetailRow[] = []
  addDetailRow(rows, "Type", readableToken(record.kind))
  addDetailRow(rows, "Status", readableToken(record.lifecycleStatus))
  addDetailRow(rows, "Effective start", formatRecordDate(record.effectiveStart))
  addDetailRow(rows, "Effective end", formatRecordDate(record.effectiveEnd))
  addDetailRow(rows, "Recorded", formatRecordDate(record.recordedAt))
  addDetailRow(rows, "Updated", formatRecordDate(record.updatedAt))
  addDetailRow(rows, "Evidence links", String(record.evidence.length))

  return detailGroup("Record", rows)
}

function recordDetailGroups(workspace: HealthViewWorkspace | null, recordId: string): RecordDetailGroup[] {
  if (!workspace) return []

  const kind = recordKindFor(workspace, recordId)
  const domainRows: RecordDetailRow[] = []

  if (kind === "person") {
    const person = workspace.recordSet.people.find((item) => item.id === recordId)
    addDetailRow(domainRows, "Name", person?.displayName)
    addDetailRow(domainRows, "Date of birth", formatRecordDate(person?.dateOfBirth))
    addDetailRow(domainRows, "Sex at birth", readableToken(person?.sexAtBirth))
    addDetailRow(domainRows, "Language", person?.preferredLanguage)
    addDetailRow(domainRows, "Address", person?.addressText)
  } else if (kind === "observation") {
    const observation = workspace.recordSet.observations.find((item) => item.id === recordId)
    addDetailRow(domainRows, "Code", observation?.code.text)
    addDetailRow(domainRows, "Category", readableToken(observation?.category))
    addDetailRow(domainRows, "Value", observation ? formatObservationValue(observation) : "")
    addDetailRow(domainRows, "Interpretation", readableToken(observation?.interpretation))
    addDetailRow(domainRows, "Date", formatRecordDate(observation?.effectiveDate ?? observation?.effectiveDateTime))
    addDetailRow(domainRows, "Performer", observation?.performerText ?? observation?.sourceText)
    addDetailRow(domainRows, "Reference range", observation?.referenceRanges.map((range) => range.text).filter(Boolean).join(", "))
  } else if (kind === "condition") {
    const condition = workspace.recordSet.conditions.find((item) => item.id === recordId)
    addDetailRow(domainRows, "Condition", condition?.code.text)
    addDetailRow(domainRows, "Category", readableToken(condition?.category))
    addDetailRow(domainRows, "Clinical status", readableToken(condition?.clinicalStatus))
    addDetailRow(domainRows, "Verification", readableToken(condition?.verificationStatus))
    addDetailRow(domainRows, "Onset", formatRecordDate(condition?.onsetDate))
    addDetailRow(domainRows, "Recorded", formatRecordDate(condition?.recordedDate))
    addDetailRow(domainRows, "Note", condition?.note)
  } else if (kind === "health_history_item") {
    const item = workspace.recordSet.healthHistoryItems.find((historyItem) => historyItem.id === recordId)
    addDetailRow(domainRows, "Section", readableToken(item?.section))
    addDetailRow(domainRows, "Status", readableToken(item?.status))
    addDetailRow(domainRows, "Date", formatRecordDate(item?.date))
    addDetailRow(domainRows, "Relationship", item?.relationshipText)
    addDetailRow(domainRows, "Note", item?.note)
  } else if (kind === "allergy_intolerance") {
    const allergy = workspace.recordSet.allergyIntolerances.find((item) => item.id === recordId)
    addDetailRow(domainRows, "Substance", allergy?.substance.text)
    addDetailRow(domainRows, "Type", readableToken(allergy?.type))
    addDetailRow(domainRows, "Criticality", readableToken(allergy?.criticality))
    addDetailRow(domainRows, "Clinical status", readableToken(allergy?.clinicalStatus))
    addDetailRow(domainRows, "Reaction", allergy?.reactions[0]?.manifestations.map((item) => item.text).join(", "))
    addDetailRow(domainRows, "Severity", readableToken(allergy?.reactions[0]?.severity))
    addDetailRow(domainRows, "Last occurrence", formatRecordDate(allergy?.lastOccurrenceDate))
  } else if (kind === "medication_use" || kind === "medication_order" || kind === "medication_dispense") {
    const use = workspace.recordSet.medicationUses.find((item) => item.id === recordId)
    const order = workspace.recordSet.medicationOrders.find((item) => item.id === recordId)
    const dispense = workspace.recordSet.medicationDispenses.find((item) => item.id === recordId)
    addDetailRow(domainRows, "Medication", use?.medication.text ?? order?.medication.text ?? dispense?.medication.text)
    addDetailRow(domainRows, "Status", readableToken(use?.status ?? order?.status ?? dispense?.status))
    addDetailRow(domainRows, "Dose", use?.doseText ?? order?.doseText)
    addDetailRow(domainRows, "Frequency", use?.frequencyText ?? order?.frequencyText)
    addDetailRow(domainRows, "Prescriber", use?.prescriberText ?? order?.prescriberText ?? dispense?.prescriberText)
    addDetailRow(domainRows, "Pharmacy", dispense?.pharmacyText)
    addDetailRow(domainRows, "Quantity", order?.quantityText ?? dispense?.quantityText)
    addDetailRow(domainRows, "Date", formatRecordDate(use?.startDate ?? order?.authoredDate ?? dispense?.dispenseDate))
    addDetailRow(domainRows, "Note", use?.note ?? order?.note ?? dispense?.note)
  } else if (kind === "encounter") {
    const encounter = workspace.recordSet.encounters.find((item) => item.id === recordId)
    addDetailRow(domainRows, "Visit", encounter?.title)
    addDetailRow(domainRows, "Status", readableToken(encounter?.status))
    addDetailRow(domainRows, "Class", readableToken(encounter?.class))
    addDetailRow(domainRows, "Date", formatRecordDate(encounter?.date))
    addDetailRow(domainRows, "Reason", encounter?.reason?.text)
    addDetailRow(domainRows, "Provider", encounter?.providerText)
    addDetailRow(domainRows, "Organization", encounter?.organizationText)
    addDetailRow(domainRows, "Location", encounter?.locationText)
  } else if (kind === "immunization") {
    const immunization = workspace.recordSet.immunizations.find((item) => item.id === recordId)
    addDetailRow(domainRows, "Vaccine", immunization?.vaccine.text)
    addDetailRow(domainRows, "Status", readableToken(immunization?.status))
    addDetailRow(domainRows, "Date", formatRecordDate(immunization?.occurrenceDate))
    addDetailRow(domainRows, "Lot", immunization?.lotNumber)
    addDetailRow(domainRows, "Performer", immunization?.performerText)
    addDetailRow(domainRows, "Dose", immunization?.doseText)
  } else if (kind === "diagnostic_report") {
    const report = workspace.recordSet.diagnosticReports.find((item) => item.id === recordId)
    addDetailRow(domainRows, "Report", report?.title)
    addDetailRow(domainRows, "Category", readableToken(report?.category))
    addDetailRow(domainRows, "Status", readableToken(report?.status))
    addDetailRow(domainRows, "Date", formatRecordDate(report?.effectiveDate ?? report?.issuedAt))
    addDetailRow(domainRows, "Performer", report?.performerText)
    addDetailRow(domainRows, "Results", report?.resultObservationIds.map((id) => recordTitleFor(workspace, id)).join(", "))
    addDetailRow(domainRows, "Conclusion", report?.conclusionText)
  } else {
    addDetailRow(domainRows, "Title", recordTitleFor(workspace, recordId))
    addDetailRow(domainRows, "Type", readableToken(kind))
  }

  return [...detailGroup("Details", domainRows), ...baseRecordDetailGroups(workspace, recordId)]
}

function sourceDetailGroups(workspace: HealthViewWorkspace | null, artifactId: string): RecordDetailGroup[] {
  if (!workspace) return []

  const artifact = sourceArtifactById(workspace, artifactId)
  if (!artifact) return []

  const origin = workspace.recordSet.origins.find((item) => item.id === artifact.originId)
  const acquisition = workspace.recordSet.acquisitions.find((item) => item.id === artifact.acquisitionEventId)
  const documents = workspace.recordSet.documents.filter((document) => document.artifactId === artifact.id)
  const files = workspace.recordSet.files.filter((file) => artifact.fileIds.includes(file.id))
  const relatedRecords = recordsForSourceArtifact(workspace, artifact.id)
  const sourceRows: RecordDetailRow[] = []
  const acquisitionRows: RecordDetailRow[] = []
  const fileRows: RecordDetailRow[] = []
  const relatedRows: RecordDetailRow[] = []

  addDetailRow(sourceRows, "Title", artifact.title)
  addDetailRow(sourceRows, "Kind", readableToken(artifact.kind))
  addDetailRow(sourceRows, "Freshness", readableToken(artifact.freshness))
  addDetailRow(sourceRows, "Trust", readableToken(artifact.trustLevel))
  addDetailRow(sourceRows, "Observed", formatRecordDate(artifact.observedAt))
  addDetailRow(sourceRows, "Received", formatRecordDate(artifact.receivedAt))
  addDetailRow(sourceRows, "Origin", origin?.name)
  addDetailRow(sourceRows, "Origin type", readableToken(origin?.type))

  addDetailRow(acquisitionRows, "Method", readableToken(acquisition?.method))
  addDetailRow(acquisitionRows, "Acquired", formatRecordDate(acquisition?.acquiredAt))
  addDetailRow(acquisitionRows, "Actor", readableToken(acquisition?.actor))
  addDetailRow(acquisitionRows, "Note", acquisition?.note)

  for (const document of documents) {
    addDetailRow(fileRows, "Document", `${document.title} (${readableToken(document.documentType)})`)
  }

  for (const file of files) {
    addDetailRow(fileRows, "File", `${file.relativePath} (${file.mediaType})`)
  }

  for (const record of relatedRecords) {
    addDetailRow(relatedRows, readableToken(record.kind), record.title)
  }

  return [
    ...detailGroup("Source", sourceRows),
    ...detailGroup("Acquisition", acquisitionRows),
    ...detailGroup("Files", fileRows),
    ...detailGroup("Related records", relatedRows),
  ]
}

function activePersonFor(workspace: HealthViewWorkspace | null) {
  if (!workspace) return undefined

  return (
    workspace.recordSet.people.find((person) => person.id === workspace.settings.activePersonId) ??
    workspace.recordSet.people[0]
  )
}

function demographicDetailGroups(workspace: HealthViewWorkspace | null, personId: string | undefined): RecordDetailGroup[] {
  if (!workspace || !personId) return []

  const person = workspace.recordSet.people.find((item) => item.id === personId)
  if (!person) return []

  const identityRows: RecordDetailRow[] = []
  const contactRows: RecordDetailRow[] = []
  const emergencyRows: RecordDetailRow[] = []
  const accessRows: RecordDetailRow[] = []

  addDetailRow(identityRows, "Name", person.displayName)
  addDetailRow(identityRows, "Date of birth", formatRecordDate(person.dateOfBirth))
  addDetailRow(identityRows, "Sex at birth", readableToken(person.sexAtBirth))
  addDetailRow(identityRows, "Administrative gender", readableToken(person.administrativeGender))
  addDetailRow(identityRows, "Gender identity", person.genderIdentity?.text)
  addDetailRow(identityRows, "Preferred language", person.preferredLanguage)
  addDetailRow(identityRows, "Status", person.active ? "Active" : "Inactive")

  for (const name of person.names) {
    addDetailRow(identityRows, readableToken(name.use ?? "name"), name.text)
  }

  addDetailRow(contactRows, "Address", person.addressText)
  for (const address of person.addresses) {
    addDetailRow(contactRows, readableToken(address.use ?? "address"), address.text ?? formatAddress(address))
  }

  for (const contact of person.contactPoints) {
    addDetailRow(contactRows, readableToken(contact.use ?? contact.system), contact.value)
  }

  for (const contact of person.emergencyContacts) {
    addDetailRow(emergencyRows, contact.name, contact.relationship?.text ?? "Emergency contact")
  }

  for (const relation of person.relatedPersons) {
    const relatedPerson = workspace.recordSet.people.find((item) => item.id === relation.personId)
    addDetailRow(accessRows, readableToken(relation.relationship), relatedPerson?.displayName ?? relation.personId)
  }

  for (const delegate of person.delegatedAccess) {
    const delegatePerson = workspace.recordSet.people.find((item) => item.id === delegate.delegatePersonId)
    addDetailRow(accessRows, readableToken(delegate.scope), `${delegatePerson?.displayName ?? delegate.delegatePersonId} (${readableToken(delegate.status)})`)
  }

  return [
    ...detailGroup("Identity", identityRows),
    ...detailGroup("Contact", contactRows),
    ...detailGroup("Emergency contacts", emergencyRows),
    ...detailGroup("Access", accessRows),
  ]
}

const chatPanelTransitionMs = 300
const minimumActiveVoiceLevel = 0.16

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return ""

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 60) return "Now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function isVoiceStartShortcut(event: KeyboardEvent) {
  return (
    !event.defaultPrevented &&
    !event.isComposing &&
    !event.repeat &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    (event.code === "Space" || event.key === " " || event.key === "Spacebar")
  )
}

function isKeyboardControlTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false

  if (target instanceof HTMLElement && target.isContentEditable) return true

  return target.closest("a,button,input,select,textarea,[contenteditable='true'],[role='combobox'],[role='searchbox'],[role='textbox']") !== null
}

function voiceMessageId(role: HealthViewAgentMessage["role"]) {
  return `voice_${role}_active`
}

function mergeVoiceTranscript(
  previousMessages: HealthViewAgentMessage[],
  update: HealthViewVoiceTranscriptUpdate,
  threadId: string,
) {
  const incomingText = update.mode === "replace" ? update.text.trim() : update.text
  if (!incomingText) return previousMessages

  if (update.role === "user" && !update.final) {
    return previousMessages
  }

  const activeId = voiceMessageId(update.role)
  const activeIndex = previousMessages.findLastIndex((message) => message.id === activeId)
  const existing = activeIndex >= 0 ? previousMessages[activeIndex] : undefined
  const text = update.mode === "append" ? `${existing?.text ?? ""}${incomingText}` : incomingText
  const previousMessage = previousMessages[previousMessages.length - 1]

  if (
    activeIndex < 0 &&
    update.final &&
    previousMessage?.id.startsWith(`voice_${update.role}_`) &&
    previousMessage.role === update.role &&
    previousMessage.text.trim() === text.trim()
  ) {
    return previousMessages
  }

  const message: HealthViewAgentMessage = {
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    id: update.final ? `voice_${update.role}_${Date.now().toString(36)}` : activeId,
    role: update.role,
    text,
    threadId,
  }

  if (activeIndex < 0) {
    return [...previousMessages, message]
  }

  const next = [...previousMessages]
  next[activeIndex] = message
  return next
}

function SettingsSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative inline-flex">
      <select {...props} className={cn(settingsSelectControlClass, props.className)} />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
    </span>
  )
}

function SettingsToggle({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean
  label: string
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        checked ? "border-primary bg-primary" : "border-border bg-muted",
      )}
      role="switch"
      type="button"
      onClick={() => onCheckedChange(!checked)}
    >
      <span
        className={cn(
          "absolute left-1 size-5 rounded-full bg-background shadow-sm transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  )
}

function App() {
  const sidebarCollapsed = useNavigationStore((state) => state.sidebarCollapsed)
  const loadWorkspace = useWorkspaceStore((state) => state.loadWorkspace)
  const workspaceStatus = useWorkspaceStore((state) => state.status)
  const [chatOpen, setChatOpen] = useState(false)

  useDisableBrowserZoomGestures()

  useEffect(() => {
    void loadWorkspace()
  }, [loadWorkspace])

  if (workspaceStatus === "idle" || workspaceStatus === "loading") {
    return <StartupScreen />
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className={cn(
          "flex min-h-screen transition-[padding-left] duration-300 ease-out md:pl-60",
          sidebarCollapsed && "md:pl-16",
        )}
      >
        <DesktopSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="min-w-0 flex-1 overflow-x-hidden px-4 pb-28 pt-5 sm:px-6 md:px-8 md:pb-8 md:pt-8">
            <PageContent />
          </main>
        </div>
      </div>
      <FloatingChatPanel open={chatOpen} onOpenChange={setChatOpen} />
      <MobileTabbar />
    </div>
  )
}

function StartupScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
      <div className="grid w-full max-w-48 justify-items-center gap-6">
        <div className="flex size-24 items-center justify-center rounded-full border border-border bg-card shadow-[0_18px_60px_rgba(15,23,42,0.12)] ring-1 ring-foreground/5">
          <img
            alt=""
            aria-hidden="true"
            className="size-16 object-contain"
            src="/icons/transparent-logo-192x192.png"
          />
        </div>
        <div className="text-center">
          <h1 className="text-base font-semibold leading-none">HealthView OS</h1>
          <p className="mt-2 text-xs font-medium text-muted-foreground">Personal health map</p>
        </div>
        <div
          aria-label="Loading HealthView OS"
          className="healthview-startup-progress"
          role="progressbar"
        />
      </div>
    </div>
  )
}

function useDisableBrowserZoomGestures() {
  useEffect(() => {
    function preventBrowserZoom(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
    }

    function preventGesture(event: Event) {
      event.preventDefault()
    }

    window.addEventListener("wheel", preventBrowserZoom, { passive: false })
    window.addEventListener("gesturestart", preventGesture, { passive: false })
    window.addEventListener("gesturechange", preventGesture, { passive: false })

    return () => {
      window.removeEventListener("wheel", preventBrowserZoom)
      window.removeEventListener("gesturestart", preventGesture)
      window.removeEventListener("gesturechange", preventGesture)
    }
  }, [])
}

function FloatingChatPanel({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const activePage = useNavigationStore((state) => state.activePage)
  const location = useNavigationStore((state) => state.location)
  const navigate = useNavigationStore((state) => state.navigate)
  const workspace = useWorkspaceStore((state) => state.workspace)
  const saveWorkspace = useWorkspaceStore((state) => state.saveWorkspace)
  const [chatView, setChatView] = useState<"conversation" | "threads">("conversation")
  const [messages, setMessages] = useState<HealthViewAgentMessage[]>([])
  const [threads, setThreads] = useState<HealthViewAgentThread[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>()
  const [input, setInput] = useState("")
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [settings, setSettings] = useState<HealthViewAgentSettings>(() => getHealthViewAgentSettings())
  const [voiceSession, setVoiceSession] = useState<HealthViewVoiceSession | null>(null)
  const [voiceLevel, setVoiceLevel] = useState(0)
  const [voiceStatus, setVoiceStatus] = useState<"closed" | "connecting" | "listening" | "speaking">("closed")
  const [panelRendered, setPanelRendered] = useState(open)
  const [panelVisible, setPanelVisible] = useState(open)
  const locationRef = useRef(location)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const voiceStartIdRef = useRef(0)
  const workspaceRef = useRef(workspace)
  const showingThreads = chatView === "threads"
  const panelInteractive = open && panelVisible
  const goToThreads = () => setChatView("threads")
  const goToConversation = () => setChatView("conversation")
  const voiceAvailable = settings.provider === "xai"
  const voiceActive = voiceSession !== null || voiceStatus === "connecting"
  const voiceGlowLevel = voiceActive ? Math.max(minimumActiveVoiceLevel, voiceLevel) : 0
  const chatInputStyle = {
    "--healthview-voice-level": voiceGlowLevel.toFixed(3),
  } as CSSProperties
  const openChat = () => {
    setSettings(getHealthViewAgentSettings())
    setChatView("conversation")
    onOpenChange(true)
  }
  const visibleActions = useMemo(
    () => visibleHealthViewUiActions({ location, workspace }),
    [location, workspace],
  )
  const uiContext = useMemo(
    () => ({
      activePage,
      actions: visibleActions,
      chatOpen: open,
      location,
    }),
    [activePage, location, open, visibleActions],
  )
  useEffect(() => {
    locationRef.current = location
    workspaceRef.current = workspace
  }, [location, workspace])
  const controlClient = useMemo<HealthViewControlClient>(
    () => ({
      async executeCommand(command) {
        if (command.type === "atlas/searchTargets") {
          const results = searchAtlasTargets({
            limit: command.limit,
            query: command.query,
            targetType: command.targetType,
          })

          return {
            message: results.length ? `Found ${results.length} atlas targets.` : "No matching atlas targets found.",
            modelOutput: {
              query: command.query,
              results,
            },
            ok: true,
          }
        }

        if (command.type === "atlas/control") {
          const target = command.targetId ? findAtlasTargetById(command.targetId) : undefined
          if (command.targetId && !target) {
            return {
              error: `Unknown atlas target: ${command.targetId}`,
              ok: false,
            }
          }

          const action = command.action
          const objectIds = command.objectIds ?? target?.objectIds ?? []
          const regionIds = command.regionIds ?? target?.regionIds ?? []
          const systemId = command.systemId ?? target?.systemId ?? null
          const targetLabel = command.targetLabel ?? target?.label ?? systemId
          const targetType = command.targetType ?? target?.targetType ?? (systemId ? "system" : null)

          if (action === "show_system" && !systemId) {
            return {
              error: "Choose an atlas system before showing a system.",
              ok: false,
            }
          }

          if (action === "focus" && !systemId && objectIds.length === 0 && regionIds.length === 0) {
            return {
              error: "Choose a focusable atlas system, organ, object, or SMPL-X region first.",
              ok: false,
            }
          }

          if (target && !target.focusable && objectIds.length === 0 && regionIds.length === 0) {
            return {
              error: `${target.label} is not focusable in the current atlas assets. Search for a more specific target.`,
              ok: false,
            }
          }

          const nextLocation = { page: "health" } satisfies HealthViewAppLocation
          locationRef.current = nextLocation
          navigate(nextLocation)

          const atlasStore = useAtlasViewStore.getState()
          if (action === "reset") {
            atlasStore.reset()
          } else if (action === "orbit") {
            atlasStore.setOrbiting(command.orbiting ?? true)
          } else {
            atlasStore.applyControl({
              action,
              animate: command.animate ?? true,
              objectIds,
              orbiting: command.orbiting,
              regionIds,
              systemId,
              targetLabel,
              targetType,
              zoom: command.zoom ?? (action === "focus" ? "close" : "default"),
            })
          }

          return {
            message:
              action === "reset"
                ? "Reset atlas view."
                : action === "orbit"
                  ? `${command.orbiting === false ? "Stopped" : "Started"} atlas orbit.`
                  : `${action === "show_system" ? "Showing" : "Focusing"} ${targetLabel ?? "atlas target"}.`,
            modelOutput: {
              action,
              location: nextLocation,
              objectIds,
              regionIds,
              systemId,
              target,
              targetLabel,
              targetType,
              zoom: command.zoom ?? (action === "focus" ? "close" : "default"),
            },
            ok: true,
          }
        }

        if (command.type === "services/search") {
          const currentLocation = locationRef.current
          const currentWorkspace = workspaceRef.current
          const currentServicesLocation = servicesLocationFrom(currentLocation)
          const query = command.query ?? currentServicesLocation.query ?? ""
          const tab = command.tabId
            ? serviceDirectoryTabForId(command.tabId)
            : serviceDirectoryTabForQuery(query, currentServicesLocation.tabId)
          const servicesLocation = tab.mode === "nearby" ? await resolveServicesNearbyLocation() : null
          const input = serviceSearchInputFor({
            location: servicesLocation,
            query,
            tabId: tab.id,
          })
          const search = await searchServiceDirectory(currentWorkspace, input, command.limit ?? 8)
          const nextLocation = {
            page: "services",
            query,
            selectedResultId: null,
            tabId: tab.id,
          } satisfies HealthViewAppLocation

          locationRef.current = nextLocation
          navigate(nextLocation)
          return {
            message: search.items.length
              ? `Found ${search.items.length} services.`
              : search.sourceError ?? "No matching services found.",
            modelOutput: {
              location: nextLocation,
              query,
              results: search.items.map(serviceDirectoryResultSummary),
              sourceError: search.sourceError,
              tabId: tab.id,
            },
            ok: true,
          }
        }

        if (command.type === "services/selectResult") {
          const currentLocation = locationRef.current
          const currentWorkspace = workspaceRef.current
          const currentServicesLocation = servicesLocationFrom(currentLocation)
          const tab = serviceDirectoryTabForId(currentServicesLocation.tabId)
          const query = currentServicesLocation.query ?? ""
          const servicesLocation = tab.mode === "nearby" ? await resolveServicesNearbyLocation() : null
          const input = serviceSearchInputFor({
            location: servicesLocation,
            query,
            tabId: tab.id,
          })
          const search = await searchServiceDirectory(currentWorkspace, input, 20)
          const selectedResult = search.items.find((item) => item.id === command.resultId)

          if (!selectedResult) {
            return {
              error: `Unknown Services result: ${command.resultId}`,
              ok: false,
            }
          }

          const nextLocation = {
            page: "services",
            query,
            selectedResultId: selectedResult.id,
            tabId: tab.id,
          } satisfies HealthViewAppLocation

          locationRef.current = nextLocation
          navigate(nextLocation)
          return {
            message: `Opened ${selectedResult.title}.`,
            modelOutput: {
              location: nextLocation,
              result: serviceDirectoryResultSummary(selectedResult),
            },
            ok: true,
          }
        }

        if (command.type === "records/search") {
          const currentWorkspace = workspaceRef.current
          const results = searchWorkspaceRecords(currentWorkspace, command)
          return {
            message: results.length ? `Found ${results.length} matching records.` : "No matching records found.",
            modelOutput: {
              query: command.query ?? "",
              results,
            },
            ok: true,
          }
        }

        if (command.type === "records/get") {
          const currentWorkspace = workspaceRef.current
          const record = getWorkspaceRecordSummary(currentWorkspace, command.recordId)
          if (!record) {
            return { error: `Record not found: ${command.recordId}`, ok: false }
          }

          return {
            message: `Loaded ${record.title}.`,
            modelOutput: { record },
            ok: true,
          }
        }

        if (command.type === "records/create") {
          const currentWorkspace = workspaceRef.current
          if (!currentWorkspace) {
            return { error: "Workspace is not loaded.", ok: false }
          }

          const existingIds = new Set(currentWorkspace.recordSet.healthRecords.map((record) => record.id))
          const nextWorkspace = createManualRecordFromFieldsInWorkspace(currentWorkspace, command)
          const savedWorkspace = await saveWorkspace(nextWorkspace)
          workspaceRef.current = savedWorkspace
          const createdRecord = savedWorkspace.recordSet.healthRecords.find((record) => !existingIds.has(record.id))
          const record = createdRecord ? getWorkspaceRecordSummary(savedWorkspace, createdRecord.id) : null
          if (record?.categoryId) {
            const nextLocation = {
              categoryId: record.categoryId,
              page: "records",
              recordId: record.id,
            } satisfies HealthViewAppLocation
            locationRef.current = nextLocation
            navigate(nextLocation)
          }

          return {
            message: record ? `Created ${record.title}.` : "Created record.",
            modelOutput: { record },
            ok: true,
          }
        }

        if (command.type === "records/update") {
          const currentWorkspace = workspaceRef.current
          if (!currentWorkspace) {
            return { error: "Workspace is not loaded.", ok: false }
          }

          const nextWorkspace = updateManualRecordFieldsInWorkspace(currentWorkspace, command)
          const savedWorkspace = await saveWorkspace(nextWorkspace)
          workspaceRef.current = savedWorkspace
          const record = getWorkspaceRecordSummary(savedWorkspace, command.recordId)
          if (record?.categoryId) {
            const nextLocation = {
              categoryId: record.categoryId,
              page: "records",
              recordId: record.id,
            } satisfies HealthViewAppLocation
            locationRef.current = nextLocation
            navigate(nextLocation)
          }

          return {
            message: record ? `Updated ${record.title}.` : "Updated record.",
            modelOutput: { record },
            ok: true,
          }
        }

        if (command.type === "ui/openPage") {
          const nextLocation = { page: command.pageId } satisfies HealthViewAppLocation
          locationRef.current = nextLocation
          navigate(nextLocation)
          return {
            message: `Opened ${command.pageId}.`,
            modelOutput: { location: nextLocation },
            ok: true,
          }
        }

        if (command.type === "ui/navigate") {
          locationRef.current = command.location
          navigate(command.location)
          return {
            message: `Opened ${activePageForLocation(command.location)}.`,
            modelOutput: { location: command.location },
            ok: true,
          }
        }

        if (command.type === "ui/search") {
          const currentLocation = locationRef.current
          const currentWorkspace = workspaceRef.current
          const results = searchUiActions(
            buildHealthViewUiActions({ location: currentLocation, workspace: currentWorkspace }),
            command.query,
            command.limit,
          )
          return {
            message: results.length ? `Found ${results.length} matching actions.` : "No matching actions found.",
            modelOutput: { query: command.query, results },
            ok: true,
          }
        }

        if (command.type === "ui/runAction") {
          const currentLocation = locationRef.current
          const currentWorkspace = workspaceRef.current
          const action = buildHealthViewUiActions({ location: currentLocation, workspace: currentWorkspace }).find((item) => item.id === command.actionId)
          if (!action) {
            return { error: `Unknown UI action: ${command.actionId}`, ok: false }
          }

          locationRef.current = action.command.location
          navigate(action.command.location)
          return {
            message: action.label,
            modelOutput: {
              action: actionSummary(action),
              location: action.command.location,
            },
            ok: true,
          }
        }

        if (command.open) {
          setSettings(getHealthViewAgentSettings())
        }
        onOpenChange(command.open)
        return { message: command.open ? "Opened chat." : "Closed chat.", ok: true }
      },
    }),
    [navigate, onOpenChange, saveWorkspace],
  )

  useEffect(() => {
    let cancelled = false

    async function loadChat() {
      const client = await createHealthViewAgentClient({ controlClient })
      const thread = await client.getOrCreateActiveThread()
      const [nextMessages, nextThreads] = await Promise.all([
        client.listMessages(thread.id),
        listHealthViewAgentThreads(),
      ])

      if (!cancelled) {
        setActiveThreadId(thread.id)
        setMessages(nextMessages)
        setThreads(nextThreads)
      }
    }

    void loadChat()

    return () => {
      cancelled = true
    }
  }, [controlClient])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" })
  }, [messages, status, error, showingThreads])

  useEffect(() => {
    function refreshAgentSettings() {
      setSettings(getHealthViewAgentSettings())
    }

    window.addEventListener("healthviewos:agent-settings-updated", refreshAgentSettings)
    return () => window.removeEventListener("healthviewos:agent-settings-updated", refreshAgentSettings)
  }, [])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing || event.key !== "Escape") return

      event.preventDefault()
      onOpenChange(false)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onOpenChange, open])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: globalThis.PointerEvent) {
      if (event.button !== 0) return
      const target = event.target
      if (!(target instanceof Node) || panelRef.current?.contains(target)) return

      onOpenChange(false)
    }

    window.addEventListener("pointerdown", handlePointerDown)
    return () => window.removeEventListener("pointerdown", handlePointerDown)
  }, [onOpenChange, open])

  useEffect(() => {
    let animationFrame = 0
    let revealFrame = 0
    let closeTimer: ReturnType<typeof setTimeout> | undefined

    animationFrame = window.requestAnimationFrame(() => {
      if (open) {
        setPanelRendered(true)
        revealFrame = window.requestAnimationFrame(() => setPanelVisible(true))
      } else {
        setPanelVisible(false)
        closeTimer = setTimeout(() => setPanelRendered(false), chatPanelTransitionMs)
      }
    })

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.cancelAnimationFrame(revealFrame)
      if (closeTimer) {
        clearTimeout(closeTimer)
      }
    }
  }, [open])

  const refreshThreads = useCallback(async () => {
    setThreads(await listHealthViewAgentThreads())
  }, [])

  async function loadThread(threadId: string) {
    const client = await createHealthViewAgentClient({ controlClient })
    setActiveThreadId(threadId)
    setMessages(await client.listMessages(threadId))
    await refreshThreads()
    goToConversation()
  }

  async function handleNewThread() {
    const thread = await createNewHealthViewAgentThread()
    setActiveThreadId(thread.id)
    setMessages([])
    await refreshThreads()
    goToConversation()
  }

  async function sendCurrentMessage() {
    const text = input.trim()
    if (!text || running) return

    setError(null)
    setStatus(null)
    setRunning(true)
    setInput("")

    try {
      const client = await createHealthViewAgentClient({ controlClient })
	      for await (const agentEvent of client.run({
	        text,
	        threadId: activeThreadId,
	        uiContext,
	      })) {
        if ("type" in agentEvent) {
          if (agentEvent.type === "thread") {
            setActiveThreadId(agentEvent.thread.id)
          } else if (agentEvent.type === "user_message" || agentEvent.type === "assistant_message") {
            setMessages((current) => [...current, agentEvent.message])
          } else if (agentEvent.type === "status") {
            setStatus(agentEvent.message)
          } else if (agentEvent.type === "error") {
            setError(agentEvent.message)
          }
        }
      }
      setStatus(null)
      await refreshThreads()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to run the HealthView assistant.")
    } finally {
      setRunning(false)
    }
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await sendCurrentMessage()
  }

  const stopVoiceChat = useCallback(() => {
    voiceStartIdRef.current += 1

    if (voiceSession) {
      voiceSession.stop()
    }

    setVoiceSession(null)
    setVoiceLevel(0)
    setVoiceStatus("closed")
  }, [voiceSession])

  const startVoiceChat = useCallback(async () => {
    if (voiceActive) return

    const nextSettings = getHealthViewAgentSettings()
    const startId = voiceStartIdRef.current + 1
    voiceStartIdRef.current = startId

    setSettings(nextSettings)
    setChatView("conversation")
    onOpenChange(true)

    if (nextSettings.provider !== "xai") {
      setError("Select xAI in Settings before starting voice chat.")
      return
    }

    setError(null)
    setStatus(null)
    setVoiceStatus("connecting")

    try {
      const client = await createHealthViewAgentClient({ controlClient })
      const thread = activeThreadId ? { id: activeThreadId } : await client.getOrCreateActiveThread()
      setActiveThreadId(thread.id)
      const session = await startXaiVoiceSession({
        controlClient,
        onError(nextError) {
          setError(nextError.message)
        },
        onInputLevel(update) {
          setVoiceLevel(update.level)
        },
        onStatus(nextStatus) {
          setVoiceStatus(nextStatus)
          if (nextStatus === "closed") {
            setVoiceSession(null)
            setVoiceLevel(0)
          }
        },
        onTranscript(update) {
          setMessages((current) => mergeVoiceTranscript(current, update, thread.id))
        },
        healthContextReader: createBrowserHealthContextReader(),
        healthDataAccessEnabled: nextSettings.healthDataAccessEnabled,
        uiContext: { ...uiContext, chatOpen: true },
      })

      if (voiceStartIdRef.current !== startId) {
        session.stop()
        return
      }

      setVoiceSession(session)
      await refreshThreads()
    } catch (caughtError) {
      if (voiceStartIdRef.current !== startId) return

      setVoiceStatus("closed")
      setVoiceSession(null)
      setVoiceLevel(0)
      setError(caughtError instanceof Error ? caughtError.message : "Unable to start xAI voice chat.")
    }
  }, [activeThreadId, controlClient, onOpenChange, refreshThreads, uiContext, voiceActive])

  const handleVoiceToggle = useCallback(async () => {
    if (voiceActive) {
      stopVoiceChat()
      return
    }

    await startVoiceChat()
  }, [startVoiceChat, stopVoiceChat, voiceActive])

  useLayoutEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isVoiceStartShortcut(event) || isKeyboardControlTarget(event.target)) return

      event.preventDefault()
      event.stopImmediatePropagation()

      if (!voiceActive) {
        void startVoiceChat()
      }
    }

    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [startVoiceChat, voiceActive])

  return (
    <>
      {!open && !panelRendered ? (
        <button
          aria-controls="healthview-chat-panel"
          aria-expanded="false"
          aria-label="Open chat"
          className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] right-4 z-40 flex size-14 items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/70 bg-card/75 text-foreground shadow-[0_18px_50px_rgba(15,23,42,0.16)] ring-1 ring-foreground/5 backdrop-blur-xl transition-[background,box-shadow,transform] duration-200 hover:bg-card/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-white/10 dark:bg-card/70 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)] md:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] md:right-6"
          title="Open chat"
          type="button"
          onClick={openChat}
        >
          <MessageCircle className="size-6" aria-hidden="true" strokeWidth={2.1} />
          <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-[color:var(--health-attention)] ring-2 ring-card" />
        </button>
      ) : null}

      {panelRendered ? (
        <aside
          aria-label="HealthView chat"
          className={cn(
            "fixed right-4 z-40 origin-bottom-right overflow-hidden rounded-[1.75rem] border border-white/70 text-foreground shadow-[0_24px_70px_rgba(15,23,42,0.16)] ring-1 ring-white/30 backdrop-blur-2xl backdrop-saturate-150 transition-[bottom,width,height,max-width,opacity,transform,background,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-white/12 dark:bg-card/24 dark:shadow-[0_18px_50px_rgba(0,0,0,0.32)] dark:ring-white/10 md:right-6",
            panelVisible
              ? "bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] h-[calc(100dvh-6rem-env(safe-area-inset-bottom,0px))] w-[calc(100vw-2rem)] max-w-[25rem] scale-100 bg-card/22 opacity-100 shadow-[0_24px_70px_rgba(15,23,42,0.16)] md:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] md:h-[calc(100dvh-3rem-env(safe-area-inset-bottom,0px))] md:w-[24rem]"
              : "pointer-events-none bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] size-14 max-w-[3.5rem] scale-95 bg-card/75 opacity-0 shadow-[0_18px_50px_rgba(15,23,42,0.16)] md:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]",
          )}
          ref={panelRef}
        >
      <div
        aria-hidden={!panelInteractive}
        className={cn(
          "flex h-full min-h-0 flex-col transition-[opacity,transform] duration-200",
          panelVisible ? "translate-y-0 opacity-100 delay-75" : "translate-y-3 opacity-0",
        )}
        id="healthview-chat-panel"
      >
        <header className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              aria-label="Show chat threads"
              aria-pressed={showingThreads}
              className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground transition-colors hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              onClick={goToThreads}
              tabIndex={open ? undefined : -1}
              title="Show chat threads"
              type="button"
            >
              <List className="size-5" aria-hidden="true" strokeWidth={2.1} />
            </button>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">{showingThreads ? "Chat threads" : "HealthView Chat"}</h2>
              <p className="truncate text-xs text-muted-foreground">
                {showingThreads
                  ? "Recent conversations"
                  : voiceActive
                    ? `xAI voice ${voiceStatus}`
                    : `${settings.provider === "openai" ? "OpenAI" : "xAI"} · ${settings.model}`}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              aria-label="New chat"
              className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground transition-colors hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              onClick={() => void handleNewThread()}
              tabIndex={open ? undefined : -1}
              title="New chat"
              type="button"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
            <button
              aria-label="Close chat"
              className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground transition-colors hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              onClick={() => onOpenChange(false)}
              tabIndex={open ? undefined : -1}
              title="Close chat"
              type="button"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <Separator />

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 pt-5">
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <section
              aria-hidden={showingThreads}
              className={cn(
                "absolute inset-0 flex min-h-0 flex-col gap-3 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                showingThreads ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100",
              )}
              style={{
                transform: showingThreads ? "translate3d(100%, 0, 0)" : "translate3d(0, 0, 0)",
              }}
            >
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="flex min-h-full flex-col justify-end gap-3 px-1">
                  {messages.length === 0 ? (
                    <div className="max-w-[88%] rounded-2xl bg-secondary px-3.5 py-2.5 text-sm leading-6 text-secondary-foreground">
                      Ask about your health map, warning signs, records, or care next steps.
                    </div>
                  ) : null}
                  {messages.map((message) => (
                    <div
                      className={cn(
                        "max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6",
                        message.role === "user"
                          ? "ml-auto bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground",
                      )}
                      key={message.id}
                    >
                      {message.text}
                    </div>
                  ))}
                  {status ? (
                    <div className="max-w-[88%] rounded-2xl bg-secondary/70 px-3.5 py-2.5 text-xs leading-5 text-muted-foreground">
                      {status}
                    </div>
                  ) : null}
                  {error ? (
                    <div className="max-w-[88%] rounded-2xl bg-destructive/10 px-3.5 py-2.5 text-sm leading-6 text-destructive">
                      {error}
                    </div>
                  ) : null}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div
                className={cn("healthview-chat-composer", voiceActive && "healthview-chat-composer--voice")}
                data-voice-status={voiceStatus}
                style={chatInputStyle}
              >
                <form
                  className={cn(
                    "healthview-chat-input-shell flex items-center gap-1 rounded-full border border-foreground/12 bg-background/44 py-1 pl-3 pr-1 shadow-sm ring-1 ring-white/45 backdrop-blur-md dark:border-white/15 dark:bg-background/30 dark:ring-white/10",
                    voiceActive && "healthview-chat-input-shell--voice",
                  )}
                  onSubmit={(event) => void handleSend(event)}
                >
                  <input
                    aria-label="Message HealthView"
                    className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
                    disabled={running}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Message HealthView"
                    tabIndex={showingThreads ? -1 : undefined}
                    type="text"
                    value={input}
                  />
                  <Button
                    aria-label={voiceActive ? "Stop xAI voice" : "Start xAI voice"}
                    className={cn(
                      "size-9 rounded-full",
                      voiceActive && "bg-[color:var(--health-attention)] text-white hover:bg-[color:var(--health-attention)]/90",
                    )}
                    disabled={!voiceAvailable && !voiceActive}
                    onClick={() => void handleVoiceToggle()}
                    size="icon"
                    tabIndex={showingThreads ? -1 : undefined}
                    title={voiceAvailable ? "xAI voice" : "Select xAI in Settings for voice"}
                    type="button"
                    variant={voiceActive ? "default" : "ghost"}
                  >
                    {voiceStatus === "connecting" ? (
                      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                    ) : voiceActive ? (
                      <MicOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Mic className="size-4" aria-hidden="true" />
                    )}
                  </Button>
                  <Button
                    aria-label="Send message"
                    className="size-9 rounded-full"
                    disabled={!input.trim() || running}
                    size="icon"
                    tabIndex={showingThreads ? -1 : undefined}
                    onClick={() => void sendCurrentMessage()}
                    type="button"
                  >
                    {running ? (
                      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Send className="size-4" aria-hidden="true" />
                    )}
                  </Button>
                </form>
              </div>
            </section>

            <section
              aria-hidden={!showingThreads}
              className={cn(
                "absolute inset-0 flex min-h-0 flex-col gap-2 overflow-y-auto px-1 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                showingThreads ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
              )}
              style={{
                transform: showingThreads ? "translate3d(0, 0, 0)" : "translate3d(-100%, 0, 0)",
              }}
            >
              {threads.map((thread) => (
                <button
                  className="flex items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  key={thread.id}
                  onClick={() => void loadThread(thread.id)}
                  tabIndex={showingThreads ? undefined : -1}
                  type="button"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                    <MessageCircle className="size-4" aria-hidden="true" strokeWidth={2.1} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{thread.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {thread.id === activeThreadId ? "Active conversation" : "Saved locally"}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(thread.updatedAt)}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              ))}
            </section>
          </div>
        </div>
      </div>
        </aside>
      ) : null}
    </>
  )
}

function DesktopSidebar() {
  const collapsed = useNavigationStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useNavigationStore((state) => state.toggleSidebar)
  const saveWorkspace = useWorkspaceStore((state) => state.saveWorkspace)
  const workspace = useWorkspaceStore((state) => state.workspace)
  const activePerson = activePersonFor(workspace)
  const toggleLabel = collapsed ? "Expand sidebar" : "Collapse sidebar"

  async function selectActivePerson(personId: string) {
    if (!workspace || workspace.settings.activePersonId === personId) return

    await saveWorkspace({
      ...workspace,
      settings: {
        ...workspace.settings,
        activePersonId: personId,
        updatedAt: new Date().toISOString(),
      },
    })
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden h-dvh shrink-0 overflow-hidden border-r bg-sidebar px-3 py-5 text-sidebar-foreground transition-[width] duration-300 ease-out md:flex md:flex-col",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className="flex items-center">
        <Brand collapsed={collapsed} iconLabel={toggleLabel} onIconClick={toggleSidebar} />
      </div>
      <nav aria-label="Primary" className="mt-8 flex flex-col gap-1">
        <NavButtons collapsed={collapsed} />
      </nav>
      <label
        className="relative mt-auto flex h-10 w-full items-center rounded-xl px-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        title={collapsed ? `Active person: ${activePerson?.displayName ?? "No active person"}` : undefined}
      >
        <UserRound className="size-5 shrink-0" aria-hidden="true" />
        <div
          aria-hidden={collapsed}
          className={cn(
            "min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-200 ease-out",
            collapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100 delay-75",
            !collapsed && "ml-3",
          )}
        >
          <p className="truncate text-sm font-medium">{activePerson?.displayName ?? "No active person"}</p>
          <p className="truncate text-xs text-muted-foreground">Active person</p>
        </div>
        <select
          aria-label="Active person"
          className={cn(
            "absolute h-10 cursor-pointer rounded-xl bg-transparent text-transparent outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            collapsed ? "left-3 w-10" : "left-3 right-3",
          )}
          disabled={!workspace?.recordSet.people.length}
          value={activePerson?.id ?? ""}
          onChange={(event) => void selectActivePerson(event.currentTarget.value)}
        >
          {workspace?.recordSet.people.length ? (
            workspace.recordSet.people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.displayName}
              </option>
            ))
          ) : (
            <option value="">No people</option>
          )}
        </select>
      </label>
    </aside>
  )
}

function Brand({
  collapsed = false,
  iconLabel,
  onIconClick,
}: {
  collapsed?: boolean
  iconLabel?: string
  onIconClick?: () => void
}) {
  const IconShell = onIconClick ? "button" : "div"

  return (
    <div className="flex w-full items-center" title={collapsed ? "HealthView OS" : undefined}>
      <IconShell
        aria-label={iconLabel}
        className={cn(
          "flex size-10 items-center justify-center rounded-xl border border-border bg-background shadow-sm transition-colors",
          onIconClick && "hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
        onClick={onIconClick}
        title={iconLabel}
        type={onIconClick ? "button" : undefined}
      >
        <img className="size-7 object-contain" src="/icons/transparent-logo-192x192.png" alt="" aria-hidden="true" />
      </IconShell>
      <div
        aria-hidden={collapsed}
        className={cn(
          "min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-200 ease-out",
          collapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100 delay-75",
          !collapsed && "ml-3",
        )}
      >
        <p className="truncate text-sm font-semibold">HealthView OS</p>
        <p className="truncate text-xs text-muted-foreground">Personal health map</p>
      </div>
    </div>
  )
}

function NavButtons({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const activePage = useNavigationStore((state) => state.activePage)
  const setActivePage = useNavigationStore((state) => state.setActivePage)

  return navItems.map(({ id, label, icon: Icon }) => {
    const active = activePage === id

    return (
      <button
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? label : undefined}
        className={cn(
          "flex h-10 w-full items-center rounded-xl px-2.5 text-left text-sm font-medium transition-colors",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
        key={id}
        onClick={() => {
          setActivePage(id)
          onNavigate?.()
        }}
        title={collapsed ? label : undefined}
        type="button"
      >
        <Icon className="size-5 shrink-0" aria-hidden="true" />
        <span
          aria-hidden={collapsed}
          className={cn(
            "overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-200 ease-out",
            collapsed ? "max-w-0 opacity-0" : "max-w-32 opacity-100 delay-75",
            !collapsed && "ml-3",
          )}
        >
          {label}
        </span>
      </button>
    )
  })
}

function MobileTabbar() {
  const activePage = useNavigationStore((state) => state.activePage)
  const setActivePage = useNavigationStore((state) => state.setActivePage)

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:hidden"
    >
      <div className="flex w-full max-w-xl items-center gap-1 rounded-full border bg-background/80 p-1 shadow-lg backdrop-blur-xl">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = activePage === id

          return (
            <button
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full font-medium transition-colors",
                active ? "bg-secondary text-foreground" : "text-muted-foreground",
              )}
              key={id}
              onClick={() => setActivePage(id)}
              type="button"
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span className="truncate text-[10px] leading-none">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function PageContent() {
  const activePage = useNavigationStore((state) => state.activePage)
  const error = useWorkspaceStore((state) => state.error)
  const loadWorkspace = useWorkspaceStore((state) => state.loadWorkspace)
  const status = useWorkspaceStore((state) => state.status)

  if (status === "idle" || status === "loading") {
    return <StartupScreen />
  }

  if (status === "error") {
    return (
      <WorkspaceStateCard
        action={
          <Button variant="outline" onClick={() => void loadWorkspace()}>
            Retry
          </Button>
        }
        description={error ?? "The browser-local workspace could not be opened."}
        title="Workspace unavailable"
      />
    )
  }

  return (
    <div key={activePage} className="healthview-page-transition">
      {activePage === "health" ? (
        <HealthPage />
      ) : activePage === "services" ? (
        <ServicesPage />
      ) : activePage === "records" ? (
        <RecordsPage />
      ) : activePage === "billing" ? (
        <BillingPage />
      ) : activePage === "settings" ? (
        <SettingsPage />
      ) : (
        <MockPage page={activePage} />
      )}
    </div>
  )
}

function WorkspaceStateCard({
  action,
  description,
  title,
}: {
  action?: ReactNode
  description: string
  title: string
}) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-7">
      <PageHeader title={title} description={description} action={action} />
      <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
        <CardContent className="flex items-center gap-3 py-6">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            <AlertCircle className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">Browser-local workspace</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Health data remains local to this browser origin.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function HealthPage() {
  const [selectedClaim, setSelectedClaim] = useState<EvidenceBackedClaim | null>(null)
  const atlasControl = useAtlasViewStore((state) => state.control)
  const selectedHealthSignalId = useAtlasViewStore((state) => state.selectedHealthSignalId)
  const selectHealthSignal = useAtlasViewStore((state) => state.selectHealthSignal)
  const workspace = useWorkspaceStore((state) => state.workspace)
  const systemRows = selectSystemRows(workspace)
  const selectedAtlasBodySystem = atlasControl.systemId ? atlasSystemToHealthBodySystem[atlasControl.systemId] : null
  const selectedSystem =
    systemRows.find((row) => row.id === selectedHealthSignalId) ??
    systemRows.find((row) => selectedAtlasBodySystem && row.bodySystem === selectedAtlasBodySystem) ??
    null
  const activePerson =
    workspace?.recordSet.people.find((person) => person.id === workspace.settings.activePersonId) ??
    workspace?.recordSet.people[0]
  const systemStatus = selectSystemStatus(workspace)
  const systemStatusRows = selectSystemStatusRows(workspace)
  const readiness = selectSystemReadiness(workspace)
  const upcomingCare = selectUpcomingCare(workspace)
  const vitals = selectVitals(workspace)
  const warningSigns = selectWarningSigns(workspace)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-7">
      <PageHeader
        title="Health"
        description="A visual operating layer for your current state, trends, warning signs, and care context."
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <HealthMapCard
          activePerson={activePerson}
          atlasControl={atlasControl}
          rows={systemRows}
          selectedSystemId={selectedSystem?.id ?? null}
          onSelectSystem={selectHealthSignal}
        />
        <SystemStatusCard
          readiness={readiness}
          rows={systemStatusRows}
          selectedSystem={selectedSystem}
          statusClaim={systemStatus}
          onOpenEvidence={setSelectedClaim}
        />
      </section>

      <section
        aria-label="Vitals"
        className="-mx-4 -my-8 flex gap-4 overflow-x-auto overscroll-x-contain px-4 py-8 scroll-smooth [scrollbar-width:none] sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {vitals.map((vital) => (
          <div className="w-[17rem] shrink-0 sm:w-[18rem]" key={vital.id}>
            <VitalCard vital={vital} onOpenEvidence={setSelectedClaim} />
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <WarningSigns items={warningSigns} onOpenEvidence={setSelectedClaim} />
        <UpcomingCare items={upcomingCare} />
      </section>

      <EvidenceDialog
        claim={selectedClaim}
        open={Boolean(selectedClaim)}
        onOpenChange={(open) => {
          if (!open) setSelectedClaim(null)
        }}
      />
    </div>
  )
}

function PageHeader({
  title,
  description,
  action,
  leading,
}: {
  title: string
  description: string
  action?: ReactNode
  leading?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {leading ? <div className="shrink-0 pt-1">{leading}</div> : null}
        <div className="min-w-0">
          <h1 className="text-4xl font-semibold leading-none sm:text-5xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

function EvidenceButton({
  claim,
  label = "Evidence",
  onOpenEvidence,
}: {
  claim: EvidenceBackedClaim
  label?: string
  onOpenEvidence: (claim: EvidenceBackedClaim) => void
}) {
  return (
    <Button variant="ghost" size="sm" onClick={() => onOpenEvidence(claim)}>
      {label}
    </Button>
  )
}

function HealthMapCard({
  activePerson,
  atlasControl,
  onSelectSystem,
  rows,
  selectedSystemId,
}: {
  activePerson?: Person
  atlasControl: HealthViewAtlasViewControl
  onSelectSystem: (systemId: string | null) => void
  rows: HealthMapSignal[]
  selectedSystemId: string | null
}) {
  const selectedSignal = rows.find((row) => row.id === selectedSystemId) ?? null

  return (
    <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
      <CardContent className="space-y-5">
        <div className="relative h-[21rem] overflow-hidden rounded-2xl border bg-white sm:h-[27rem]">
          <Suspense
            fallback={
              <div className="healthview-openhuman-scene healthview-openhuman-scene--fallback" role="status" aria-label="Loading 3D body map">
                <span className="healthview-openhuman-scene__spinner" />
              </div>
            }
          >
            <OpenHumanBodyScene activePerson={activePerson} atlasControl={atlasControl} selectedSignal={selectedSignal} />
          </Suspense>
        </div>
        <div className="overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mx-auto flex w-max gap-1">
            {rows.map((row) => {
              const Icon = bodySystemIcons[row.bodySystem]
              const selected = row.id === selectedSystemId

              return (
                <div className="flex min-w-20 shrink-0 flex-col items-center gap-2" key={row.id}>
                  <button
                    aria-label={`${row.label} system`}
                    aria-pressed={selected}
                    className={cn(
                      "flex size-14 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                      selected
                        ? "bg-foreground text-background"
                        : "bg-muted/55 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    onClick={() => onSelectSystem(selected ? null : row.id)}
                    type="button"
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </button>
                  <span
                    className={cn(
                      "max-w-20 truncate text-center text-xs font-medium",
                      selected ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {row.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SystemStatusCard({
  onOpenEvidence,
  readiness,
  rows,
  selectedSystem,
  statusClaim,
}: {
  onOpenEvidence: (claim: EvidenceBackedClaim) => void
  readiness: number
  rows: SystemStatusRow[]
  selectedSystem: HealthMapSignal | null
  statusClaim: EvidenceBackedClaim
}) {
  const activeClaim = selectedSystem ?? statusClaim
  const activeScore = selectedSystem?.score ?? readiness
  const activeTone = semanticToneForScore(activeScore)
  const activeRows = selectedSystem
    ? [
        { label: "Status", value: selectedSystem.value },
        { label: "Confidence", value: readableToken(selectedSystem.confidence) },
        { label: "Freshness", value: readableToken(selectedSystem.freshness) },
        { label: "Evidence sources", value: String(selectedSystem.evidence.length) },
      ]
    : rows

  return (
    <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
      <CardHeader>
        <CardTitle>{selectedSystem?.label ?? "System status"}</CardTitle>
        <CardDescription>
          {selectedSystem?.description ?? "Current model confidence and data freshness."}
        </CardDescription>
        <CardAction>
          <EvidenceButton claim={activeClaim} label="Evidence" onOpenEvidence={onOpenEvidence} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-2xl bg-secondary p-4">
          <p className="text-sm font-medium text-muted-foreground">
            {selectedSystem ? "System score" : "Overall readiness"}
          </p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <span className="text-5xl font-semibold leading-none">{activeScore}</span>
            <SemanticBadge context="Status" value={selectedSystem?.value ?? "Good"} />
          </div>
          <Progress value={activeScore} tone={activeTone} className="mt-5" />
        </div>
        <SectionTable>
          {activeRows.map(({ label, value }) => (
            <SectionTableRow
              key={label}
              title={label}
              trailing={<SemanticValue className="text-sm font-medium text-foreground" context={label} value={value} />}
            />
          ))}
        </SectionTable>
      </CardContent>
    </Card>
  )
}

function VitalCard({
  onOpenEvidence,
  vital,
}: {
  onOpenEvidence: (claim: EvidenceBackedClaim) => void
  vital: VisualVitalMetric
}) {
  const tone = semanticToneForScore(vital.score)

  return (
    <Card className={metricCardClass}>
      <CardHeader className="gap-1.5">
        <CardTitle>{vital.title}</CardTitle>
        <CardDescription>{vital.detail}</CardDescription>
        <CardAction className="pt-0.5">
          <EvidenceButton claim={vital} label={`${vital.evidence.length} source`} onOpenEvidence={onOpenEvidence} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 items-baseline gap-1">
            <span className="text-3xl font-semibold leading-none">{vital.value}</span>
            {vital.unit ? <span className="text-xs text-muted-foreground">{vital.unit}</span> : null}
          </div>
          <SemanticBadge tone={tone} value={`${vital.score}/100`} />
        </div>
        <Progress value={vital.score} tone={tone} className="mt-4" />
      </CardContent>
    </Card>
  )
}

function WarningSigns({
  items,
  onOpenEvidence,
}: {
  items: WarningSign[]
  onOpenEvidence: (claim: EvidenceBackedClaim) => void
}) {
  return (
    <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
      <CardHeader>
        <CardTitle>Warning signs</CardTitle>
        <CardDescription>Early signals surfaced from recent workspace trends.</CardDescription>
      </CardHeader>
      <CardContent>
        <SectionTable>
          {items.map((item) => {
            const tone = semanticToneForValue(item.tone)

            return (
              <SectionTableRow
                className="items-start"
                disclosure
                key={item.id}
                leading={<div className={cn("mt-2 size-2 rounded-full", semanticDotClass(tone))} />}
                onClick={() => onOpenEvidence(item)}
                trailing={<SemanticBadge context="Confidence" value={item.confidence} />}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{item.title}</p>
                    <SemanticBadge context="Warning tone" value={readableToken(item.tone)} />
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              </SectionTableRow>
            )
          })}
        </SectionTable>
      </CardContent>
    </Card>
  )
}

function UpcomingCare({ items }: { items: UpcomingCareItem[] }) {
  return (
    <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
      <CardHeader>
        <CardTitle>Upcoming care</CardTitle>
        <CardDescription>Events and reminders connected to your care plan.</CardDescription>
      </CardHeader>
      <CardContent>
        <SectionTable>
          {items.map(({ title, detail }, index) => {
            const Icon = careIcons[index] ?? CalendarDays

            return <SectionTableRow icon={Icon} key={title} subtitle={detail} title={title} />
          })}
        </SectionTable>
      </CardContent>
    </Card>
  )
}

function BillingPage() {
  const workspace = useWorkspaceStore((state) => state.workspace)
  const [activeSectionId, setActiveSectionId] = useState<BillingSectionId | null>(null)
  const rowsBySection = useMemo(() => buildBillingRows(workspace), [workspace])
  const activeSection = activeSectionId ? billingSections.find((section) => section.id === activeSectionId) : null
  const summary = pageSummaries.billing

  if (activeSection) {
    const Icon = activeSection.icon
    const rows = rowsBySection[activeSection.id]

    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-7">
        <PageHeader
          title={activeSection.label}
          description={`${rows.length} ${rows.length === 1 ? "item" : "items"} in ${activeSection.label.toLowerCase()}.`}
          leading={
            <Button
              aria-label="Back to Billing"
              className="size-10 rounded-full"
              size="icon"
              variant="outline"
              onClick={() => setActiveSectionId(null)}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Button>
          }
        />

        <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
          <CardHeader>
            <CardTitle>{activeSection.label}</CardTitle>
            <CardDescription>{activeSection.description}</CardDescription>
            <CardAction>
              <div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <Icon className="size-4" aria-hidden="true" />
              </div>
            </CardAction>
          </CardHeader>
          <CardContent>
            <SectionTable>
              {rows.length > 0 ? (
                rows.map((row) => <BillingRecordRow icon={Icon} key={row.id} row={row} />)
              ) : (
                <SectionTableRow icon={Icon} subtitle={activeSection.description} title={`No ${activeSection.label.toLowerCase()} added`} />
              )}
            </SectionTable>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-7">
      <PageHeader title={summary.title} description={summary.description} />

      <section className="grid gap-4 lg:grid-cols-3">
        {billingSections.map((section) => (
          <BillingSectionCard
            key={section.id}
            rows={rowsBySection[section.id]}
            section={section}
            onSeeMore={() => setActiveSectionId(section.id)}
          />
        ))}
      </section>
    </div>
  )
}

function BillingSectionCard({
  onSeeMore,
  rows,
  section,
}: {
  onSeeMore: () => void
  rows: BillingPageRow[]
  section: BillingSectionDefinition
}) {
  const Icon = section.icon
  const previewRows = rows.slice(0, billingPreviewLimit)

  return (
    <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
      <CardHeader>
        <CardTitle>{section.label}</CardTitle>
        <CardDescription>{section.description}</CardDescription>
        <CardAction>
          <SemanticBadge value={`${rows.length} ${rows.length === 1 ? "item" : "items"}`}>
            {rows.length} {rows.length === 1 ? "item" : "items"}
          </SemanticBadge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <SectionTable>
          {previewRows.length > 0 ? (
            previewRows.map((row) => <BillingRecordRow icon={Icon} key={row.id} row={row} />)
          ) : (
            <SectionTableRow icon={Icon} subtitle={section.description} title={`No ${section.label.toLowerCase()} added`} />
          )}

          {rows.length > 0 ? (
            <SectionTableRow
              disclosure
              icon={List}
              subtitle={`View all ${rows.length} ${section.label.toLowerCase()}.`}
              title="See more"
              onClick={onSeeMore}
            />
          ) : null}
        </SectionTable>
      </CardContent>
    </Card>
  )
}

function BillingRecordRow({
  icon,
  row,
}: {
  icon: LucideIcon
  row: BillingPageRow
}) {
  return (
    <SectionTableRow
      icon={icon}
      subtitle={row.subtitle || row.date || "Billing item"}
      title={row.title}
      trailing={
        <div className="flex max-w-28 flex-col items-end gap-1 text-right sm:max-w-36">
          <SemanticBadge context="Status" value={row.meta || "Item"} />
          {row.amount ? <span className="truncate text-xs font-medium text-foreground">{row.amount}</span> : null}
        </div>
      }
    />
  )
}

function SettingsPage() {
  const error = useWorkspaceStore((state) => state.error)
  const exportWorkspaceJson = useWorkspaceStore((state) => state.exportWorkspaceJson)
  const importWorkspaceJson = useWorkspaceStore((state) => state.importWorkspaceJson)
  const resetWorkspace = useWorkspaceStore((state) => state.resetWorkspace)
  const workspace = useWorkspaceStore((state) => state.workspace)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<"export" | "import" | "reset" | null>(null)
  const summary = pageSummaries.settings
  const workspaceSummary = selectWorkspaceSummary(workspace)
  const [agentSettings, setAgentSettings] = useState<HealthViewAgentSettings>(() => getHealthViewAgentSettings())
  const [agentProvider, setAgentProvider] = useState<HealthViewAgentProviderId>(agentSettings.provider)
  const [agentModel, setAgentModel] = useState(agentSettings.model)
  const [agentApiKey, setAgentApiKey] = useState(agentSettings.apiKey ?? "")
  const selectedProviderOption =
    healthViewProviderOptions.find((option) => option.id === agentProvider) ?? healthViewProviderOptions[0]

  function saveAgentSettings(input: {
    apiKey: string
    healthDataAccessEnabled?: boolean
    model: string
    provider: HealthViewAgentProviderId
  }) {
    setAgentSettings(updateHealthViewAgentSettings(input))
  }

  function handleAgentProviderChange(provider: HealthViewAgentProviderId) {
    const option = healthViewProviderOptions.find((item) => item.id === provider) ?? healthViewProviderOptions[0]
    const model = option.defaultModel

    setAgentProvider(provider)
    setAgentModel(model)
    saveAgentSettings({
      apiKey: agentApiKey,
      model,
      provider,
    })
  }

  function setHealthDataAccessEnabled(enabled: boolean) {
    const nextSettings = updateHealthViewAgentSettings({
      apiKey: agentApiKey,
      healthDataAccessEnabled: enabled,
      model: agentModel,
      provider: agentProvider,
    })
    setAgentSettings(nextSettings)
  }

  async function runVaultAction(action: "export" | "import" | "reset", task: () => Promise<string>) {
    setActionError(null)
    setActionMessage(null)
    setBusyAction(action)

    try {
      const message = await task()
      setActionMessage(message)
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : "The vault action failed.")
    } finally {
      setBusyAction(null)
    }
  }

  async function handleReset() {
    await runVaultAction("reset", async () => {
      await resetWorkspace()
      return "Vault reset to the bundled seed workspace."
    })
  }

  async function handleExport() {
    await runVaultAction("export", async () => {
      const json = await exportWorkspaceJson()
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }))
      const anchor = document.createElement("a")

      anchor.href = url
      anchor.download = "healthviewos-workspace.json"
      anchor.click()
      URL.revokeObjectURL(url)

      return "Workspace JSON exported from browser-local storage."
    })
  }

  async function handleImport(file: File | undefined) {
    if (!file) {
      return
    }

    await runVaultAction("import", async () => {
      await importWorkspaceJson(await file.text())
      return "Workspace JSON imported and validated."
    })
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-7">
      <PageHeader title={summary.title} description={summary.description} />

      <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
        <CardHeader>
        <CardTitle>AI assistant</CardTitle>
        <CardDescription>Provider, model, and browser-local key for HealthView Chat.</CardDescription>
        <CardAction>
            <SemanticBadge tone={agentSettings.apiKey ? "good" : "warning"} value={agentSettings.apiKey ? "Configured" : "Key needed"}>
              {agentSettings.apiKey ? "Configured" : "Key needed"}
            </SemanticBadge>
        </CardAction>
      </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SectionTable>
            <SectionTableRow
              title={
                <label htmlFor="agent-provider-select">
                  Provider
                </label>
              }
              subtitle="Assistant backend for HealthView Chat."
              trailing={
                <SettingsSelect
                  id="agent-provider-select"
                  value={agentProvider}
                  onChange={(event) => handleAgentProviderChange(event.target.value as HealthViewAgentProviderId)}
                >
                  {healthViewProviderOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </SettingsSelect>
              }
            />

            <SectionTableRow
              title={
                <label htmlFor="agent-model-select">
                  Model
                </label>
              }
              subtitle="Default model for text calls."
              trailing={
                <SettingsSelect
                  id="agent-model-select"
                  value={agentModel}
                  onChange={(event) => {
                    const model = event.target.value
                    setAgentModel(model)
                    saveAgentSettings({
                      apiKey: agentApiKey,
                      model,
                      provider: agentProvider,
                    })
                  }}
                >
                  {selectedProviderOption.models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </SettingsSelect>
              }
            />

            <SectionTableRow
              title={
                <label htmlFor="agent-api-key-input">
                  API key
                </label>
              }
              subtitle="Stored in this browser only."
              trailing={
                <input
                  id="agent-api-key-input"
                  autoComplete="off"
                  className={cn(settingsFieldControlClass, "placeholder:text-muted-foreground")}
                  placeholder={agentProvider === "openai" ? "sk-..." : "xai-..."}
                  type="password"
                  value={agentApiKey}
                  onChange={(event) => {
                    const apiKey = event.target.value
                    setAgentApiKey(apiKey)
                    saveAgentSettings({
                      apiKey,
                      model: agentModel,
                      provider: agentProvider,
                    })
                  }}
                />
              }
            />

            <SectionTableRow
              title="Health data access"
              subtitle="Allow HealthView Chat and voice to read the browser-local workspace when answering your questions."
              trailing={
                <SettingsToggle
                  checked={agentSettings.healthDataAccessEnabled}
                  label={`${agentSettings.healthDataAccessEnabled ? "Disable" : "Enable"} Health data access`}
                  onCheckedChange={setHealthDataAccessEnabled}
                />
              }
            />
          </SectionTable>
        </CardContent>
      </Card>

      <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
        <CardHeader>
        <CardTitle>Local vault</CardTitle>
        <CardDescription>Persistent browser storage for the active workspace.</CardDescription>
        <CardAction>
            <SemanticBadge tone="info" value="Browser-local IndexedDB" />
        </CardAction>
      </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SectionTable>
            {workspaceSummary.map((row) => (
              <SectionTableRow
                key={row.label}
                title={row.label}
                trailing={<SemanticValue className="max-w-52 truncate text-right text-sm font-medium text-foreground" context={row.label} value={row.value} />}
              />
            ))}
          </SectionTable>

          <div className="flex flex-wrap gap-2">
            <Button disabled={Boolean(busyAction)} variant="outline" onClick={() => void handleReset()}>
              <RotateCcw data-icon="inline-start" />
              Reset vault
            </Button>
            <Button disabled={Boolean(busyAction)} variant="outline" onClick={() => void handleExport()}>
              <Download data-icon="inline-start" />
              Export JSON
            </Button>
            <Button disabled={Boolean(busyAction)} variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload data-icon="inline-start" />
              Import JSON
            </Button>
            <input
              ref={fileInputRef}
              accept="application/json,.json"
              className="sr-only"
              type="file"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                void handleImport(file)
                event.currentTarget.value = ""
              }}
            />
          </div>

          {actionMessage ? (
            <p className="rounded-xl bg-secondary px-3 py-2 text-sm text-secondary-foreground">{actionMessage}</p>
          ) : null}
          {actionError || error ? (
            <p className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive">
              <AlertCircle className="mt-1 size-4 shrink-0" aria-hidden="true" />
              <span>{actionError ?? error}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function ServicesPage() {
  const appLocation = useNavigationStore((state) => state.location)
  const navigate = useNavigationStore((state) => state.navigate)
  const saveWorkspace = useWorkspaceStore((state) => state.saveWorkspace)
  const workspace = useWorkspaceStore((state) => state.workspace)
  const [results, setResults] = useState<DirectorySearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [savingResultId, setSavingResultId] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const location = useServicesNearbyLocationStore((state) => state.location)
  const locationStatus = useServicesNearbyLocationStore((state) => state.status)
  const setLocationStatus = useServicesNearbyLocationStore((state) => state.setStatus)
  const summary = pageSummaries.services
  const servicesLocation = servicesLocationFrom(appLocation)
  const activeTab = serviceDirectoryTabForId(servicesLocation.tabId)
  const query = servicesLocation.query ?? ""
  const selectedResultId = servicesLocation.selectedResultId ?? null
  const selectedResult = results.find((result) => result.id === selectedResultId) ?? null

  const updateServicesLocation = useCallback((updates: Partial<Omit<ServicesLocationState, "page">>) => {
    navigate({
      page: "services",
      query,
      selectedResultId,
      tabId: activeTab.id,
      ...updates,
    })
  }, [activeTab.id, navigate, query, selectedResultId])

  useEffect(() => {
    if (activeTab.mode !== "nearby" || location || locationStatus !== "idle") return

    const timer = window.setTimeout(() => {
      void resolveServicesNearbyLocation()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [activeTab.mode, location, locationStatus])

  useEffect(() => {
    let disposed = false
    const timeout = window.setTimeout(() => {
      const input: DirectorySearchInput = {
        category: activeTab.category,
        location: location
          ? {
              ...location,
              radiusMeters: 15000,
            }
          : undefined,
        mode: activeTab.mode,
        query,
      }

      setSearching(true)
      setSearchError(null)

      searchServiceDirectory(workspace, input)
        .then((search) => {
          if (disposed) return
          const items = search.items

          setResults(items)
          if (selectedResultId && !items.some((item) => item.id === selectedResultId)) {
            updateServicesLocation({ selectedResultId: null })
          }
          setSearchError(
            items.length > 0 || !search.sourceError
              ? null
              : search.sourceError,
          )
        })
        .finally(() => {
          if (!disposed) setSearching(false)
        })
    }, 250)

    return () => {
      disposed = true
      window.clearTimeout(timeout)
    }
  }, [activeTab.category, activeTab.mode, location, query, selectedResultId, updateServicesLocation, workspace])

  async function saveServiceResult(result: DirectorySearchResult) {
    if (!workspace || result.saved) return

    const baseId = `service_${slugDirectoryId(result.title) || "directory_result"}`
    const existingIds = new Set(workspace.serviceItems.map((item) => item.id))
    let id = baseId
    let index = 2
    while (existingIds.has(id)) {
      id = `${baseId}_${index}`
      index += 1
    }

    await saveWorkspace({
      ...workspace,
      serviceItems: [
        ...workspace.serviceItems,
        {
          category: result.category,
          description: result.description ?? result.specialtyText ?? readableDirectoryToken(result.category),
          evidence: [],
          id,
          status: "active",
          subjectPersonId: workspace.settings.activePersonId,
          title: result.title,
        },
      ],
    })
    setResults((items) => items.map((item) => (item.id === result.id ? { ...item, saved: true } : item)))
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-7">
      <PageHeader
        title={summary.title}
        description={summary.description}
      />

      <div className="flex flex-col gap-4">
        <div className="flex h-11 items-center gap-3 rounded-full border bg-background/90 px-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition-shadow focus-within:shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
          <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            aria-label="Search services"
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            onChange={(event) => updateServicesLocation({ query: event.currentTarget.value, selectedResultId: null })}
            placeholder="Search services"
            type="search"
            value={query}
          />
          {searching ? <LoaderCircle className="size-4 animate-spin text-muted-foreground" aria-hidden="true" /> : null}
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {serviceDirectoryTabs.map((tab) => {
            const Icon = tab.icon
            const active = activeTab.id === tab.id

            return (
              <button
                className={cn(
                  "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]",
                )}
                key={tab.id}
                onClick={() => {
                  updateServicesLocation({ selectedResultId: null, tabId: tab.id })
                  if (tab.mode === "nearby" && locationStatus === "unavailable") setLocationStatus("idle")
                }}
                type="button"
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <SemanticBadge
            context="Status"
            tone={activeTab.mode === "nearby" && locationStatus === "ready" ? "good" : activeTab.mode === "nearby" && locationStatus === "requesting" ? "warning" : "neutral"}
            value={activeTab.mode === "nearby"
              ? locationStatus === "ready"
                ? "Location ready"
                : locationStatus === "requesting"
                  ? "Requesting location"
                  : "Location optional"
              : readableToken(activeTab.mode)}
          />
          <span>{results.length} {results.length === 1 ? "result" : "results"}</span>
          {query ? <span>Filtered by "{query}"</span> : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="min-w-0">
          {selectedResult ? (
            <ServiceDirectoryDetail
              result={selectedResult}
              saving={savingResultId === selectedResult.id}
              onBack={() => updateServicesLocation({ selectedResultId: null })}
              onSave={async (result) => {
                setSavingResultId(result.id)
                try {
                  await saveServiceResult(result)
                } finally {
                  setSavingResultId(null)
                }
              }}
            />
          ) : (
            <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
              <CardHeader>
                <CardTitle>Providers</CardTitle>
                <CardDescription>
                  {activeTab.label} directory results from saved records and public sources.
                </CardDescription>
                <CardAction>
                  <SemanticBadge value={`${results.length} ${results.length === 1 ? "result" : "results"}`}>
                    {results.length} {results.length === 1 ? "result" : "results"}
                  </SemanticBadge>
                </CardAction>
              </CardHeader>
              <CardContent>
                <SectionTable>
                  {searchError ? (
                    <SectionTableRow
                      icon={Search}
                      subtitle={searchError}
                      title="Search unavailable"
                    />
                  ) : results.length > 0 ? (
                    results.map((result) => (
                      <ServiceDirectoryResultRow
                        key={result.id}
                        result={result}
                        selected={false}
                        onClick={() => updateServicesLocation({ selectedResultId: result.id })}
                      />
                    ))
                  ) : (
                    <SectionTableRow
                      icon={Search}
                      subtitle={searching ? "Searching services..." : "No matching services found."}
                      title={searching ? "Searching" : "No results"}
                    />
                  )}
                </SectionTable>
              </CardContent>
            </Card>
          )}
        </section>

        <section className="min-w-0">
          <ServiceDirectoryMap
            location={location}
            results={results}
            selectedResult={selectedResult}
            onSelectResult={(resultId) => updateServicesLocation({ selectedResultId: resultId })}
          />
        </section>
      </div>
    </div>
  )
}

function ServiceDirectoryResultRow({
  onClick,
  result,
  selected,
}: {
  onClick: () => void
  result: DirectorySearchResult
  selected: boolean
}) {
  const Icon = serviceDirectoryIcon(result)

  return (
    <SectionTableRow
      disclosure={!selected}
      icon={Icon}
      onClick={onClick}
      subtitle={[
        result.description,
        readableDirectoryToken(result.availabilityMode),
        result.addressText,
      ]
        .filter(Boolean)
        .join(" - ")}
      title={result.title}
      trailing={
        <div className="flex items-center gap-2">
          {result.saved ? <Bookmark className="size-4 fill-foreground text-foreground" aria-hidden="true" /> : null}
          {selected ? <SemanticBadge tone="info" value="Selected" /> : null}
        </div>
      }
    />
  )
}

function ServiceDirectoryDetail({
  onBack,
  onSave,
  result,
  saving,
}: {
  onBack: () => void
  onSave: (result: DirectorySearchResult) => Promise<void>
  result: DirectorySearchResult
  saving: boolean
}) {
  const providerRows = [
    { label: "Name", value: result.title },
    { label: "Summary", value: result.description ?? readableDirectoryToken(result.category) },
    { label: "Category", value: readableDirectoryToken(result.category) },
    { label: "Mode", value: readableDirectoryToken(result.availabilityMode) },
    { label: "Specialty", value: result.specialtyText },
    { label: "Organization", value: result.organizationName },
  ]
  const contactRows = [
    { label: "Address", value: result.addressText },
    { label: "Phone", value: result.phone },
    { label: "Website", value: result.website },
    { label: "NPI", value: result.npi },
  ]
  const sourceRows = result.sourceClaims.map((claim) => ({
    label: claim.sourceName,
    note: formatRecordDate(claim.fetchedAt),
    value: claim.externalId ?? claim.note ?? "Source claim",
  }))

  return (
    <div className="flex flex-col gap-5">
      <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Button
              aria-label="Back to service results"
              className="size-9 rounded-full"
              size="icon"
              variant="outline"
              onClick={onBack}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Button>
            Provider
          </CardTitle>
          <CardDescription>{result.title}</CardDescription>
          <CardAction className="flex items-center gap-2">
            <Button
              className="shrink-0"
              disabled={Boolean(result.saved) || saving}
              size="sm"
              variant={result.saved ? "secondary" : "default"}
              onClick={() => void onSave(result)}
            >
              {result.saved ? (
                <>
                  <Bookmark data-icon="inline-start" />
                  Saved
                </>
              ) : saving ? (
                <>
                  <LoaderCircle data-icon="inline-start" className="animate-spin" />
                  Saving
                </>
              ) : (
                <>
                  <Bookmark data-icon="inline-start" />
                  Save
                </>
              )}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <DirectoryDetailGroup rows={providerRows} title="Overview" />
          <DirectoryDetailGroup rows={contactRows} title="Contact" />
          <DirectoryDetailGroup rows={sourceRows} title="Sources" />
        </CardContent>
      </Card>
    </div>
  )
}

function DirectoryDetailGroup({
  rows,
  title,
}: {
  rows: Array<{ label: string; note?: string; value?: string }>
  title: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="px-1 text-xs font-semibold uppercase text-muted-foreground">{title}</p>
      <SectionTable>
        {rows.map((row) => (
          <SectionTableRow className="items-start" key={`${title}-${row.label}`}>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{row.label}</p>
              {row.note ? <p className="mt-0.5 text-xs text-muted-foreground">{row.note}</p> : null}
            </div>
            <p className="max-w-[55%] break-words text-right text-sm text-muted-foreground">
              {row.value || "Not recorded"}
            </p>
          </SectionTableRow>
        ))}
      </SectionTable>
    </div>
  )
}

type MapCoordinate = {
  latitude: number
  longitude: number
}

type MapGestureEvent = Event & {
  clientX?: number
  clientY?: number
  scale?: number
}

type ServiceDirectoryMapMarker = {
  coordinate: MapCoordinate
  id: string
  label: string
  icon: LucideIcon
  resultId?: string
  selected?: boolean
  type: "provider" | "user"
}

const osmTileSize = 256

function ServiceDirectoryMap({
  location,
  onSelectResult,
  results,
  selectedResult,
}: {
  location: { latitude: number; longitude: number } | null
  onSelectResult: (resultId: string) => void
  results: DirectorySearchResult[]
  selectedResult: DirectorySearchResult | null
}) {
  const providerMarkers = results
    .filter((result) => result.latitude !== undefined && result.longitude !== undefined)
    .map((result) => ({
      coordinate: {
        latitude: result.latitude as number,
        longitude: result.longitude as number,
      },
      id: `provider_${result.id}`,
      icon: serviceDirectoryIcon(result),
      label: result.title,
      resultId: result.id,
      selected: selectedResult?.id === result.id,
      type: "provider" as const,
    }))

  const mapRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const gestureRef = useRef<{ offset: { x: number; y: number }; zoom: number } | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const animatedSelectionRef = useRef<string | null>(null)
  const markers: ServiceDirectoryMapMarker[] = [
    ...(location
      ? [
          {
            coordinate: location,
            id: "user_location",
            icon: UserRound,
            label: "You",
            selected: !selectedResult,
            type: "user" as const,
          },
        ]
      : []),
    ...providerMarkers,
  ]
  const selectedCoordinate =
    selectedResult?.latitude !== undefined && selectedResult.longitude !== undefined
      ? { latitude: selectedResult.latitude, longitude: selectedResult.longitude }
      : null
  const defaultCenter = selectedCoordinate ?? location ?? providerMarkers[0]?.coordinate ?? { latitude: 39.5, longitude: -98.35 }
  const defaultZoom = selectedCoordinate || location ? 13 : providerMarkers.length > 0 ? 11 : 4
  const [mapCenter, setMapCenter] = useState<MapCoordinate>(defaultCenter)
  const [mapZoom, setMapZoom] = useState(defaultZoom)
  const mapCenterRef = useRef(defaultCenter)
  const mapZoomRef = useRef(defaultZoom)
  const tileZoom = Math.floor(mapZoom)
  const tileScale = 2 ** (mapZoom - tileZoom)
  const centerWorld = coordinateToWorldPixels(mapCenter, tileZoom)
  const centerTileX = Math.floor(centerWorld.x / osmTileSize)
  const centerTileY = Math.floor(centerWorld.y / osmTileSize)
  const tiles = mapTileGrid(centerTileX, centerTileY, tileZoom)
  useEffect(() => {
    if (selectedResult?.id && animatedSelectionRef.current === selectedResult.id) {
      animatedSelectionRef.current = null
      return
    }

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    mapCenterRef.current = defaultCenter
    mapZoomRef.current = defaultZoom
    setMapCenter(defaultCenter)
    setMapZoom(defaultZoom)
  }, [
    defaultCenter.latitude,
    defaultCenter.longitude,
    defaultZoom,
    selectedResult?.id,
  ])

  useEffect(() => {
    const mapElement = mapRef.current
    if (!mapElement) return

    function setMapViewport(center: MapCoordinate, zoom: number) {
      mapCenterRef.current = center
      mapZoomRef.current = zoom
      setMapCenter(center)
      setMapZoom(zoom)
    }

    function offsetToCoordinate(offset: { x: number; y: number }, center: MapCoordinate, zoom: number) {
      const currentTileZoom = Math.floor(zoom)
      const currentTileScale = 2 ** (zoom - currentTileZoom)
      const currentWorld = coordinateToWorldPixels(center, currentTileZoom)

      return worldPixelsToCoordinate(
        {
          x: currentWorld.x + offset.x / currentTileScale,
          y: currentWorld.y + offset.y / currentTileScale,
        },
        currentTileZoom,
      )
    }

    function zoomMapAtOffset(offset: { x: number; y: number }, nextZoom: number) {
      const currentZoom = mapZoomRef.current
      if (Math.abs(nextZoom - currentZoom) < 0.001) return

      const cursorCoordinate = offsetToCoordinate(offset, mapCenterRef.current, currentZoom)
      const nextTileZoom = Math.floor(nextZoom)
      const nextTileScale = 2 ** (nextZoom - nextTileZoom)
      const cursorWorld = coordinateToWorldPixels(cursorCoordinate, nextTileZoom)
      const nextCenterWorld = {
        x: cursorWorld.x - offset.x / nextTileScale,
        y: cursorWorld.y - offset.y / nextTileScale,
      }

      setMapViewport(worldPixelsToCoordinate(nextCenterWorld, nextTileZoom), nextZoom)
    }

    function handleWheel(event: WheelEvent) {
      const currentMapElement = mapRef.current
      if (!currentMapElement) return

      event.preventDefault()
      event.stopPropagation()

      const rect = currentMapElement.getBoundingClientRect()
      const offset = {
        x: event.clientX - rect.left - rect.width / 2,
        y: event.clientY - rect.top - rect.height / 2,
      }

      if (event.ctrlKey || event.metaKey) {
        const currentZoom = mapZoomRef.current
        zoomMapAtOffset(offset, clampMapZoom(currentZoom + wheelZoomDelta(event.deltaY)))
        return
      }

      const currentZoom = mapZoomRef.current
      const currentTileZoom = Math.floor(currentZoom)
      const currentTileScale = 2 ** (currentZoom - currentTileZoom)
      const currentWorld = coordinateToWorldPixels(mapCenterRef.current, currentTileZoom)
      const nextCenter = worldPixelsToCoordinate(
        {
          x: currentWorld.x + event.deltaX / currentTileScale,
          y: currentWorld.y + event.deltaY / currentTileScale,
        },
        currentTileZoom,
      )
      setMapViewport(nextCenter, currentZoom)
    }

    function handleGestureStart(event: Event) {
      const currentMapElement = mapRef.current
      if (!currentMapElement) return

      event.preventDefault()
      event.stopPropagation()

      const gesture = event as MapGestureEvent
      const rect = currentMapElement.getBoundingClientRect()
      gestureRef.current = {
        offset: {
          x: (gesture.clientX ?? rect.left + rect.width / 2) - rect.left - rect.width / 2,
          y: (gesture.clientY ?? rect.top + rect.height / 2) - rect.top - rect.height / 2,
        },
        zoom: mapZoomRef.current,
      }
    }

    function handleGestureChange(event: Event) {
      const gesture = event as MapGestureEvent
      const start = gestureRef.current
      if (!start || typeof gesture.scale !== "number") return

      event.preventDefault()
      event.stopPropagation()

      zoomMapAtOffset(start.offset, clampMapZoom(start.zoom + Math.log2(Math.max(gesture.scale, 0.01)) * 2.4))
    }

    function handleGestureEnd(event: Event) {
      event.preventDefault()
      event.stopPropagation()
      gestureRef.current = null
    }

    mapElement.addEventListener("wheel", handleWheel, { passive: false })
    mapElement.addEventListener("gesturestart", handleGestureStart, { passive: false })
    mapElement.addEventListener("gesturechange", handleGestureChange, { passive: false })
    mapElement.addEventListener("gestureend", handleGestureEnd, { passive: false })
    return () => {
      mapElement.removeEventListener("wheel", handleWheel)
      mapElement.removeEventListener("gesturestart", handleGestureStart)
      mapElement.removeEventListener("gesturechange", handleGestureChange)
      mapElement.removeEventListener("gestureend", handleGestureEnd)
    }
  }, [])

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    const target = event.target instanceof HTMLElement ? event.target : null
    if (target?.closest("button,a,input,textarea,select")) return

    dragRef.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return

    const deltaX = event.clientX - drag.x
    const deltaY = event.clientY - drag.y
    dragRef.current = { x: event.clientX, y: event.clientY }

    const currentZoom = mapZoomRef.current
    const currentTileZoom = Math.floor(currentZoom)
    const currentTileScale = 2 ** (currentZoom - currentTileZoom)
    const currentWorld = coordinateToWorldPixels(mapCenterRef.current, currentTileZoom)
    const nextCenter = worldPixelsToCoordinate(
        {
          x: currentWorld.x - deltaX / currentTileScale,
          y: currentWorld.y - deltaY / currentTileScale,
        },
      currentTileZoom,
    )
    mapCenterRef.current = nextCenter
    setMapCenter(nextCenter)
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function animateToMarker(marker: ServiceDirectoryMapMarker) {
    if (!marker.resultId) return

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
    }

    const startCenter = mapCenterRef.current
    const startZoom = mapZoomRef.current
    const targetZoom = Math.max(startZoom, 14.5)
    const durationMs = 520
    let startedAt: number | null = null

    function step(now: number) {
      startedAt ??= now
      const progress = Math.min(1, (now - startedAt) / durationMs)
      const eased = easeOutCubic(progress)
      const nextCenter = interpolateCoordinate(startCenter, marker.coordinate, eased)
      const nextZoom = startZoom + (targetZoom - startZoom) * eased

      mapCenterRef.current = nextCenter
      mapZoomRef.current = nextZoom
      setMapCenter(nextCenter)
      setMapZoom(nextZoom)

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(step)
        return
      }

      animationFrameRef.current = null
    }

    animationFrameRef.current = window.requestAnimationFrame(step)
  }

  return (
    <Card
      className={cn(sectionCardClass, "relative min-h-[28rem] cursor-grab touch-none overflow-hidden rounded-2xl p-0 active:cursor-grabbing")}
      ref={mapRef}
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
    >
      <div className="absolute inset-0 bg-muted">
        {tiles.map((tile) => {
          const left = (tile.x * osmTileSize - centerWorld.x) * tileScale
          const top = (tile.y * osmTileSize - centerWorld.y) * tileScale

          return (
            <img
              alt=""
              aria-hidden="true"
              className="absolute max-w-none select-none opacity-95"
              decoding="async"
              draggable={false}
              key={`${tile.zoom}_${tile.wrappedX}_${tile.y}`}
              loading="eager"
              src={`https://tile.openstreetmap.org/${tile.zoom}/${tile.wrappedX}/${tile.y}.png`}
              style={{
                height: osmTileSize * tileScale,
                left: `calc(50% + ${left}px)`,
                top: `calc(50% + ${top}px)`,
                width: osmTileSize * tileScale,
              }}
            />
          )
        })}
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.26),transparent_34%,rgba(255,255,255,0.34))] dark:bg-[linear-gradient(to_bottom,rgba(10,10,10,0.10),transparent_38%,rgba(10,10,10,0.30))]" />
      <div className="absolute inset-0 ring-1 ring-inset ring-foreground/10" />

      {markers.map((marker) => {
        const Icon = marker.icon
        const position = markerPosition(marker.coordinate, centerWorld, tileZoom, tileScale)
        const showLabel = marker.type === "user" || marker.selected

        return (
          <button
            aria-label={marker.resultId ? `Select ${marker.label}` : marker.label}
            className={cn(
              "group absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full text-left outline-none transition-transform hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/40",
              marker.type === "user" ? "text-primary" : "text-foreground",
              marker.selected && "z-20",
            )}
            disabled={!marker.resultId}
            key={marker.id}
            onClick={(event) => {
              event.stopPropagation()
              if (marker.resultId) {
                animatedSelectionRef.current = marker.resultId
                onSelectResult(marker.resultId)
              }
              animateToMarker(marker)
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            style={{
              left: `calc(50% + ${position.x}px)`,
              top: `calc(50% + ${position.y}px)`,
            }}
            title={marker.label}
            type="button"
          >
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full border bg-background/95 text-foreground shadow-[0_12px_28px_rgba(15,23,42,0.16)] backdrop-blur",
                marker.type === "user" && "border-primary text-primary",
                marker.selected && "border-primary bg-primary text-primary-foreground",
              )}
            >
              <Icon className={cn("size-4 shrink-0", marker.type === "user" ? "fill-primary/20" : "")} aria-hidden="true" />
            </span>
            <span
              className={cn(
                "pointer-events-none absolute bottom-10 left-1/2 min-w-24 max-w-48 -translate-x-1/2 whitespace-nowrap rounded-full border bg-background/95 px-2.5 py-1.5 text-xs font-semibold text-foreground opacity-0 shadow-[0_12px_28px_rgba(15,23,42,0.16)] backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
                showLabel && "opacity-100",
                marker.selected ? "border-primary text-primary" : "border-foreground/10",
              )}
            >
              <span className="block truncate">{marker.label}</span>
            </span>
          </button>
        )
      })}
    </Card>
  )
}

function coordinateToWorldPixels(coordinate: MapCoordinate, zoom: number) {
  const scale = osmTileSize * 2 ** zoom
  const latitude = Math.max(Math.min(coordinate.latitude, 85.05112878), -85.05112878)
  const sinLatitude = Math.sin((latitude * Math.PI) / 180)

  return {
    x: ((coordinate.longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * scale,
  }
}

function worldPixelsToCoordinate(world: { x: number; y: number }, zoom: number): MapCoordinate {
  const scale = osmTileSize * 2 ** zoom
  const longitude = (world.x / scale) * 360 - 180
  const mercatorY = 0.5 - world.y / scale
  const latitude = (90 - (360 * Math.atan(Math.exp(-mercatorY * 2 * Math.PI))) / Math.PI)

  return {
    latitude: Math.max(Math.min(latitude, 85.05112878), -85.05112878),
    longitude: ((((longitude + 180) % 360) + 360) % 360) - 180,
  }
}

function clampMapZoom(zoom: number) {
  return Math.max(3, Math.min(17, zoom))
}

function easeOutCubic(value: number) {
  return 1 - (1 - value) ** 3
}

function interpolateCoordinate(start: MapCoordinate, end: MapCoordinate, progress: number): MapCoordinate {
  return {
    latitude: start.latitude + (end.latitude - start.latitude) * progress,
    longitude: start.longitude + shortestLongitudeDelta(start.longitude, end.longitude) * progress,
  }
}

function shortestLongitudeDelta(start: number, end: number) {
  const delta = end - start
  if (delta > 180) return delta - 360
  if (delta < -180) return delta + 360
  return delta
}

function wheelZoomDelta(delta: number) {
  if (delta === 0) return 0

  const direction = delta < 0 ? 1 : -1
  const magnitude = Math.min(1.35, Math.log1p(Math.abs(delta)) * 0.34)

  return direction * magnitude
}

function markerPosition(
  coordinate: MapCoordinate,
  centerWorld: { x: number; y: number },
  zoom: number,
  scale = 1,
) {
  const world = coordinateToWorldPixels(coordinate, zoom)

  return {
    x: (world.x - centerWorld.x) * scale,
    y: (world.y - centerWorld.y) * scale,
  }
}

function mapTileGrid(centerTileX: number, centerTileY: number, zoom: number) {
  const maxTile = 2 ** zoom
  const tiles: Array<{ wrappedX: number; x: number; y: number; zoom: number }> = []

  for (let x = centerTileX - 2; x <= centerTileX + 2; x += 1) {
    for (let y = centerTileY - 2; y <= centerTileY + 2; y += 1) {
      if (y < 0 || y >= maxTile) continue
      tiles.push({
        wrappedX: ((x % maxTile) + maxTile) % maxTile,
        x,
        y,
        zoom,
      })
    }
  }

  return tiles
}

function serviceDirectoryIcon(result: DirectorySearchResult): LucideIcon {
  if (result.category === "provider") return Stethoscope
  if (result.category === "pharmacy") return Pill
  if (result.category === "lab") return FlaskConical
  if (result.category === "digital_service" || result.availabilityMode === "virtual") return Globe2
  if (result.category === "facility") return Hospital
  return Building2
}

function DetailGroups({
  emptyDescription,
  emptyTitle,
  groups,
}: {
  emptyDescription: string
  emptyTitle: string
  groups: RecordDetailGroup[]
}) {
  if (!groups.length) {
    return (
      <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
        <CardContent className="py-5">
          <SectionTable>
            <SectionTableRow icon={FileText} subtitle={emptyDescription} title={emptyTitle} />
          </SectionTable>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")} key={group.title}>
          <CardHeader>
            <CardTitle>{group.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <SectionTable>
              {group.rows.map((row) => (
                <SectionTableRow
                  key={`${group.title}_${row.label}`}
                  title={row.label}
                  trailing={
                    <SemanticValue
                      className="max-w-[14rem] truncate text-right text-sm font-medium text-foreground"
                      context={String(row.label)}
                      value={row.value}
                    />
                  }
                />
              ))}
            </SectionTable>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function RecordEditorCard({
  definition,
  draft,
  error,
  onChange,
}: {
  definition: RecordFormDefinition
  draft: Record<string, string>
  error: string | null
  onChange: (field: string, value: string) => void
}) {
  return (
    <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
      <CardHeader>
        <CardTitle>{definition.newTitle}</CardTitle>
        <CardDescription>{definition.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {definition.fields.map((field) => (
            <RecordEditorField
              field={field}
              key={field.name}
              value={draft[field.name] ?? ""}
              onChange={(value) => onChange(field.name, value)}
            />
          ))}
        </div>
        {error ? (
          <div className="mt-5 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function RecordEditorField({
  field,
  onChange,
  value,
}: {
  field: RecordFormField
  onChange: (value: string) => void
  value: string
}) {
  const fieldId = `record_field_${field.name}`
  const label = field.required ? `${field.label} *` : field.label

  return (
    <label className={cn("flex min-w-0 flex-col gap-2", field.type === "textarea" && "sm:col-span-2")} htmlFor={fieldId}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {field.type === "textarea" ? (
        <textarea
          autoComplete="off"
          className={recordTextareaControlClass}
          id={fieldId}
          required={field.required}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      ) : field.type === "select" ? (
        <select
          className={cn(recordFieldControlClass, "appearance-none")}
          id={fieldId}
          required={field.required}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
        >
          {(field.options ?? []).map((option) => (
            <option key={`${field.name}_${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          autoComplete="off"
          className={recordFieldControlClass}
          id={fieldId}
          required={field.required}
          type={field.type}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      )}
    </label>
  )
}

function RecordsPage() {
  const workspace = useWorkspaceStore((state) => state.workspace)
  const saveWorkspace = useWorkspaceStore((state) => state.saveWorkspace)
  const location = useNavigationStore((state) => state.location)
  const navigate = useNavigationStore((state) => state.navigate)
  const setRecordsLocation = useNavigationStore((state) => state.setRecordsLocation)
  const [editorCategoryId, setEditorCategoryId] = useState<RecordCategoryId | null>(null)
  const [recordDraft, setRecordDraft] = useState<Record<string, string>>({})
  const [recordEditorError, setRecordEditorError] = useState<string | null>(null)
  const [savingRecord, setSavingRecord] = useState(false)
  const activePerson = activePersonFor(workspace)
  const recordsLocation = recordsLocationFrom(location)
  const selectedCategory = recordsLocation.categoryId
    ? recordCategories.find((category) => category.id === recordsLocation.categoryId)
    : null
  const selectedHistorySection = recordsLocation.historySectionId
    ? historySections.find((section) => section.id === recordsLocation.historySectionId)
    : null
  const selectedHistorySectionId = selectedHistorySection?.id ?? null
  const selectedRecordId = recordsLocation.recordId ?? null
  const selectedSourceId = recordsLocation.sourceId ?? null
  const pageIndex = recordsLocation.pageIndex ?? 0
  const rowsByCategory = buildRecordsByCategory(workspace)
  const summary = pageSummaries.records
  const selectedRows =
    selectedCategory?.id === "history" && selectedHistorySectionId
      ? rowsForHistorySection(rowsByCategory, workspace, selectedHistorySectionId)
      : selectedCategory
        ? rowsByCategory[selectedCategory.id]
        : []
  const pageCount = Math.max(1, Math.ceil(selectedRows.length / recordsPageSize))
  const currentPageIndex = Math.min(pageIndex, pageCount - 1)
  const visibleRows = selectedRows.slice(
    currentPageIndex * recordsPageSize,
    currentPageIndex * recordsPageSize + recordsPageSize,
  )
  const selectedRecordIds = new Set(selectedRows.map((row) => row.id))
  const selectedArtifactIds = new Set(
    workspace?.recordSet.healthRecords
      .filter((record) => selectedRecordIds.has(record.id))
      .flatMap((record) => record.evidence.map((evidence) => evidence.artifactId)) ?? [],
  )
  const sourceRows =
    workspace?.recordSet.artifacts
      .filter((artifact) => selectedArtifactIds.has(artifact.id) || selectedRecordIds.has(artifact.id.replace(/^artifact_/, "")))
      .slice(0, 5) ?? []
  const editorHistorySectionId = editorCategoryId === "history" ? selectedHistorySectionId : null
  const editorDefinition = getRecordFormDefinition(editorCategoryId, editorHistorySectionId)

  function resetToRecordIndex() {
    navigate({ page: "records" })
  }

  function startCreateRecord(categoryId: RecordCategoryId, historySectionId: HistorySectionId | null = null) {
    setRecordDraft(emptyDraftForRecordCategory(categoryId, historySectionId))
    setRecordEditorError(null)
    setEditorCategoryId(categoryId)
  }

  function cancelCreateRecord() {
    setEditorCategoryId(null)
    setRecordDraft({})
    setRecordEditorError(null)
  }

  async function saveCreatedRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!workspace || !editorCategoryId || !editorDefinition) return

    const input = recordInputFromDraft(editorCategoryId, recordDraft, activePerson?.id, editorHistorySectionId)
    if (!input) {
      setRecordEditorError("Complete the required fields before saving.")
      return
    }

    setSavingRecord(true)
    setRecordEditorError(null)
    try {
      const nextWorkspace = createManualRecordInWorkspace(workspace, input)
      await saveWorkspace(nextWorkspace)
      cancelCreateRecord()
    } catch (error) {
      setRecordEditorError(error instanceof Error ? error.message : "Unable to save this record.")
    } finally {
      setSavingRecord(false)
    }
  }

  if (editorCategoryId && editorDefinition) {
    return (
      <form className="mx-auto flex max-w-5xl flex-col gap-7" onSubmit={saveCreatedRecord}>
        <PageHeader
          title={editorDefinition.newTitle}
          description={editorDefinition.description}
          leading={
            <Button
              aria-label="Back"
              className="size-10 rounded-full"
              size="icon"
              type="button"
              variant="outline"
              onClick={cancelCreateRecord}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Button>
          }
          action={
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={cancelCreateRecord}>
                Cancel
              </Button>
              <Button disabled={savingRecord} type="submit">
                {savingRecord ? "Saving" : "Save"}
              </Button>
            </div>
          }
        />

        <RecordEditorCard
          definition={editorDefinition}
          draft={recordDraft}
          error={recordEditorError}
          onChange={(field, value) =>
            setRecordDraft((current) => ({
              ...current,
              [field]: value,
            }))
          }
        />
      </form>
    )
  }

  if (selectedSourceId) {
    const artifact = sourceArtifactById(workspace, selectedSourceId)
    const groups = sourceDetailGroups(workspace, selectedSourceId)

    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-7">
        <PageHeader
          title={artifact?.title ?? "Source"}
          description={artifact ? "Source artifact, acquisition, files, and related records." : "Source not found."}
          leading={
            <Button
              aria-label="Back"
              className="size-10 rounded-full"
              size="icon"
              variant="outline"
              onClick={() => setRecordsLocation({ sourceId: null })}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Button>
          }
        />

        <DetailGroups groups={groups} emptyTitle="No source details" emptyDescription="This source does not have details in the local vault." />
      </div>
    )
  }

  if (selectedRecordId) {
    const groups = recordDetailGroups(workspace, selectedRecordId)
    const recordSourceRows = sourceArtifactsForRecordIds(workspace, [selectedRecordId])

    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-7">
        <PageHeader
          title={recordTitleFor(workspace, selectedRecordId)}
          description={selectedCategory ? recordCategoryLabel(selectedCategory.id) : "Record details"}
          leading={
            <Button
              aria-label="Back"
              className="size-10 rounded-full"
              size="icon"
              variant="outline"
              onClick={() => setRecordsLocation({ recordId: null })}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Button>
          }
        />

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <DetailGroups groups={groups} emptyTitle="No record details" emptyDescription="This record does not have normalized details yet." />

          <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
            <CardHeader>
              <CardTitle>Sources</CardTitle>
              <CardDescription>Evidence and source artifacts for this record.</CardDescription>
            </CardHeader>
            <CardContent>
              <SectionTable>
                {recordSourceRows.length > 0 ? (
                  recordSourceRows.map((artifact) => (
                    <SectionTableRow
                      disclosure
                      icon={FileText}
                      key={artifact.id}
                      subtitle={readableToken(artifact.kind)}
                      title={artifact.title}
                      trailing={<SemanticBadge context="Freshness" value={readableToken(artifact.freshness)} />}
                      onClick={() => setRecordsLocation({ sourceId: artifact.id })}
                    />
                  ))
                ) : (
                  <SectionTableRow icon={FileText} subtitle="No linked source artifacts for this record." title="No sources" />
                )}
              </SectionTable>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (selectedCategory) {
    const CategoryIcon = selectedCategory.icon
    if (selectedCategory.id === "demographics") {
      const groups = demographicDetailGroups(workspace, activePerson?.id)
      const demographicSourceRows = activePerson ? sourceArtifactsForRecordIds(workspace, [activePerson.id]) : []

      return (
        <div className="mx-auto flex max-w-5xl flex-col gap-7">
          <PageHeader
            title={selectedCategory.label}
            description={selectedCategory.description}
            action={
              <Button disabled={!workspace} onClick={() => startCreateRecord("demographics")} type="button">
                <Plus className="size-4" aria-hidden="true" />
                Add
              </Button>
            }
            leading={
              <Button
                aria-label="Back to Records"
                className="size-10 rounded-full"
                size="icon"
                variant="outline"
                onClick={resetToRecordIndex}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
              </Button>
            }
          />

          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <DetailGroups
              groups={groups}
              emptyTitle="No demographics added"
              emptyDescription="Select a person from the sidebar or import demographic records."
            />

            <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
              <CardHeader>
                <CardTitle>Sources</CardTitle>
                <CardDescription>Source artifacts linked to demographics.</CardDescription>
              </CardHeader>
              <CardContent>
                <SectionTable>
                  {demographicSourceRows.length > 0 ? (
                    demographicSourceRows.map((artifact) => (
                      <SectionTableRow
                        disclosure
                        icon={FileText}
                        key={artifact.id}
                        subtitle={readableToken(artifact.kind)}
                        title={artifact.title}
                        trailing={<SemanticBadge context="Freshness" value={readableToken(artifact.freshness)} />}
                        onClick={() => setRecordsLocation({ sourceId: artifact.id })}
                      />
                    ))
                  ) : (
                    <SectionTableRow icon={FileText} subtitle="No linked source artifacts for demographics." title="No sources" />
                  )}
                </SectionTable>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }

    const showingHistorySections = selectedCategory.id === "history" && !selectedHistorySectionId
    const categoryTitle = selectedHistorySectionId ? historySectionLabel(selectedHistorySectionId) : selectedCategory.label
    const categoryDescription = selectedHistorySectionId
      ? historySections.find((section) => section.id === selectedHistorySectionId)?.description ?? selectedCategory.description
      : selectedCategory.description
    const tableRows = showingHistorySections ? historySectionRows(rowsByCategory, workspace) : visibleRows
    const categoryFormDefinition = getRecordFormDefinition(selectedCategory.id, selectedHistorySectionId)
    const canCreateRecord = Boolean(categoryFormDefinition && workspace && activePerson)

    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-7">
        <PageHeader
          title={categoryTitle}
          description={categoryDescription}
          action={
            categoryFormDefinition ? (
              <Button
                disabled={!canCreateRecord}
                onClick={() => startCreateRecord(selectedCategory.id, selectedHistorySectionId)}
                type="button"
              >
                <Plus className="size-4" aria-hidden="true" />
                Add
              </Button>
            ) : null
          }
          leading={
            <Button
              aria-label="Back to Records"
              className="size-10 rounded-full"
              size="icon"
              variant="outline"
              onClick={() => {
	                if (selectedHistorySectionId) {
	                  setRecordsLocation({ historySectionId: null, pageIndex: 0 })
	                  return
	                }
                resetToRecordIndex()
              }}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Button>
          }
        />

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
            <CardHeader>
              <CardTitle>{categoryTitle}</CardTitle>
              <CardDescription>
                {showingHistorySections
                  ? "Select a history section."
                  : `${selectedRows.length} ${selectedRows.length === 1 ? "record" : "records"} in this category.`}
              </CardDescription>
              <CardAction>
                <div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <CategoryIcon className="size-4" aria-hidden="true" />
                </div>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <SectionTable>
                {tableRows.length > 0 ? (
                  tableRows.map((row) => (
                    <SectionTableRow
                      disclosure
                      icon={CategoryIcon}
                      key={row.id}
                      subtitle={row.subtitle}
                      title={row.title}
                      trailing={<SemanticBadge context="Status" value={row.meta || "Record"} />}
                      onClick={() => {
	                        if (showingHistorySections) {
	                          setRecordsLocation({
	                            historySectionId: row.id.replace("history_section_", "") as HistorySectionId,
	                            pageIndex: 0,
	                            recordId: null,
	                            sourceId: null,
	                          })
	                          return
	                        }
	                        setRecordsLocation({ recordId: row.id, sourceId: null })
	                      }}
                    />
                  ))
                ) : (
                  <SectionTableRow
                    icon={CategoryIcon}
                    subtitle={selectedCategory.description}
                    title={`No ${selectedCategory.label.toLowerCase()} added`}
                  />
                )}
              </SectionTable>

              {!showingHistorySections ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPageIndex + 1} of {pageCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      disabled={currentPageIndex === 0}
                      size="sm"
                      variant="outline"
	                      onClick={() => setRecordsLocation({ pageIndex: Math.max(0, currentPageIndex - 1) })}
                    >
                      Previous
                    </Button>
                    <Button
                      disabled={currentPageIndex >= pageCount - 1}
                      size="sm"
                      variant="outline"
	                      onClick={() => setRecordsLocation({ pageIndex: Math.min(pageCount - 1, currentPageIndex + 1) })}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
            <CardHeader>
              <CardTitle>Sources</CardTitle>
              <CardDescription>Source artifacts linked to this category.</CardDescription>
            </CardHeader>
            <CardContent>
              <SectionTable>
                {sourceRows.length > 0 ? (
                  sourceRows.map((artifact) => (
                    <SectionTableRow
                      disclosure
                      icon={FileText}
                      key={artifact.id}
                      subtitle={readableToken(artifact.kind)}
                      title={artifact.title}
                      trailing={<SemanticBadge context="Freshness" value={readableToken(artifact.freshness)} />}
	                      onClick={() => setRecordsLocation({ sourceId: artifact.id })}
                    />
                  ))
                ) : (
                  <SectionTableRow icon={FileText} subtitle="No linked source artifacts for this category." title="No sources" />
                )}
              </SectionTable>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-7">
      <PageHeader
        title={summary.title}
        description="Connected sources and records in one lightweight view."
      />

      <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
        <CardHeader>
          <CardTitle>Records</CardTitle>
          <CardDescription>Select a category to review its records.</CardDescription>
          <CardAction>
            <div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <ClipboardList className="size-4" aria-hidden="true" />
            </div>
          </CardAction>
        </CardHeader>
        <CardContent>
          <SectionTable>
            {recordCategories.map((category) => {
              const Icon = category.icon
              const count = category.id === "demographics" && activePerson ? 1 : rowsByCategory[category.id].length

              return (
                <SectionTableRow
                  disclosure
                  icon={Icon}
                  key={category.id}
                  subtitle={category.description}
                  title={category.label}
                  trailing={
                    <SemanticBadge value={`${count} ${count === 1 ? "record" : "records"}`}>
                      {count} {count === 1 ? "record" : "records"}
                    </SemanticBadge>
                  }
	                  onClick={() => {
	                    setRecordsLocation({
	                      categoryId: category.id,
	                      historySectionId: null,
	                      pageIndex: 0,
	                      recordId: null,
	                      sourceId: null,
	                    })
	                  }}
                />
              )
            })}
          </SectionTable>
        </CardContent>
      </Card>
    </div>
  )
}

function MockPage({ page }: { page: Exclude<PageId, "health"> }) {
  const summary = pageSummaries[page]
  const Icon = summary.icon

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-7">
      <PageHeader title={summary.title} description={summary.description} />
      <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
        <CardHeader>
          <CardTitle>{summary.title} workspace</CardTitle>
          <CardDescription>Mock content scaffolded for the first HealthView OS prototype.</CardDescription>
          <CardAction>
            <div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <Icon className="size-4" aria-hidden="true" />
            </div>
          </CardAction>
        </CardHeader>
        <CardContent>
          <SectionTable>
            {(summary.rows ?? []).map((row) => (
              <SectionTableRow
                disclosure
                icon={Icon}
                key={row.title}
                subtitle={row.description}
                title={row.title}
                trailing={<SemanticBadge value={row.meta} />}
              />
            ))}
          </SectionTable>
        </CardContent>
      </Card>
    </div>
  )
}

export default App
