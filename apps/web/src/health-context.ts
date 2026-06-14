import type { HealthViewHealthContextReader } from "@healthviewos/agent/types"
import { buildHealthContextSummary } from "@healthviewos/workspace"
import { useWorkspaceStore } from "@/store/workspace"

export function createBrowserHealthContextReader(): HealthViewHealthContextReader {
  return () => buildHealthContextSummary(useWorkspaceStore.getState().workspace)
}
