import {
  exportWorkspaceJson as exportVaultWorkspaceJson,
  importWorkspaceJson as importVaultWorkspaceJson,
  loadWorkspace as loadVaultWorkspace,
  resetWorkspaceToSeed,
  saveWorkspace as saveVaultWorkspace,
} from "@healthviewos/browser-vault"
import type { HealthViewWorkspace } from "@healthviewos/schema"
import { create } from "zustand"

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

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  error: null,
  status: "idle",
  workspace: null,
  exportWorkspaceJson: () => exportVaultWorkspaceJson(),
  importWorkspaceJson: async (json) => {
    try {
      const workspace = await importVaultWorkspaceJson(json)
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
      const workspace = await loadVaultWorkspace()
      set({ error: null, status: "ready", workspace })
      return workspace
    } catch (error) {
      set({ error: errorMessage(error), status: "error", workspace: null })
      throw error
    }
  },
  resetWorkspace: async () => {
    try {
      const workspace = await resetWorkspaceToSeed()
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
      const savedWorkspace = await saveVaultWorkspace(workspace)
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
