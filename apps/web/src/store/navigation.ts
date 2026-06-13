import { create } from "zustand"

export type PageId = "health" | "services" | "records" | "billing" | "settings"

type NavigationState = {
  activePage: PageId
  setActivePage: (page: PageId) => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activePage: "health",
  setActivePage: (page) => set({ activePage: page }),
}))
