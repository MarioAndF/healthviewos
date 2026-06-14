import { useEffect, useLayoutEffect, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import {
  healthViewPageIds,
  parseHealthViewControlCommands,
  type HealthViewControlCommand,
} from "@healthviewos/agent/control"
import {
  EmbeddedHealthViewApp,
  installDesktopHealthViewHost,
} from "../../web/src/embed"
import { useNavigationStore } from "../../web/src/store/navigation"
import { useWorkspaceStore } from "../../web/src/store/workspace"

type NativeTitlebarMetrics = {
  topInset: number
}

type DesktopVaultInfo = {
  appDataDir: string
  databasePath: string
  filesDir: string
  vaultDir: string
}

type DesktopControlRequest = {
  commands?: unknown
  id: string
  operation: "execute" | "preview" | "state"
}

installDesktopHealthViewHost({
  capabilities: {
    localVault: true,
    nativeFileImport: false,
  },
})

export function App() {
  const [vaultInfo, setVaultInfo] = useState<DesktopVaultInfo | null>(null)

  useLayoutEffect(() => {
    const isMacDesktop = /mac/i.test(navigator.platform)
    if (!isMacDesktop) return

    const root = document.documentElement
    root.dataset.healthviewDesktopPlatform = "macos"
    let disposed = false

    void invoke<NativeTitlebarMetrics>("get_native_titlebar_metrics_command")
      .then((metrics) => {
        if (disposed) return
        root.style.setProperty(
          "--healthview-desktop-titlebar-inset",
          `${Math.max(0, Math.round(metrics.topInset))}px`,
        )
      })
      .catch((error) => {
        if (!disposed) console.error("[desktop:titlebar] failed to read metrics", error)
      })

    return () => {
      disposed = true
      delete root.dataset.healthviewDesktopPlatform
      root.style.removeProperty("--healthview-desktop-titlebar-inset")
    }
  }, [])

  useEffect(() => {
    let disposed = false

    void invoke<DesktopVaultInfo>("get_desktop_vault_info")
      .then((info) => {
        if (!disposed) setVaultInfo(info)
      })
      .catch((error) => {
        if (!disposed) console.error("[desktop:vault] failed to resolve local vault", error)
      })

    return () => {
      disposed = true
    }
  }, [])

  useEffect(() => {
    const openExternalUrl = async (url: string) => {
      try {
        await invoke("open_external", { url })
      } catch (error) {
        console.error("[desktop:navigation] failed to open external url", { error, url })
      }
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const target = event.target
      if (!(target instanceof Element)) return

      const anchor = target.closest("a[href]")
      if (!(anchor instanceof HTMLAnchorElement)) return

      const rawHref = anchor.getAttribute("href")?.trim()
      if (!rawHref || rawHref.startsWith("#")) return

      let resolvedUrl: URL
      try {
        resolvedUrl = new URL(anchor.href, window.location.href)
      } catch {
        return
      }

      const shouldOpenExternally =
        anchor.target === "_blank" || resolvedUrl.origin !== window.location.origin
      if (!shouldOpenExternally) return

      event.preventDefault()
      void openExternalUrl(resolvedUrl.toString())
    }

    const originalWindowOpen = window.open.bind(window)
    window.open = ((url, target, features) => {
      if (typeof url === "string") {
        try {
          const resolvedUrl = new URL(url, window.location.href)
          if (resolvedUrl.protocol === "http:" || resolvedUrl.protocol === "https:") {
            void openExternalUrl(resolvedUrl.toString())
            return null
          }
        } catch {
          // Fall through to the original browser implementation.
        }
      }

      return originalWindowOpen(url, target, features)
    }) as typeof window.open

    document.addEventListener("click", handleDocumentClick)

    return () => {
      window.open = originalWindowOpen
      document.removeEventListener("click", handleDocumentClick)
    }
  }, [])

  useEffect(() => {
    let disposed = false
    let cleanup: (() => void) | undefined

    void listen<DesktopControlRequest>("healthview-control-request", (event) => {
      void (async () => {
        if (disposed) return

        const request = event.payload
        let response: unknown
        try {
          if (request.operation === "state") {
            response = {
              message: "Current HealthView OS control state.",
              modelOutput: { state: currentControlState() },
              ok: true,
            }
          } else if (request.operation === "preview") {
            const commands = parseHealthViewControlCommands(request.commands)
            response = {
              message:
                commands.length === 1
                  ? `Prepared ${commands[0]?.type}.`
                  : `Prepared ${commands.length} HealthView OS control commands.`,
              modelOutput: { state: currentControlState() },
              ok: true,
            }
          } else {
            const commands = parseHealthViewControlCommands(request.commands)
            response = executeControlCommands(commands)
          }
        } catch (error) {
          response = {
            error: error instanceof Error ? error.message : "Unable to run HealthView OS control command.",
            ok: false,
          }
        }

        await invoke("complete_control_request", {
          input: {
            id: request.id,
            response,
          },
        })
      })()
    }).then((unlisten) => {
      if (disposed) {
        unlisten()
      } else {
        cleanup = unlisten
      }
    }).catch((error) => {
      console.error("[desktop:control] failed to start bridge listener", error)
    })

    return () => {
      disposed = true
      cleanup?.()
    }
  }, [])

  return (
    <div className="healthview-desktop-shell" data-vault-ready={Boolean(vaultInfo)}>
      <EmbeddedHealthViewApp />
    </div>
  )
}

function currentControlState() {
  const navigation = useNavigationStore.getState()
  return {
    activePage: navigation.activePage,
    assistantOpen: false,
    location: navigation.location,
    workspaceLoaded: Boolean(useWorkspaceStore.getState().workspace),
  }
}

function executeControlCommands(commands: HealthViewControlCommand[]) {
  const navigation = useNavigationStore.getState()
  let message = "No command executed."

  for (const command of commands) {
    if (command.type === "ui/openPage") {
      navigation.navigate({ page: command.pageId })
      message = `Opened ${command.pageId}.`
    } else if (command.type === "ui/navigate") {
      navigation.navigate(command.location)
      message = `Opened ${command.location.page}.`
    } else if (command.type === "ui/setChatOpen") {
      message = command.open ? "Opened chat." : "Closed chat."
    } else if (command.type === "services/search") {
      navigation.navigate({
        page: "services",
        query: command.query ?? "",
        selectedResultId: null,
        tabId: command.tabId ?? null,
      })
      message = command.query ? `Searched services for ${command.query}.` : "Opened services."
    } else if (command.type === "services/selectResult") {
      navigation.navigate({
        page: "services",
        selectedResultId: command.resultId,
      })
      message = `Opened service ${command.resultId}.`
    } else if (command.type === "ui/search") {
      const query = command.query.trim().toLowerCase()
      const results = healthViewPageIds
        .filter((page) => page.includes(query) || query.includes(page))
        .slice(0, command.limit ?? 6)
        .map((page, index) => ({
          actionId: `open_${page}`,
          description: `Open ${page}.`,
          id: `search_${page}`,
          kind: "navigation",
          label: `Open ${page}`,
          risk: "navigation",
          score: 1 - index * 0.05,
        }))
      return {
        message: results.length ? `Found ${results.length} matching actions.` : "No matching actions found.",
        modelOutput: { query: command.query, results, state: currentControlState() },
        ok: true,
      }
    } else if (command.type === "ui/runAction") {
      return {
        error: `Unknown UI action: ${command.actionId}`,
        ok: false,
      }
    }
  }

  return {
    message,
    modelOutput: { state: currentControlState() },
    ok: true,
  }
}
