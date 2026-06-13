import { tool, type Tool } from "@openai/agents"
import { z } from "zod"
import type { HealthViewControlClient } from "./control"
import { healthViewPageIds } from "./control"
import type { HealthViewAgentToolContext, HealthViewAgentToolResult } from "./types"

export type { HealthViewControlClient } from "./control"

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
} = {}) {
  const registry = new HealthViewToolRegistry()

  registry.register({
    enabled: true,
    name: "get_app_context",
    toOpenAITool() {
      return tool({
        description:
          "Return safe HealthView OS UI context. This does not include local health records, source documents, billing data, or extracted health data.",
        name: "get_app_context",
        parameters: z.object({}),
        async execute(_input, context): Promise<HealthViewAgentToolResult> {
          return {
            modelOutput: {
              healthDataAccess: "disabled_in_v1",
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
    enabled: Boolean(options.controlClient),
    name: "open_page",
    toOpenAITool() {
      return tool({
        description:
          "Open a top-level HealthView OS page in the visible app UI. This is navigation only and does not read health records.",
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
            pageId: input.pageId,
            type: "ui/openPage",
          })
          return result.ok ? { modelOutput: result, ok: true } : { error: result.error, ok: false }
        },
      })
    },
  })

  registry.register({
    enabled: Boolean(options.controlClient),
    name: "set_chat_open",
    toOpenAITool() {
      return tool({
        description: "Open or close the HealthView OS chat panel in the visible app UI.",
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
