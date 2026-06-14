import { tool, type Tool } from "@openai/agents"
import { z } from "zod"
import type { HealthViewAppLocation, HealthViewControlClient } from "./control"
import {
  HealthViewAtlasControlInputSchema,
  healthViewHistorySectionIds,
  healthViewAtlasSystemIds,
  healthViewAtlasTargetTypes,
  healthViewAtlasZoomLevels,
  healthViewPageIds,
  healthViewRecordCategoryIds,
} from "./control"
import { healthViewToolPromptTemplates } from "./prompts"
import type {
  HealthViewAgentToolContext,
  HealthViewAgentToolResult,
  HealthViewHealthContextReader,
} from "./types"

export type { HealthViewControlClient } from "./control"

const healthViewAppLocationSchema = z.union([
  z.object({
    page: z.enum(["health", "billing", "settings"]),
  }),
  z.object({
    page: z.literal("services"),
    query: z.string().nullable().optional(),
    selectedResultId: z.string().nullable().optional(),
    tabId: z.string().nullable().optional(),
  }),
  z.object({
    categoryId: z.string().nullable().optional(),
    historySectionId: z.string().nullable().optional(),
    page: z.literal("records"),
    pageIndex: z.number().int().min(0).nullable().optional(),
    recordId: z.string().nullable().optional(),
    sourceId: z.string().nullable().optional(),
  }),
]) satisfies z.ZodType<HealthViewAppLocation>

const recordFieldsSchema = z.record(z.string().min(1), z.string())

export class HealthViewToolRegistry {
  private readonly tools = new Map<
    string,
    {
      enabled: boolean
      toOpenAITool(): Tool<HealthViewAgentToolContext>
    }
  >()

  register(toolDescriptor: {
    enabled: boolean
    name: string
    toOpenAITool(): Tool<HealthViewAgentToolContext>
  }) {
    if (this.tools.has(toolDescriptor.name)) {
      throw new Error(`Tool already registered: ${toolDescriptor.name}`)
    }

    this.tools.set(toolDescriptor.name, toolDescriptor)
  }

  enabledOpenAITools() {
    return Array.from(this.tools.values())
      .filter((item) => item.enabled)
      .map((item) => item.toOpenAITool())
  }
}

export function createDefaultHealthViewToolRegistry(options: {
  controlClient?: HealthViewControlClient
  healthContextReader?: HealthViewHealthContextReader
  healthDataAccessEnabled?: boolean
} = {}) {
  const registry = new HealthViewToolRegistry()

  registry.register({
    enabled: true,
    name: "get_app_context",
    toOpenAITool() {
      return tool({
        description: healthViewToolPromptTemplates.getAppContext,
        name: "get_app_context",
        parameters: z.object({}),
        async execute(_input, context): Promise<HealthViewAgentToolResult> {
          return {
            modelOutput: {
              threadId: context?.context.threadId,
              uiContext: context?.context.uiContext ?? null,
            },
            ok: true,
          }
        },
      })
    },
  })

  registry.register({
    enabled: Boolean(options.healthDataAccessEnabled && options.healthContextReader),
    name: "get_health_context",
    toOpenAITool() {
      return tool({
        description: healthViewToolPromptTemplates.getHealthContext,
        name: "get_health_context",
        parameters: z.object({}),
        async execute(): Promise<HealthViewAgentToolResult> {
          if (!options.healthContextReader) {
            return {
              error: "HealthView OS health context is unavailable in this context.",
              ok: false,
            }
          }

          return {
            modelOutput: {
              healthDataAccess: "enabled",
              source: "browser_local_workspace",
              summary: await options.healthContextReader(),
            },
            ok: true,
          }
        },
      })
    },
  })

  registry.register({
    enabled: Boolean(options.controlClient),
    name: "search_records",
    toOpenAITool() {
      return tool({
        description: healthViewToolPromptTemplates.searchRecords,
        name: "search_records",
        parameters: z.object({
          categoryId: z.enum(healthViewRecordCategoryIds).optional(),
          limit: z.number().int().min(1).max(20).optional(),
          query: z.string().optional(),
        }),
        async execute(input): Promise<HealthViewAgentToolResult> {
          if (!options.controlClient) {
            return {
              error: "HealthView OS records are unavailable in this context.",
              ok: false,
            }
          }

          const result = await options.controlClient.executeCommand({
            categoryId: input.categoryId,
            limit: input.limit,
            query: input.query,
            type: "records/search",
          })
          return result.ok ? { modelOutput: result.modelOutput ?? result, ok: true } : { error: result.error, ok: false }
        },
      })
    },
  })

  registry.register({
    enabled: Boolean(options.controlClient),
    name: "get_record",
    toOpenAITool() {
      return tool({
        description: healthViewToolPromptTemplates.getRecord,
        name: "get_record",
        parameters: z.object({
          recordId: z.string().min(1),
        }),
        async execute(input): Promise<HealthViewAgentToolResult> {
          if (!options.controlClient) {
            return {
              error: "HealthView OS records are unavailable in this context.",
              ok: false,
            }
          }

          const result = await options.controlClient.executeCommand({
            recordId: input.recordId,
            type: "records/get",
          })
          return result.ok ? { modelOutput: result.modelOutput ?? result, ok: true } : { error: result.error, ok: false }
        },
      })
    },
  })

  registry.register({
    enabled: Boolean(options.controlClient),
    name: "create_record",
    toOpenAITool() {
      return tool({
        description: healthViewToolPromptTemplates.createRecord,
        name: "create_record",
        parameters: z.object({
          categoryId: z.enum(healthViewRecordCategoryIds),
          fields: recordFieldsSchema,
          historySectionId: z.enum(healthViewHistorySectionIds).nullable().optional(),
        }),
        async execute(input): Promise<HealthViewAgentToolResult> {
          if (!options.controlClient) {
            return {
              error: "HealthView OS record editing is unavailable in this context.",
              ok: false,
            }
          }

          const result = await options.controlClient.executeCommand({
            categoryId: input.categoryId,
            fields: input.fields,
            historySectionId: input.historySectionId,
            type: "records/create",
          })
          return result.ok ? { modelOutput: result.modelOutput ?? result, ok: true } : { error: result.error, ok: false }
        },
      })
    },
  })

  registry.register({
    enabled: Boolean(options.controlClient),
    name: "update_record",
    toOpenAITool() {
      return tool({
        description: healthViewToolPromptTemplates.updateRecord,
        name: "update_record",
        parameters: z.object({
          fields: recordFieldsSchema,
          recordId: z.string().min(1),
        }),
        async execute(input): Promise<HealthViewAgentToolResult> {
          if (!options.controlClient) {
            return {
              error: "HealthView OS record editing is unavailable in this context.",
              ok: false,
            }
          }

          const result = await options.controlClient.executeCommand({
            fields: input.fields,
            recordId: input.recordId,
            type: "records/update",
          })
          return result.ok ? { modelOutput: result.modelOutput ?? result, ok: true } : { error: result.error, ok: false }
        },
      })
    },
  })

  registry.register({
    enabled: Boolean(options.controlClient),
    name: "search_atlas_targets",
    toOpenAITool() {
      return tool({
        description: healthViewToolPromptTemplates.searchAtlasTargets,
        name: "search_atlas_targets",
        parameters: z.object({
          limit: z.number().int().min(1).max(12).optional(),
          query: z.string().min(1),
          targetType: z.enum(healthViewAtlasTargetTypes).optional(),
        }),
        async execute(input): Promise<HealthViewAgentToolResult> {
          if (!options.controlClient) {
            return {
              error: "HealthView OS atlas search is unavailable in this context.",
              ok: false,
            }
          }

          const result = await options.controlClient.executeCommand({
            limit: input.limit,
            query: input.query,
            targetType: input.targetType,
            type: "atlas/searchTargets",
          })
          return result.ok ? { modelOutput: result.modelOutput ?? result, ok: true } : { error: result.error, ok: false }
        },
      })
    },
  })

  registry.register({
    enabled: Boolean(options.controlClient),
    name: "control_atlas_view",
    toOpenAITool() {
      return tool({
        description: healthViewToolPromptTemplates.controlAtlasView,
        name: "control_atlas_view",
        parameters: HealthViewAtlasControlInputSchema.extend({
          systemId: z.enum(healthViewAtlasSystemIds).nullable().optional(),
          zoom: z.enum(healthViewAtlasZoomLevels).optional(),
        }),
        async execute(input): Promise<HealthViewAgentToolResult> {
          if (!options.controlClient) {
            return {
              error: "HealthView OS atlas control is unavailable in this context.",
              ok: false,
            }
          }

          const result = await options.controlClient.executeCommand({
            ...input,
            type: "atlas/control",
          })
          return result.ok ? { modelOutput: result.modelOutput ?? result, ok: true } : { error: result.error, ok: false }
        },
      })
    },
  })

  registry.register({
    enabled: Boolean(options.controlClient),
    name: "navigate",
    toOpenAITool() {
      return tool({
        description: healthViewToolPromptTemplates.navigate,
        name: "navigate",
        parameters: z.object({
          location: healthViewAppLocationSchema,
        }),
        async execute(input): Promise<HealthViewAgentToolResult> {
          if (!options.controlClient) {
            return {
              error: "HealthView OS UI control is unavailable in this context.",
              ok: false,
            }
          }

          const result = await options.controlClient.executeCommand({
            location: input.location,
            type: "ui/navigate",
          })
          return result.ok ? { modelOutput: result.modelOutput ?? result, ok: true } : { error: result.error, ok: false }
        },
      })
    },
  })

  registry.register({
    enabled: Boolean(options.controlClient),
    name: "search_app",
    toOpenAITool() {
      return tool({
        description: healthViewToolPromptTemplates.searchApp,
        name: "search_app",
        parameters: z.object({
          limit: z.number().int().min(1).max(10).optional(),
          query: z.string().min(1),
        }),
        async execute(input): Promise<HealthViewAgentToolResult> {
          if (!options.controlClient) {
            return {
              error: "HealthView OS UI control is unavailable in this context.",
              ok: false,
            }
          }

          const result = await options.controlClient.executeCommand({
            limit: input.limit,
            query: input.query,
            type: "ui/search",
          })
          return result.ok ? { modelOutput: result.modelOutput ?? result, ok: true } : { error: result.error, ok: false }
        },
      })
    },
  })

  registry.register({
    enabled: Boolean(options.controlClient),
    name: "run_ui_action",
    toOpenAITool() {
      return tool({
        description: healthViewToolPromptTemplates.runUiAction,
        name: "run_ui_action",
        parameters: z.object({
          actionId: z.string().min(1),
        }),
        async execute(input): Promise<HealthViewAgentToolResult> {
          if (!options.controlClient) {
            return {
              error: "HealthView OS UI control is unavailable in this context.",
              ok: false,
            }
          }

          const result = await options.controlClient.executeCommand({
            actionId: input.actionId,
            type: "ui/runAction",
          })
          return result.ok ? { modelOutput: result.modelOutput ?? result, ok: true } : { error: result.error, ok: false }
        },
      })
    },
  })

  registry.register({
    enabled: Boolean(options.controlClient),
    name: "search_services",
    toOpenAITool() {
      return tool({
        description: healthViewToolPromptTemplates.searchServices,
        name: "search_services",
        parameters: z.object({
          limit: z.number().int().min(1).max(10).optional(),
          query: z.string().optional(),
          tabId: z.enum(["nearby", "providers", "facilities", "labs", "pharmacy", "online", "saved"]).optional(),
        }),
        async execute(input): Promise<HealthViewAgentToolResult> {
          if (!options.controlClient) {
            return {
              error: "HealthView OS Services control is unavailable in this context.",
              ok: false,
            }
          }

          const result = await options.controlClient.executeCommand({
            limit: input.limit,
            query: input.query,
            tabId: input.tabId,
            type: "services/search",
          })
          return result.ok ? { modelOutput: result.modelOutput ?? result, ok: true } : { error: result.error, ok: false }
        },
      })
    },
  })

  registry.register({
    enabled: Boolean(options.controlClient),
    name: "select_service_result",
    toOpenAITool() {
      return tool({
        description: healthViewToolPromptTemplates.selectServiceResult,
        name: "select_service_result",
        parameters: z.object({
          resultId: z.string().min(1),
        }),
        async execute(input): Promise<HealthViewAgentToolResult> {
          if (!options.controlClient) {
            return {
              error: "HealthView OS Services control is unavailable in this context.",
              ok: false,
            }
          }

          const result = await options.controlClient.executeCommand({
            resultId: input.resultId,
            type: "services/selectResult",
          })
          return result.ok ? { modelOutput: result.modelOutput ?? result, ok: true } : { error: result.error, ok: false }
        },
      })
    },
  })

  registry.register({
    enabled: Boolean(options.controlClient),
    name: "open_page",
    toOpenAITool() {
      return tool({
        description: healthViewToolPromptTemplates.openPage,
        name: "open_page",
        parameters: z.object({
          pageId: z.enum(healthViewPageIds),
        }),
        async execute(input): Promise<HealthViewAgentToolResult> {
          if (!options.controlClient) {
            return {
              error: "HealthView OS UI control is unavailable in this context.",
              ok: false,
            }
          }

          const result = await options.controlClient.executeCommand({
            location: { page: input.pageId },
            type: "ui/navigate",
          })
          return result.ok ? { modelOutput: result.modelOutput ?? result, ok: true } : { error: result.error, ok: false }
        },
      })
    },
  })

  registry.register({
    enabled: Boolean(options.controlClient),
    name: "set_chat_open",
    toOpenAITool() {
      return tool({
        description: healthViewToolPromptTemplates.setChatOpen,
        name: "set_chat_open",
        parameters: z.object({
          open: z.boolean(),
        }),
        async execute(input): Promise<HealthViewAgentToolResult> {
          if (!options.controlClient) {
            return {
              error: "HealthView OS UI control is unavailable in this context.",
              ok: false,
            }
          }

          const result = await options.controlClient.executeCommand({
            open: input.open,
            type: "ui/setChatOpen",
          })
          return result.ok ? { modelOutput: result, ok: true } : { error: result.error, ok: false }
        },
      })
    },
  })

  return registry
}
