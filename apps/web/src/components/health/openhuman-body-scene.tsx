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
import { Pause, Play, RotateCcw } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { HealthMapSignal, Person } from "@healthviewos/schema"
import type { HealthViewAtlasViewControl } from "@/store/atlas-view"

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
const LATERAL_ORBIT_RADIANS_PER_SECOND = Math.PI / 12

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
  atlasControl?: HealthViewAtlasViewControl
  selectedSignal: HealthMapSignal | null
}

interface AnimatedSystem {
  opacity: number
  systemId: AtlasSystemId
}

type AtlasCameraViewState = {
  focalOffset: [number, number, number]
  position: [number, number, number]
  target: [number, number, number]
  zoom: number
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

function isSmplxSystemId(systemId: string | null | undefined): systemId is "smplx-female" | "smplx-male" {
  return systemId === "smplx-female" || systemId === "smplx-male"
}

function zoomDistanceFor(zoom: HealthViewAtlasViewControl["zoom"]) {
  if (zoom === "close") return 0.9
  if (zoom === "medium") return 0.35
  return 0
}

function frameDistanceMultiplierFor(zoom: HealthViewAtlasViewControl["zoom"]) {
  if (zoom === "close") return 1.12
  if (zoom === "medium") return 1.35
  return 1.7
}

function smplxRegionViewStateFor(regionIds: string[], zoom: HealthViewAtlasViewControl["zoom"]): AtlasCameraViewState {
  const normalized = regionIds.join(" ").toLowerCase()
  const side = /\b(left|l)\b|-l\b/.test(normalized) ? -1 : /\b(right|r)\b|-r\b/.test(normalized) ? 1 : 0
  const lateralReach = /hand|digits-of-hand|palmar|dorsum|wrist/.test(normalized)
    ? 0.48
    : /arm|forearm|elbow|deltoid|shoulder/.test(normalized)
      ? 0.34
      : /thigh|knee|leg|ankle|foot|heel|digits-of-foot/.test(normalized)
        ? 0.2
        : 0.24
  const x = side * lateralReach
  const y = /head|auricular|frontal|mouth|orbital|concha|helix|tragus|cheek|buccal/.test(normalized)
    ? 1.58
    : /neck|carotid/.test(normalized)
      ? 1.34
      : /thorax|mammary|scapular|pectoral|clavicular|subclavian|interscapular/.test(normalized)
        ? 1.14
        : /abdomen|abdominal|epigastric|hypochondriac|hypogastric|umbilical|lumbar/.test(normalized)
          ? 0.93
          : /hip|inguinal|gluteal|pelvis|pubic|anal/.test(normalized)
            ? 0.7
            : /thigh|femoral/.test(normalized)
              ? 0.44
              : /knee/.test(normalized)
                ? 0.22
                : /leg|calf/.test(normalized)
                  ? 0
                  : /ankle|foot|heel|digits-of-foot|hallucial|malleola/.test(normalized)
                    ? -0.32
                    : /shoulder|deltoid|arm/.test(normalized)
                      ? 1.02
                      : /elbow|cubital/.test(normalized)
                        ? 0.78
                        : /forearm/.test(normalized)
                          ? 0.63
                          : /wrist|hand|digits-of-hand|palmar|dorsum/.test(normalized)
                            ? 0.48
                            : 0.86
  const distance = zoom === "close" ? 1.05 : zoom === "medium" ? 1.55 : 2.15

  return {
    focalOffset: [0, 0, 0],
    position: [x, y, distance],
    target: [x, y, 0],
    zoom: 1,
  }
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

export function OpenHumanBodyScene({ activePerson, atlasControl, selectedSignal }: OpenHumanBodySceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<AtlasViewerHandle | null>(null)
  const gestureScaleRef = useRef(1)
  const orbitFrameRef = useRef<number | null>(null)
  const orbitTimestampRef = useRef<number | null>(null)
  const handledAtlasCommandIdRef = useRef(0)
  const defaultBodySystemId = useMemo(() => resolveBodySystemId(activePerson), [activePerson])
  const bodySystemId = isSmplxSystemId(atlasControl?.systemId) ? atlasControl.systemId : defaultBodySystemId
  const controlledOverlaySystemId = atlasControl?.systemId && !isSmplxSystemId(atlasControl.systemId)
    ? atlasControl.systemId
    : null
  const overlaySystemId = controlledOverlaySystemId ?? (selectedSignal ? healthViewSystemToAtlasSystem[selectedSignal.bodySystem] : null)
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
  const [orbiting, setOrbiting] = useState(false)
  const [focusObjectSignal, setFocusObjectSignal] = useState(0)
  const [reframeViewSignal, setReframeViewSignal] = useState(0)
  const [resetViewSignal, setResetViewSignal] = useState(0)
  const selectedObjectIds = useMemo(() => {
    if (!atlasControl?.objectIds.length) return undefined
    return new Set(atlasControl.objectIds)
  }, [atlasControl])
  const defaultFrameDistanceMultiplier = frameDistanceMultiplierFor(atlasControl?.zoom ?? "default")

  useEffect(() => installHealthViewAtlasAssetResolver(), [])

  const handleMountedSystemIdsChange = useCallback((systemIds: string[]) => {
    setMountedSystemIds(new Set(systemIds))
  }, [])

  const handleRendererInitError = useCallback((errorMessage: string | null) => {
    setRendererError(errorMessage)
  }, [])

  const loading = Array.from(targetSystemIds).some((systemId) => !mountedSystemIds.has(systemId))

  useEffect(() => {
    if (!atlasControl || atlasControl.commandId === 0 || rendererError) {
      return
    }

    if ((atlasControl.action === "focus" || atlasControl.action === "show_system") && loading) {
      return
    }

    const commandId = atlasControl.commandId
    if (handledAtlasCommandIdRef.current === commandId) {
      return
    }

    let cancelled = false
    const animationFrame = window.requestAnimationFrame(() => {
      if (cancelled || handledAtlasCommandIdRef.current === commandId) {
        return
      }
      handledAtlasCommandIdRef.current = commandId

      if (atlasControl.action === "reset") {
        setOrbiting(false)
        setResetViewSignal((signal) => signal + 1)
        return
      }

      if (atlasControl.action === "orbit") {
        setOrbiting(atlasControl.orbiting ?? true)
        return
      }

      if (atlasControl.action === "show_system") {
        setOrbiting(false)
        setReframeViewSignal((signal) => signal + 1)
        return
      }

      if (atlasControl.regionIds.length > 0) {
        setOrbiting(false)
        viewerRef.current?.setViewState(smplxRegionViewStateFor(atlasControl.regionIds, atlasControl.zoom), {
          animate: atlasControl.animate,
        })
        return
      }

      setOrbiting(false)
      if (atlasControl.objectIds.length > 0) {
        setFocusObjectSignal((signal) => signal + 1)
      } else {
        setReframeViewSignal((signal) => signal + 1)
      }

      const zoomDistance = zoomDistanceFor(atlasControl.zoom)
      if (zoomDistance > 0) {
        window.setTimeout(() => {
          viewerRef.current?.zoomCameraBy(zoomDistance, { animate: atlasControl.animate })
        }, 180)
      }
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(animationFrame)
    }
  }, [atlasControl, loading, rendererError])

  useEffect(() => {
    if (!orbiting || rendererError) {
      if (orbitFrameRef.current !== null) {
        window.cancelAnimationFrame(orbitFrameRef.current)
        orbitFrameRef.current = null
      }
      orbitTimestampRef.current = null
      return
    }

    const tick = (now: number) => {
      const previousTimestamp = orbitTimestampRef.current ?? now
      const deltaSeconds = Math.min(Math.max((now - previousTimestamp) / 1000, 0), 1 / 20)
      orbitTimestampRef.current = now

      if (deltaSeconds > 0) {
        viewerRef.current?.orbitCameraBy(LATERAL_ORBIT_RADIANS_PER_SECOND * deltaSeconds, 0, { animate: false })
      }

      orbitFrameRef.current = window.requestAnimationFrame(tick)
    }

    orbitFrameRef.current = window.requestAnimationFrame(tick)
    return () => {
      if (orbitFrameRef.current !== null) {
        window.cancelAnimationFrame(orbitFrameRef.current)
        orbitFrameRef.current = null
      }
      orbitTimestampRef.current = null
    }
  }, [orbiting, rendererError])

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
        viewerRef.current?.zoomCameraBy(scaleDelta * 8, { animate: false })
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

  const handleResetView = useCallback(() => {
    setOrbiting(false)
    setResetViewSignal((signal) => signal + 1)
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
          defaultFrameDistanceMultiplier={defaultFrameDistanceMultiplier}
          focusObjectSignal={focusObjectSignal}
          hiddenObjectIds={EMPTY_OBJECT_IDS}
          lightingPreset="top"
          onMountedSystemIdsChange={handleMountedSystemIdsChange}
          onRendererInitError={handleRendererInitError}
          performanceProfile={PERFORMANCE_PROFILE}
          ref={viewerRef}
          resetViewSignal={resetViewSignal}
          reframeViewSignal={reframeViewSignal}
          sceneBackgroundEnabled
          selectedObjectId={null}
          selectedObjectIds={selectedObjectIds}
          systems={viewerSystems}
          transparentBackground={false}
        />
      )}
      <div className="absolute left-4 top-4 z-20">
        <button
          aria-label={orbiting ? "Pause orbit animation" : "Play orbit animation"}
          aria-pressed={orbiting}
          className="flex size-10 items-center justify-center rounded-full border border-white/70 bg-background/85 text-foreground shadow-[0_12px_28px_rgba(15,23,42,0.16)] backdrop-blur transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
          disabled={Boolean(rendererError)}
          onClick={() => setOrbiting((current) => !current)}
          onPointerDown={(event) => event.stopPropagation()}
          title={orbiting ? "Pause orbit" : "Play orbit"}
          type="button"
        >
          {orbiting ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
        </button>
      </div>
      <div className="absolute right-4 top-4 z-20">
        <button
          aria-label="Reset 3D map view"
          className="flex size-10 items-center justify-center rounded-full border border-white/70 bg-background/85 text-foreground shadow-[0_12px_28px_rgba(15,23,42,0.16)] backdrop-blur transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
          disabled={Boolean(rendererError)}
          onClick={handleResetView}
          onPointerDown={(event) => event.stopPropagation()}
          title="Reset view"
          type="button"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
        </button>
      </div>
      {loading && !rendererError ? (
        <div aria-label="Loading 3D body map" className="healthview-openhuman-scene__loader" role="status">
          <span className="healthview-openhuman-scene__spinner" />
        </div>
      ) : null}
    </div>
  )
}
