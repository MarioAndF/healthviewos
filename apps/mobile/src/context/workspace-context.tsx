import "expo-sqlite/localStorage/install";

import {
  createHealthViewAppStore,
  executeHealthViewAppControlCommand,
  selectAssistantUiContext,
  type HealthViewAppStore,
  type HealthViewAssistantUiContext,
} from "@healthviewos/app-state";
import type { MainDestinationId } from "@healthviewos/app-model";
import type {
  HealthViewControlCommand,
  HealthViewControlResponse,
} from "@healthviewos/agent/control";
import type { HealthViewWorkspace } from "@healthviewos/schema";
import {
  createLocalStorageWorkspaceClient,
  type WorkspaceViewModels,
} from "@healthviewos/workspace";
import { router, type Href } from "expo-router";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

type WorkspaceContextValue = {
  activePage: MainDestinationId;
  assistantOpen: boolean;
  assistantUiContext: HealthViewAssistantUiContext;
  controlClient: {
    executeCommand(command: HealthViewControlCommand): Promise<HealthViewControlResponse>;
  };
  error: string | null;
  loading: boolean;
  openDestination: (destinationId: MainDestinationId, options?: { navigate?: boolean }) => void;
  reloadWorkspace: () => Promise<void>;
  resetWorkspace: () => Promise<HealthViewWorkspace | null>;
  setAssistantOpen: (open: boolean) => void;
  views: WorkspaceViewModels | null;
  workspace: HealthViewWorkspace | null;
};

const WorkspaceContext = createContext<HealthViewAppStore | null>(null);

function destinationHref(destinationId: MainDestinationId) {
  return `/${destinationId}` as Href;
}

function hrefForCommand(command: HealthViewControlCommand) {
  if (command.type === "ui/openPage") return destinationHref(command.pageId);
  if (command.type === "ui/navigate") return destinationHref(command.location.page);
  if (command.type === "services/search" || command.type === "services/selectResult") {
    return destinationHref("services");
  }
  return null;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const store = useMemo(
    () =>
      createHealthViewAppStore({
        workspaceClient: createLocalStorageWorkspaceClient("healthviewos.mobile.workspace"),
      }),
    [],
  );

  useEffect(() => {
    void store.getState().actions.initializeWorkspace();
  }, [store]);

  return <WorkspaceContext.Provider value={store}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }

  const state = useSyncExternalStore(context.subscribe, context.getState, context.getState);
  const { actions } = state;
  const openDestination = useCallback(
    (destinationId: MainDestinationId, options: { navigate?: boolean } = {}) => {
      actions.navigate({ page: destinationId });
      if (options.navigate !== false) {
        router.navigate(destinationHref(destinationId));
      }
    },
    [actions],
  );
  const controlClient = useMemo(
    () => ({
      async executeCommand(command: HealthViewControlCommand) {
        const response = await executeHealthViewAppControlCommand(context, command);
        const href = response.ok ? hrefForCommand(command) : null;
        if (href) router.navigate(href);
        return response;
      },
    }),
    [context],
  );

  return {
    activePage: state.activePage,
    assistantOpen: state.assistantOpen,
    assistantUiContext: selectAssistantUiContext(state),
    controlClient,
    error: state.error,
    loading: state.loading,
    openDestination,
    reloadWorkspace: actions.reloadWorkspace,
    resetWorkspace: actions.resetWorkspace,
    setAssistantOpen: actions.setAssistantOpen,
    views: state.views,
    workspace: state.workspace,
  };
}
