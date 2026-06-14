import { create } from "zustand"
import type { HealthViewAppLocation } from "@healthviewos/agent/control"

export type PageId = "health" | "services" | "records" | "billing" | "settings"

export type RecordsLocationState = Extract<HealthViewAppLocation, { page: "records" }>
export type ServicesLocationState = Extract<HealthViewAppLocation, { page: "services" }>

type NavigationState = {
  activePage: PageId
  location: HealthViewAppLocation
  sidebarCollapsed: boolean
  navigate: (location: HealthViewAppLocation) => void
  setRecordsLocation: (updates: Partial<Omit<RecordsLocationState, "page">>) => void
  setActivePage: (page: PageId) => void
  toggleSidebar: () => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activePage: "health",
  location: { page: "health" },
  navigate: (location) => set({ activePage: location.page, location }),
  sidebarCollapsed: false,
  setActivePage: (page) => set({ activePage: page, location: { page } }),
  setRecordsLocation: (updates) =>
    set((state) => {
      const current: RecordsLocationState = state.location.page === "records" ? state.location : { page: "records" }
      const next: RecordsLocationState = {
        ...current,
        ...updates,
        page: "records",
      }

      return {
        activePage: "records",
        location: next,
      }
    }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}))
