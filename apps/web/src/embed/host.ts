export type HealthViewEmbeddedHostCapabilities = {
  localVault?: boolean
  nativeFileImport?: boolean
}

export type HealthViewEmbeddedHostConfig = {
  capabilities: HealthViewEmbeddedHostCapabilities
  client: "desktop" | "mobile" | "web"
}

export type DesktopHealthViewHostOptions = {
  capabilities?: HealthViewEmbeddedHostCapabilities
}

declare global {
  interface Window {
    __HEALTHVIEW_EMBED_HOST__?: HealthViewEmbeddedHostConfig
  }
}

export function getEmbeddedHealthViewHostConfig(): HealthViewEmbeddedHostConfig | null {
  if (typeof window === "undefined") return null
  return window.__HEALTHVIEW_EMBED_HOST__ ?? null
}

export function installDesktopHealthViewHost(options: DesktopHealthViewHostOptions = {}) {
  if (typeof window === "undefined") return

  window.__HEALTHVIEW_EMBED_HOST__ = {
    capabilities: {
      localVault: options.capabilities?.localVault ?? true,
      nativeFileImport: options.capabilities?.nativeFileImport ?? false,
    },
    client: "desktop",
  }
}
