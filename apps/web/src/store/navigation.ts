import { create } from "zustand"

export type PageId = "health" | "services" | "records" | "billing" | "settings"

type NavigationState = {
  activePage: PageId
  sidebarCollapsed: boolean
  setActivePage: (page: PageId) => void
  toggleSidebar: () => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activePage: "health",
  sidebarCollapsed: false,
  setActivePage: (page) => set({ activePage: page }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}))
