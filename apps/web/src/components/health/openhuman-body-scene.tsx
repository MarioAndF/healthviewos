import {
  ATLAS_DEFAULT_EFFECT_SETTINGS,
  DEFAULT_ATLAS_TEXTURE_QUALITY,
  OPENHUMAN_ATLAS_ASSET_DEFAULT_BASE_PATH,
  AtlasViewer,
  atlasRuntimeManifest,
  createAtlasPerformanceProfile,
  getRuntimeSystemBundlePath,
  getRuntimeSystemTextureManifestPath,
  resolveOpenHumanAtlasAssetUrl,
  type AtlasSystemId,
  type AtlasViewerHandle,
  type AtlasViewerSystem,
} from "@medhuelabs/openhuman-viewer"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { HealthMapSignal, Person } from "@healthviewos/schema"

const ATLAS_ASSET_BASE_PATH = OPENHUMAN_ATLAS_ASSET_DEFAULT_BASE_PATH
const ATLAS_ASSET_BASE_URL = import.meta.env.VITE_OPENHUMAN_ATLAS_ASSET_BASE_URL?.trim() ?? ""
const ATLAS_ASSET_VERSION = encodeURIComponent(atlasRuntimeManifest.version)
const EMPTY_OBJECT_IDS = new Set<string>()
const PERFORMANCE_PROFILE = createAtlasPerformanceProfile()
const HEALTHVIEW_EFFECT_SETTINGS = {
  ...ATLAS_DEFAULT_EFFECT_SETTINGS,
  aoEnabled: false,
  environmentIntensity: 1,
  groundPlaneEnabled: false,
  shadowsEnabled: false,
  vignetteEnabled: false,
}
const FADE_DURATION_MS = 280
const BODY_OVERLAY_OPACITY = 0.16

const healthViewSystemToAtlasSystem = {
  skin: null,
  skeletal: "skeletal",
  muscular: "muscular",
  cardiovascular: "cardiovascular",
  nervous: "nervous",
  respiratory: "respiratory",
  digestive: "digestive",
  urinary: "urinary",
  endocrine: "endocrine",
  reproductive: "reproductive",
  immune: null,
  metabolic: "endocrine",
  recovery: "muscular",
  other: null,
} satisfies Record<HealthMapSignal["bodySystem"], AtlasSystemId | null>

interface OpenHumanBodySceneProps {
  activePerson?: Person
  selectedSignal: HealthMapSignal | null
}

interface AnimatedSystem {
  opacity: number
  systemId: AtlasSystemId
}

function resolveBodySystemId(activePerson?: Person): AtlasSystemId {
  if (activePerson?.sexAtBirth === "male") {
    return "smplx-male"
  }

  if (!activePerson?.sexAtBirth && activePerson?.administrativeGender === "male") {
    return "smplx-male"
  }

  return "smplx-female"
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function useAnimatedSystems(bodySystemId: AtlasSystemId, overlaySystemId: AtlasSystemId | null) {
  const [systems, setSystems] = useState<AnimatedSystem[]>(() => [
    { systemId: bodySystemId, opacity: overlaySystemId ? BODY_OVERLAY_OPACITY : 1 },
    ...(overlaySystemId ? [{ systemId: overlaySystemId, opacity: 1 }] : []),
  ])
  const systemsRef = useRef(systems)

  useEffect(() => {
    systemsRef.current = systems
  }, [systems])

  useEffect(() => {
    const startedAt = performance.now()
    const startingOpacities = new Map(systemsRef.current.map((system) => [system.systemId, system.opacity]))
    const targetOpacities = new Map<AtlasSystemId, number>([
      [bodySystemId, overlaySystemId ? BODY_OVERLAY_OPACITY : 1],
    ])

    if (overlaySystemId) {
      targetOpacities.set(overlaySystemId, 1)
    }

    let animationFrame = 0

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / FADE_DURATION_MS, 1)
      const easedProgress = easeInOut(progress)
      const systemIds = new Set<AtlasSystemId>([...startingOpacities.keys(), ...targetOpacities.keys()])
      const nextSystems: AnimatedSystem[] = []

      for (const systemId of systemIds) {
        const from = startingOpacities.get(systemId) ?? 0
        const to = targetOpacities.get(systemId) ?? 0
        const opacity = from + (to - from) * easedProgress

        if (systemId === bodySystemId || targetOpacities.has(systemId) || opacity > 0.01) {
          nextSystems.push({ systemId, opacity })
        }
      }

      setSystems(nextSystems)

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(tick)
        return
      }

      setSystems(Array.from(targetOpacities.entries()).map(([systemId, opacity]) => ({ systemId, opacity })))
    }

    animationFrame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [bodySystemId, overlaySystemId])

  return systems
}

function withAtlasAssetVersion(url: string | null): string | null {
  if (!url || /[?&]v=/.test(url)) {
    return url
  }

  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}v=${ATLAS_ASSET_VERSION}`
}

function resolveHealthViewAtlasAssetUrl(sourceUrl: string): string {
  const trimmedSourceUrl = String(sourceUrl ?? "").trim()
  if (!trimmedSourceUrl) {
    return trimmedSourceUrl
  }

  if (ATLAS_ASSET_BASE_URL) {
    return resolveOpenHumanAtlasAssetUrl(trimmedSourceUrl, {
      baseUrl: ATLAS_ASSET_BASE_URL,
    })
  }

  if (trimmedSourceUrl.startsWith("/openhuman/atlas/")) {
    return withAtlasAssetVersion(trimmedSourceUrl) ?? trimmedSourceUrl
  }

  if (trimmedSourceUrl.startsWith("/atlas/")) {
    return withAtlasAssetVersion(`${ATLAS_ASSET_BASE_PATH}/${trimmedSourceUrl.slice("/atlas/".length)}`) ?? trimmedSourceUrl
  }

  if (trimmedSourceUrl.startsWith("assets/runtime/")) {
    const parts = trimmedSourceUrl.split("/")
    const assetName = parts[parts.length - 1]
    return assetName ? (withAtlasAssetVersion(`${ATLAS_ASSET_BASE_PATH}/${assetName}`) ?? trimmedSourceUrl) : trimmedSourceUrl
  }

  return trimmedSourceUrl
}

function installHealthViewAtlasAssetResolver(): () => void {
  const healthViewWindow = window as Window & {
    __OPENHUMAN_DESKTOP_SHELL__?: {
      atlasAssets?: {
        resolveAssetUrl?: (sourceUrl: string) => { resolvedUrl: string }
      }
    }
  }
  const previousShell = healthViewWindow.__OPENHUMAN_DESKTOP_SHELL__
  const previousAtlasAssets = previousShell?.atlasAssets
  const previousResolver = previousAtlasAssets?.resolveAssetUrl

  healthViewWindow.__OPENHUMAN_DESKTOP_SHELL__ = {
    ...previousShell,
    atlasAssets: {
      ...previousAtlasAssets,
      resolveAssetUrl: (sourceUrl: string) => {
        const previousResolution = previousResolver?.(sourceUrl)?.resolvedUrl
        return {
          resolvedUrl: resolveHealthViewAtlasAssetUrl(previousResolution ?? sourceUrl),
        }
      },
    },
  }

  return () => {
    if (!previousShell) {
      delete healthViewWindow.__OPENHUMAN_DESKTOP_SHELL__
      return
    }

    healthViewWindow.__OPENHUMAN_DESKTOP_SHELL__ = {
      ...previousShell,
      atlasAssets: previousAtlasAssets,
    }
  }
}

function createViewerSystem(system: AnimatedSystem): AtlasViewerSystem | null {
  const sourceBundleUrl = getRuntimeSystemBundlePath(system.systemId, {
    basePath: ATLAS_ASSET_BASE_PATH,
  })
  const bundleUrl = sourceBundleUrl ? resolveHealthViewAtlasAssetUrl(sourceBundleUrl) : null

  if (!bundleUrl) {
    return null
  }

  const sourceTextureManifestUrl = getRuntimeSystemTextureManifestPath(system.systemId, {
    basePath: ATLAS_ASSET_BASE_PATH,
  })

  return {
    bundleUrl,
    opacity: system.opacity,
    opacityBlending: null,
    opacityMaterialMode: null,
    opacityTint: null,
    systemId: system.systemId,
    textureManifestUrl: sourceTextureManifestUrl ? resolveHealthViewAtlasAssetUrl(sourceTextureManifestUrl) : null,
    textureQuality: DEFAULT_ATLAS_TEXTURE_QUALITY,
    visible: true,
  }
}

export function OpenHumanBodyScene({ activePerson, selectedSignal }: OpenHumanBodySceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<AtlasViewerHandle | null>(null)
  const gestureScaleRef = useRef(1)
  const bodySystemId = useMemo(() => resolveBodySystemId(activePerson), [activePerson])
  const overlaySystemId = selectedSignal ? healthViewSystemToAtlasSystem[selectedSignal.bodySystem] : null
  const animatedSystems = useAnimatedSystems(bodySystemId, overlaySystemId)
  const viewerSystems = useMemo(
    () => animatedSystems.map(createViewerSystem).filter((system): system is AtlasViewerSystem => Boolean(system)),
    [animatedSystems],
  )
  const expectedSystemIds = useMemo(() => new Set(viewerSystems.map((system) => system.systemId)), [viewerSystems])
  const targetSystemIds = useMemo(
    () => new Set<AtlasSystemId>([bodySystemId, ...(overlaySystemId ? [overlaySystemId] : [])]),
    [bodySystemId, overlaySystemId],
  )
  const [mountedSystemIds, setMountedSystemIds] = useState<Set<string>>(() => new Set())
  const [rendererError, setRendererError] = useState<string | null>(null)

  useEffect(() => installHealthViewAtlasAssetResolver(), [])

  const handleMountedSystemIdsChange = useCallback((systemIds: string[]) => {
    setMountedSystemIds(new Set(systemIds))
  }, [])

  const handleRendererInitError = useCallback((errorMessage: string | null) => {
    setRendererError(errorMessage)
  }, [])

  const loading = Array.from(targetSystemIds).some((systemId) => !mountedSystemIds.has(systemId))

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const handleGestureStart = (event: Event) => {
      event.preventDefault()
      gestureScaleRef.current = 1
    }

    const handleGestureChange = (event: Event) => {
      const gestureEvent = event as Event & { scale?: number }
      const scale = typeof gestureEvent.scale === "number" && Number.isFinite(gestureEvent.scale)
        ? gestureEvent.scale
        : 1
      const scaleDelta = scale - gestureScaleRef.current
      gestureScaleRef.current = scale

      event.preventDefault()
      if (Math.abs(scaleDelta) > 0.001) {
        viewerRef.current?.zoomCameraBy(-scaleDelta * 8, { animate: false })
      }
    }

    const handleGestureEnd = (event: Event) => {
      event.preventDefault()
      gestureScaleRef.current = 1
    }

    const listenerOptions = { passive: false } as AddEventListenerOptions
    container.addEventListener("gesturestart", handleGestureStart, listenerOptions)
    container.addEventListener("gesturechange", handleGestureChange, listenerOptions)
    container.addEventListener("gestureend", handleGestureEnd, listenerOptions)

    return () => {
      container.removeEventListener("gesturestart", handleGestureStart, listenerOptions)
      container.removeEventListener("gesturechange", handleGestureChange, listenerOptions)
      container.removeEventListener("gestureend", handleGestureEnd, listenerOptions)
    }
  }, [])

  return (
    <div ref={containerRef} className="healthview-openhuman-scene" aria-label="Human body 3D health map">
      {rendererError ? (
        <div className="healthview-openhuman-scene__status" role="alert">
          3D body map unavailable.
        </div>
      ) : (
        <AtlasViewer
          bodyPosition="anatomical"
          className="healthview-openhuman-scene__viewer"
          colorScheme="light"
          effectSettings={HEALTHVIEW_EFFECT_SETTINGS}
          expectedVisibleSystemCount={expectedSystemIds.size}
          hiddenObjectIds={EMPTY_OBJECT_IDS}
          lightingPreset="top"
          onMountedSystemIdsChange={handleMountedSystemIdsChange}
          onRendererInitError={handleRendererInitError}
          performanceProfile={PERFORMANCE_PROFILE}
          ref={viewerRef}
          sceneBackgroundEnabled
          selectedObjectId={null}
          systems={viewerSystems}
          transparentBackground={false}
        />
      )}
      {loading && !rendererError ? (
        <div aria-label="Loading 3D body map" className="healthview-openhuman-scene__loader" role="status">
          <span className="healthview-openhuman-scene__spinner" />
        </div>
      ) : null}
    </div>
  )
}
