import { create } from "zustand"
import type {
  HealthViewAtlasControlAction,
  HealthViewAtlasSystemId,
  HealthViewAtlasTargetType,
  HealthViewAtlasZoomLevel,
} from "@healthviewos/agent/control"

export type HealthViewAtlasViewControl = {
  action: HealthViewAtlasControlAction
  animate: boolean
  commandId: number
  objectIds: string[]
  orbiting?: boolean
  regionIds: string[]
  systemId: HealthViewAtlasSystemId | null
  targetLabel: string | null
  targetType: HealthViewAtlasTargetType | null
  zoom: HealthViewAtlasZoomLevel
}

type AtlasViewState = {
  control: HealthViewAtlasViewControl
  selectedHealthSignalId: string | null
  applyControl: (control: Omit<HealthViewAtlasViewControl, "commandId">) => void
  reset: () => void
  selectHealthSignal: (signalId: string | null) => void
  setOrbiting: (orbiting: boolean) => void
}

const defaultControl: HealthViewAtlasViewControl = {
  action: "reset",
  animate: true,
  commandId: 0,
  objectIds: [],
  regionIds: [],
  systemId: null,
  targetLabel: null,
  targetType: null,
  zoom: "default",
}

export const useAtlasViewStore = create<AtlasViewState>((set) => ({
  control: defaultControl,
  selectedHealthSignalId: null,
  applyControl: (control) =>
    set((state) => ({
      control: {
        ...control,
        commandId: state.control.commandId + 1,
      },
      selectedHealthSignalId: control.systemId ? null : state.selectedHealthSignalId,
    })),
  reset: () =>
    set((state) => ({
      control: {
        ...defaultControl,
        commandId: state.control.commandId + 1,
      },
      selectedHealthSignalId: null,
    })),
  selectHealthSignal: (signalId) =>
    set((state) => ({
      control: {
        ...defaultControl,
        action: signalId ? "show_system" : "reset",
        commandId: state.control.commandId + 1,
      },
      selectedHealthSignalId: signalId,
    })),
  setOrbiting: (orbiting) =>
    set((state) => ({
      control: {
        ...state.control,
        action: "orbit",
        commandId: state.control.commandId + 1,
        orbiting,
      },
    })),
}))
