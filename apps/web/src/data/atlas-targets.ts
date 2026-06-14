import {
  atlasIndexData,
  atlasRuntimeManifest,
} from "@medhuelabs/openhuman-viewer"
import {
  healthViewAtlasSystemIds,
  type HealthViewAtlasSearchTargetSummary,
  type HealthViewAtlasSystemId,
  type HealthViewAtlasTargetType,
} from "@healthviewos/agent/control"

import smplxNeutralRegionsRaw from "../../../../assets/exports/metadata/smplx/smplx-neutral-regions.json?raw"

type AtlasIndexEntity = {
  displayName?: string
  hasRuntimeObject?: boolean
  id: string
  primaryObjectName?: string
  systemIds?: string[]
}

type SmplxRegionManifest = {
  blendMaterials?: Array<{
    name?: string
    oh_region_label?: string | null
    oh_region_slug?: string | null
  }>
}

const atlasSystemIdSet = new Set<string>(healthViewAtlasSystemIds)
const smplxRegionManifest = JSON.parse(smplxNeutralRegionsRaw) as SmplxRegionManifest

function titleCase(value: string) {
  return value.replace(/\b[a-z]/g, (character) => character.toUpperCase())
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[_/-]+/g, " ")
    .replace(/[^a-z0-9.\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function systemLabel(systemId: HealthViewAtlasSystemId) {
  const manifestSystem = atlasRuntimeManifest.systems?.find((system) => system.id === systemId)
  return manifestSystem?.label ?? titleCase(systemId.replace(/^smplx-/, "SMPL-X "))
}

function labelForSmplxRegionName(name: string, fallback?: string | null) {
  if (fallback?.trim()) return fallback.trim()

  return titleCase(
    name
      .replace(/^SMPLX_region__\d+_/, "")
      .replace(/-[lr]$/, (side) => (side === "-l" ? " left" : " right"))
      .replace(/-/g, " "),
  )
}

function scoreTarget(target: HealthViewAtlasSearchTargetSummary, query: string) {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return 0

  const haystack = normalizeSearchText(
    [
      target.id,
      target.label,
      target.targetType,
      target.systemId,
      target.objectIds?.join(" "),
      target.regionIds?.join(" "),
    ]
      .filter(Boolean)
      .join(" "),
  )
  if (!haystack) return 0

  let score = 0
  if (haystack === normalizedQuery) score += 120
  if (normalizeSearchText(target.label) === normalizedQuery) score += 80
  if (haystack.includes(normalizedQuery)) score += 45
  if (target.id === normalizedQuery.replace(/\s+/g, "-")) score += 30
  if (target.focusable) score += 8

  for (const term of normalizedQuery.split(" ").filter(Boolean)) {
    if (haystack.includes(term)) score += term.length > 3 ? 12 : 5
  }

  return score
}

function createSystemTargets(): HealthViewAtlasSearchTargetSummary[] {
  return healthViewAtlasSystemIds.map((systemId) => ({
    focusable: true,
    id: systemId,
    label: systemLabel(systemId),
    score: 0,
    systemId,
    targetType: "system",
  }))
}

function createOrganTargets(): HealthViewAtlasSearchTargetSummary[] {
  const seen = new Set<string>()
  const entities = (atlasIndexData.entities ?? []) as AtlasIndexEntity[]
  const targets: HealthViewAtlasSearchTargetSummary[] = []

  for (const entity of entities) {
    const systemId = entity.systemIds?.find((candidate): candidate is HealthViewAtlasSystemId =>
      atlasSystemIdSet.has(candidate),
    )
    if (!systemId || !entity.displayName || seen.has(entity.id)) continue
    seen.add(entity.id)

    const objectId = entity.hasRuntimeObject ? entity.primaryObjectName ?? entity.id : undefined
    targets.push({
      focusable: Boolean(objectId),
      id: entity.id,
      label: entity.displayName,
      objectIds: objectId ? [objectId] : undefined,
      score: 0,
      systemId,
      targetType: "organ",
    })
  }

  return targets
}

function createSmplxRegionTargets(): HealthViewAtlasSearchTargetSummary[] {
  return (smplxRegionManifest.blendMaterials ?? [])
    .map((region) => region.name?.trim())
    .filter((name): name is string => Boolean(name))
    .map((name) => ({
      focusable: true,
      id: name,
      label: labelForSmplxRegionName(
        name,
        smplxRegionManifest.blendMaterials?.find((region) => region.name === name)?.oh_region_label,
      ),
      regionIds: [name],
      score: 0,
      systemId: null,
      targetType: "smplx_region",
    }))
}

const atlasTargets: HealthViewAtlasSearchTargetSummary[] = [
  ...createSystemTargets(),
  ...createOrganTargets(),
  ...createSmplxRegionTargets(),
]

export function findAtlasTargetById(targetId: string) {
  return atlasTargets.find((target) => target.id === targetId || target.objectIds?.includes(targetId) || target.regionIds?.includes(targetId))
}

export function searchAtlasTargets(input: {
  limit?: number
  query: string
  targetType?: HealthViewAtlasTargetType
}) {
  const limit = input.limit ?? 8

  return atlasTargets
    .filter((target) => !input.targetType || target.targetType === input.targetType)
    .map((target) => ({
      ...target,
      score: scoreTarget(target, input.query),
    }))
    .filter((target) => target.score > 0)
    .sort((first, second) => second.score - first.score || first.label.localeCompare(second.label))
    .slice(0, limit)
}
