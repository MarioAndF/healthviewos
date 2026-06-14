import OpenAI from "openai"
import {
  Agent,
  OpenAIProvider,
  Runner,
  extractAllTextOutput,
  setTracingDisabled,
  type ModelSettings,
} from "@openai/agents"
import { buildHealthViewAgentInstructions } from "./prompts"
import { missingProviderMessage } from "./provider"
import { HealthViewAgentSession } from "./session"
import type { HealthViewControlClient } from "./control"
import {
  createDefaultHealthViewToolRegistry,
  type HealthViewToolRegistry,
} from "./tools"
import type {
  HealthViewAgentEvent,
  HealthViewAgentLocalStore,
  HealthViewAgentMessage,
  HealthViewAgentProviderConfig,
  HealthViewAgentRunInput,
  HealthViewAgentRunResult,
  HealthViewAgentToolContext,
  HealthViewHealthContextReader,
} from "./types"

export type HealthViewAgentRuntimeOptions = {
  controlClient?: HealthViewControlClient
  healthContextReader?: HealthViewHealthContextReader
  healthDataAccessEnabled?: boolean
  providerConfig: HealthViewAgentProviderConfig
  store: HealthViewAgentLocalStore
  tools?: HealthViewToolRegistry
}

export class HealthViewAgentRuntime {
  private readonly options: HealthViewAgentRuntimeOptions
  private readonly tools: HealthViewToolRegistry

  constructor(options: HealthViewAgentRuntimeOptions) {
    this.options = options
    this.tools =
      options.tools ??
      createDefaultHealthViewToolRegistry({
        controlClient: options.controlClient,
        healthContextReader: options.healthContextReader,
        healthDataAccessEnabled: options.healthDataAccessEnabled,
      })
    setTracingDisabled(true)
  }

  async listMessages(threadId?: string) {
    const thread = threadId ? { id: threadId } : await this.options.store.getOrCreateActiveThread()
    return this.options.store.listMessages(thread.id)
  }

  async getOrCreateActiveThread() {
    return this.options.store.getOrCreateActiveThread()
  }

  async *run(
    input: HealthViewAgentRunInput,
  ): AsyncIterable<HealthViewAgentEvent | HealthViewAgentRunResult> {
    const text = input.text.trim()
    if (!text) {
      yield { message: "Enter a message before sending.", type: "error" }
      return
    }

    const thread = input.threadId
      ? await this.ensureThread(input.threadId)
      : await this.options.store.getOrCreateActiveThread()
    yield { thread, type: "thread" }

    const userMessage = await this.options.store.appendMessage({
      role: "user",
      text,
      threadId: thread.id,
    })
    yield { message: userMessage, type: "user_message" }

    if (!this.options.providerConfig.configured) {
      yield {
        message: missingProviderMessage(this.options.providerConfig.provider),
        type: "error",
      }
      return
    }

    yield {
      message: `Thinking with ${
        this.options.providerConfig.label ?? this.options.providerConfig.provider
      } (${this.options.providerConfig.model})`,
      type: "status",
    }

    try {
      const assistantText = await this.runProvider({
        text,
        threadId: thread.id,
        uiContext: input.uiContext,
      })
      const assistantMessage = await this.options.store.appendMessage({
        role: "assistant",
        text: assistantText,
        threadId: thread.id,
      })

      yield { message: assistantMessage, type: "assistant_message" }
      yield { assistantMessage, thread }
    } catch (error) {
      yield {
        message: error instanceof Error ? error.message : "Unable to run the HealthView assistant.",
        type: "error",
      }
    }
  }

  private async ensureThread(threadId: string) {
    await this.options.store.getOrCreateActiveThread()
    return {
      createdAt: new Date().toISOString(),
      id: threadId,
      title: "HealthView chat",
      updatedAt: new Date().toISOString(),
    }
  }

  private async runProvider(input: {
    text: string
    threadId: string
    uiContext?: HealthViewAgentRunInput["uiContext"]
  }) {
    const providerConfig = this.options.providerConfig
    if (!providerConfig.apiKey) {
      throw new Error(missingProviderMessage(providerConfig.provider))
    }

    const openAIClient = new OpenAI({
      apiKey: providerConfig.apiKey,
      baseURL: providerConfig.baseURL,
      dangerouslyAllowBrowser: true,
      fetch: providerConfig.fetch,
    })
    const runner = new Runner({
      modelProvider: new OpenAIProvider({
        openAIClient,
        useResponses: providerConfig.useResponses ?? providerConfig.provider === "openai",
      }),
      modelSettings: this.modelSettingsForProvider(),
      traceIncludeSensitiveData: false,
      tracingDisabled: true,
      workflowName: `HealthView OS assistant (${providerConfig.provider})`,
    })
    const agent = new Agent<HealthViewAgentToolContext>({
      instructions: buildHealthViewAgentInstructions({
        healthDataAccessEnabled: Boolean(this.options.healthDataAccessEnabled && this.options.healthContextReader),
        uiContext: input.uiContext,
      }),
      model: providerConfig.model,
      name: "HealthView OS",
      tools: this.tools.enabledOpenAITools(),
    })
    const session = new HealthViewAgentSession(input.threadId, this.options.store)

    const result = await runner.run(agent, input.text, {
      context: {
        threadId: input.threadId,
        uiContext: input.uiContext,
      },
      maxTurns: 4,
      session,
    })

    const output = (
      typeof result.finalOutput === "string" ? result.finalOutput : extractAllTextOutput(result.newItems)
    ).trim()
    return output || "I could not produce a response."
  }

  private modelSettingsForProvider(): ModelSettings {
    if (this.options.providerConfig.provider === "openai") {
      return {
        reasoning: { effort: "low" },
        text: { verbosity: "low" },
      } as ModelSettings
    }

    return {
      temperature: 0.2,
    }
  }
}

export type HealthViewAgentClientOptions = HealthViewAgentRuntimeOptions

export class HealthViewAgentClient {
  private readonly runtime: HealthViewAgentRuntime

  constructor(options: HealthViewAgentClientOptions) {
    this.runtime = new HealthViewAgentRuntime(options)
  }

  listMessages(threadId?: string): Promise<HealthViewAgentMessage[]> {
    return this.runtime.listMessages(threadId)
  }

  getOrCreateActiveThread() {
    return this.runtime.getOrCreateActiveThread()
  }

  run(input: HealthViewAgentRunInput) {
    return this.runtime.run(input)
  }
}
