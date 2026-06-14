import {
  exportWorkspaceJson as exportVaultWorkspaceJson,
  importWorkspaceJson as importVaultWorkspaceJson,
  loadWorkspace as loadVaultWorkspace,
  resetWorkspaceToSeed,
  saveWorkspace as saveVaultWorkspace,
} from "@healthviewos/browser-vault"
import type { HealthViewWorkspace } from "@healthviewos/schema"
import { parseWorkspace, seedWorkspace } from "@healthviewos/workspace"
import { create } from "zustand"
import { getEmbeddedHealthViewHostConfig } from "@/embed/host"

export type WorkspaceStatus = "idle" | "loading" | "ready" | "error"

type WorkspaceState = {
  error: string | null
  status: WorkspaceStatus
  workspace: HealthViewWorkspace | null
  exportWorkspaceJson: () => Promise<string>
  importWorkspaceJson: (json: string) => Promise<HealthViewWorkspace>
  loadWorkspace: () => Promise<HealthViewWorkspace>
  resetWorkspace: () => Promise<HealthViewWorkspace>
  saveWorkspace: (workspace: HealthViewWorkspace) => Promise<HealthViewWorkspace>
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected browser vault error."
}

function hasDesktopVault() {
  const host = getEmbeddedHealthViewHostConfig()
  return host?.client === "desktop" && host.capabilities.localVault
}

async function desktopInvoke<T>(command: string, args?: Record<string, unknown>) {
  const { invoke } = await import("@tauri-apps/api/core")
  return invoke<T>(command, args)
}

async function loadWorkspaceFromDesktop(): Promise<HealthViewWorkspace> {
  try {
    return parseWorkspace(await desktopInvoke<unknown>("load_workspace"))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!message.includes("No desktop workspace")) {
      throw error
    }

    return saveWorkspaceToDesktop(seedWorkspace())
  }
}

async function saveWorkspaceToDesktop(workspace: HealthViewWorkspace): Promise<HealthViewWorkspace> {
  return parseWorkspace(await desktopInvoke<unknown>("save_workspace", { workspace }))
}

async function resetDesktopWorkspace(): Promise<HealthViewWorkspace> {
  await desktopInvoke("reset_desktop_vault")
  return saveWorkspaceToDesktop(seedWorkspace())
}

async function loadWorkspaceForHost() {
  return hasDesktopVault() ? loadWorkspaceFromDesktop() : loadVaultWorkspace()
}

async function saveWorkspaceForHost(workspace: HealthViewWorkspace) {
  return hasDesktopVault() ? saveWorkspaceToDesktop(workspace) : saveVaultWorkspace(workspace)
}

async function resetWorkspaceForHost() {
  return hasDesktopVault() ? resetDesktopWorkspace() : resetWorkspaceToSeed()
}

async function exportWorkspaceJsonForHost() {
  if (!hasDesktopVault()) return exportVaultWorkspaceJson()
  return JSON.stringify(await loadWorkspaceFromDesktop(), null, 2)
}

async function importWorkspaceJsonForHost(json: string) {
  if (!hasDesktopVault()) return importVaultWorkspaceJson(json)

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(json)
  } catch (error) {
    throw new Error("Workspace import must be valid JSON.", { cause: error })
  }

  return saveWorkspaceToDesktop(parseWorkspace(parsedJson))
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  error: null,
  status: "idle",
  workspace: null,
  exportWorkspaceJson: () => exportWorkspaceJsonForHost(),
  importWorkspaceJson: async (json) => {
    try {
      const workspace = await importWorkspaceJsonForHost(json)
      set({ error: null, status: "ready", workspace })
      return workspace
    } catch (error) {
      set((state) => ({
        error: errorMessage(error),
        status: state.workspace ? "ready" : "error",
      }))
      throw error
    }
  },
  loadWorkspace: async () => {
    set({ error: null, status: "loading" })

    try {
      const workspace = await loadWorkspaceForHost()
      set({ error: null, status: "ready", workspace })
      return workspace
    } catch (error) {
      set({ error: errorMessage(error), status: "error", workspace: null })
      throw error
    }
  },
  resetWorkspace: async () => {
    try {
      const workspace = await resetWorkspaceForHost()
      set({ error: null, status: "ready", workspace })
      return workspace
    } catch (error) {
      set((state) => ({
        error: errorMessage(error),
        status: state.workspace ? "ready" : "error",
      }))
      throw error
    }
  },
  saveWorkspace: async (workspace) => {
    try {
      const savedWorkspace = await saveWorkspaceForHost(workspace)
      set({ error: null, status: "ready", workspace: savedWorkspace })
      return savedWorkspace
    } catch (error) {
      set((state) => ({
        error: errorMessage(error),
        status: state.workspace ? "ready" : "error",
      }))
      throw error
    }
  },
}))
