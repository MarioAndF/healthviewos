import { buildHealthViewVoiceInstructions, healthViewToolPromptTemplates } from "@healthviewos/agent/prompts"
import {
  healthViewAtlasControlActions,
  healthViewAtlasSystemIds,
  healthViewAtlasTargetTypes,
  healthViewAtlasZoomLevels,
  healthViewHistorySectionIds,
  healthViewPageIds,
  healthViewRecordCategoryIds,
  type HealthViewAppLocation,
  type HealthViewAtlasControlAction,
  type HealthViewAtlasSystemId,
  type HealthViewAtlasTargetType,
  type HealthViewAtlasZoomLevel,
  type HealthViewControlClient,
} from "@healthviewos/agent/control"
import type { HealthViewHealthContextReader, HealthViewUiContext } from "@healthviewos/agent/types"
import { createXaiVoiceClientSecret } from "./agent"

const XAI_REALTIME_URL = "wss://api.x.ai/v1/realtime"
const XAI_VOICE_MODEL = "grok-voice-latest"
const XAI_VOICE = "ara"
const VOICE_SAMPLE_RATE = 24_000
const INPUT_BUFFER_SIZE = 2048
const BARGE_IN_RMS_THRESHOLD = 0.012
const BARGE_IN_CONSECUTIVE_FRAMES = 2
const END_VOICE_CHAT_DELAY_MS = 1200

const healthViewAppLocationJsonSchema = {
  anyOf: [
    {
      additionalProperties: false,
      properties: {
        page: {
          enum: ["health", "services", "billing", "settings"],
          type: "string",
        },
      },
      required: ["page"],
      type: "object",
    },
    {
      additionalProperties: false,
      properties: {
        categoryId: {
          type: ["string", "null"],
        },
        historySectionId: {
          type: ["string", "null"],
        },
        page: {
          const: "records",
          type: "string",
        },
        pageIndex: {
          minimum: 0,
          type: ["integer", "null"],
        },
        recordId: {
          type: ["string", "null"],
        },
        sourceId: {
          type: ["string", "null"],
        },
      },
      required: ["page"],
      type: "object",
    },
  ],
}

const healthViewAtlasControlInputJsonSchema = {
  additionalProperties: false,
  properties: {
    action: {
      enum: healthViewAtlasControlActions,
      type: "string",
    },
    animate: {
      type: "boolean",
    },
    objectIds: {
      items: {
        type: "string",
      },
      type: "array",
    },
    orbiting: {
      type: "boolean",
    },
    regionIds: {
      items: {
        type: "string",
      },
      type: "array",
    },
    systemId: {
      enum: [...healthViewAtlasSystemIds, null],
    },
    targetId: {
      type: ["string", "null"],
    },
    targetLabel: {
      type: ["string", "null"],
    },
    targetType: {
      enum: [...healthViewAtlasTargetTypes, null],
    },
    zoom: {
      enum: healthViewAtlasZoomLevels,
      type: "string",
    },
  },
  required: ["action"],
  type: "object",
}

export type HealthViewVoiceStatus = "connecting" | "listening" | "speaking" | "closed"

export type HealthViewVoiceLevelUpdate = {
  level: number
  rms: number
}

type HealthViewVoiceSessionOptions = {
  controlClient?: HealthViewControlClient
  healthContextReader?: HealthViewHealthContextReader
  healthDataAccessEnabled?: boolean
  onError?: (error: Error) => void
  onInputLevel?: (update: HealthViewVoiceLevelUpdate) => void
  onStatus?: (status: HealthViewVoiceStatus) => void
  onTranscript?: (update: HealthViewVoiceTranscriptUpdate) => void
  uiContext?: HealthViewUiContext | null
}

type RealtimeEvent = {
  arguments?: string
  call_id?: string
  delta?: string
  error?: { message?: string }
  name?: string
  response?: {
    id?: string
    output?: Array<{ content?: Array<{ transcript?: string }> }>
  }
  response_id?: string
  transcript?: string
  type?: string
}

export type HealthViewVoiceTranscriptUpdate = {
  final?: boolean
  mode: "append" | "replace"
  role: "assistant" | "user"
  text: string
}

export type HealthViewVoiceSession = {
  stop: () => void
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ""
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return window.btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = window.atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function floatToPcm16(input: Float32Array) {
  const output = new Int16Array(input.length)
  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index] ?? 0))
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return new Uint8Array(output.buffer)
}

function decodePcm16(bytes: Uint8Array) {
  const samples = new Float32Array(bytes.byteLength / 2)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  for (let offset = 0; offset < bytes.byteLength; offset += 2) {
    samples[offset / 2] = view.getInt16(offset, true) / 0x8000
  }
  return samples
}

function rmsForChannel(channel: Float32Array) {
  let total = 0
  for (let index = 0; index < channel.length; index += 1) {
    const sample = channel[index] ?? 0
    total += sample * sample
  }
  return Math.sqrt(total / channel.length)
}

function voiceLevelForRms(rms: number) {
  return Math.max(0, Math.min(1, (rms - 0.004) / 0.085))
}

function websocketProtocolForClientSecret(value: string) {
  return value.startsWith("xai-client-secret.") ? value : `xai-client-secret.${value}`
}

function xaiRealtimeUrl() {
  const url = new URL(XAI_REALTIME_URL)
  url.searchParams.set("model", XAI_VOICE_MODEL)
  return url.toString()
}

function voiceInstructions(input: {
  healthDataAccessEnabled?: boolean
  uiContext?: HealthViewUiContext | null
}) {
  return buildHealthViewVoiceInstructions(input)
}

function isHealthViewAppLocation(value: unknown): value is HealthViewAppLocation {
  if (!value || typeof value !== "object") return false

  const location = value as Record<string, unknown>
  if (location.page === "records") {
    return (
      (location.categoryId === undefined || location.categoryId === null || typeof location.categoryId === "string") &&
      (location.historySectionId === undefined || location.historySectionId === null || typeof location.historySectionId === "string") &&
      (location.recordId === undefined || location.recordId === null || typeof location.recordId === "string") &&
      (location.sourceId === undefined || location.sourceId === null || typeof location.sourceId === "string") &&
      (location.pageIndex === undefined ||
        location.pageIndex === null ||
        (Number.isInteger(location.pageIndex) && Number(location.pageIndex) >= 0))
    )
  }

  return (
    typeof location.page === "string" &&
    healthViewPageIds.includes(location.page as never) &&
    location.page !== "records"
  )
}

function isHealthViewAtlasSystemId(value: unknown): value is HealthViewAtlasSystemId {
  return typeof value === "string" && healthViewAtlasSystemIds.includes(value as HealthViewAtlasSystemId)
}

function isHealthViewAtlasTargetType(value: unknown): value is HealthViewAtlasTargetType {
  return typeof value === "string" && healthViewAtlasTargetTypes.includes(value as HealthViewAtlasTargetType)
}

function isHealthViewAtlasZoomLevel(value: unknown): value is HealthViewAtlasZoomLevel {
  return typeof value === "string" && healthViewAtlasZoomLevels.includes(value as HealthViewAtlasZoomLevel)
}

function isHealthViewAtlasControlAction(value: unknown): value is HealthViewAtlasControlAction {
  return typeof value === "string" && healthViewAtlasControlActions.includes(value as HealthViewAtlasControlAction)
}

function isHealthViewRecordCategoryId(value: unknown): value is (typeof healthViewRecordCategoryIds)[number] {
  return typeof value === "string" && healthViewRecordCategoryIds.includes(value as never)
}

function isHealthViewHistorySectionId(value: unknown): value is (typeof healthViewHistorySectionIds)[number] {
  return typeof value === "string" && healthViewHistorySectionIds.includes(value as never)
}

function stringRecord(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined
  const entries = Object.entries(value)
  if (!entries.every(([key, item]) => key.trim() && typeof item === "string")) return undefined
  return Object.fromEntries(entries) as Record<string, string>
}

function stringArray(value: unknown): string[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) return undefined
  return value.every((item) => typeof item === "string" && item.trim()) ? value : undefined
}

function voiceTools(options: {
  healthContextReader?: HealthViewHealthContextReader
  healthDataAccessEnabled?: boolean
}) {
  const tools: Array<Record<string, unknown>> = [
    {
      description: healthViewToolPromptTemplates.getAppContext,
      name: "get_app_context",
      parameters: {
        additionalProperties: false,
        properties: {},
        type: "object",
      },
      type: "function",
    },
  ]

  if (options.healthDataAccessEnabled && options.healthContextReader) {
    tools.push({
      description: healthViewToolPromptTemplates.getHealthContext,
      name: "get_health_context",
      parameters: {
        additionalProperties: false,
        properties: {},
        type: "object",
      },
      type: "function",
    })
  }

  tools.push(
    {
      description: healthViewToolPromptTemplates.searchRecords,
      name: "search_records",
      parameters: {
        additionalProperties: false,
        properties: {
          categoryId: {
            enum: healthViewRecordCategoryIds,
            type: "string",
          },
          limit: {
            maximum: 20,
            minimum: 1,
            type: "integer",
          },
          query: {
            type: "string",
          },
        },
        type: "object",
      },
      type: "function",
    },
    {
      description: healthViewToolPromptTemplates.getRecord,
      name: "get_record",
      parameters: {
        additionalProperties: false,
        properties: {
          recordId: {
            type: "string",
          },
        },
        required: ["recordId"],
        type: "object",
      },
      type: "function",
    },
    {
      description: healthViewToolPromptTemplates.createRecord,
      name: "create_record",
      parameters: {
        additionalProperties: false,
        properties: {
          categoryId: {
            enum: healthViewRecordCategoryIds,
            type: "string",
          },
          fields: {
            additionalProperties: {
              type: "string",
            },
            type: "object",
          },
          historySectionId: {
            enum: healthViewHistorySectionIds,
            type: "string",
          },
        },
        required: ["categoryId", "fields"],
        type: "object",
      },
      type: "function",
    },
    {
      description: healthViewToolPromptTemplates.updateRecord,
      name: "update_record",
      parameters: {
        additionalProperties: false,
        properties: {
          fields: {
            additionalProperties: {
              type: "string",
            },
            type: "object",
          },
          recordId: {
            type: "string",
          },
        },
        required: ["recordId", "fields"],
        type: "object",
      },
      type: "function",
    },
    {
      description: healthViewToolPromptTemplates.searchAtlasTargets,
      name: "search_atlas_targets",
      parameters: {
        additionalProperties: false,
        properties: {
          limit: {
            maximum: 12,
            minimum: 1,
            type: "integer",
          },
          query: {
            type: "string",
          },
          targetType: {
            enum: healthViewAtlasTargetTypes,
            type: "string",
          },
        },
        required: ["query"],
        type: "object",
      },
      type: "function",
    },
    {
      description: healthViewToolPromptTemplates.controlAtlasView,
      name: "control_atlas_view",
      parameters: healthViewAtlasControlInputJsonSchema,
      type: "function",
    },
    {
      description: healthViewToolPromptTemplates.navigate,
      name: "navigate",
      parameters: {
        additionalProperties: false,
        properties: {
          location: healthViewAppLocationJsonSchema,
        },
        required: ["location"],
        type: "object",
      },
      type: "function",
    },
    {
      description: healthViewToolPromptTemplates.searchApp,
      name: "search_app",
      parameters: {
        additionalProperties: false,
        properties: {
          limit: {
            maximum: 10,
            minimum: 1,
            type: "integer",
          },
          query: {
            type: "string",
          },
        },
        required: ["query"],
        type: "object",
      },
      type: "function",
    },
    {
      description: healthViewToolPromptTemplates.runUiAction,
      name: "run_ui_action",
      parameters: {
        additionalProperties: false,
        properties: {
          actionId: {
            type: "string",
          },
        },
        required: ["actionId"],
        type: "object",
      },
      type: "function",
    },
    {
      description: healthViewToolPromptTemplates.openPage,
      name: "open_page",
      parameters: {
        additionalProperties: false,
        properties: {
          pageId: {
            enum: healthViewPageIds,
            type: "string",
          },
        },
        required: ["pageId"],
        type: "object",
      },
      type: "function",
    },
    {
      description: healthViewToolPromptTemplates.setChatOpen,
      name: "set_chat_open",
      parameters: {
        additionalProperties: false,
        properties: {
          open: {
            type: "boolean",
          },
        },
        required: ["open"],
        type: "object",
      },
      type: "function",
    },
    {
      description: healthViewToolPromptTemplates.endVoiceChat,
      name: "end_voice_chat",
      parameters: {
        additionalProperties: false,
        properties: {},
        type: "object",
      },
      type: "function",
    },
  )

  return tools
}

class XaiVoiceSession implements HealthViewVoiceSession {
  private audioContext: AudioContext | null = null
  private bargeInFrames = 0
  private inputNode: ScriptProcessorNode | null = null
  private inputStream: MediaStream | null = null
  private mutedOutput: GainNode | null = null
  private nextOutputTime = 0
  private readonly options: HealthViewVoiceSessionOptions
  private outputInterrupted = false
  private outputSources = new Set<AudioBufferSourceNode>()
  private playingResponseId: string | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private stopped = false
  private websocket: WebSocket | null = null

  constructor(options: HealthViewVoiceSessionOptions) {
    this.options = options
  }

  async start() {
    this.options.onStatus?.("connecting")

    const clientSecret = await createXaiVoiceClientSecret()
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    })

    if (this.stopped) {
      stream.getTracks().forEach((track) => track.stop())
      return
    }

    this.inputStream = stream
    this.audioContext = new AudioContext({ sampleRate: VOICE_SAMPLE_RATE })
    await this.audioContext.resume()
    this.nextOutputTime = this.audioContext.currentTime

    const websocket = new WebSocket(xaiRealtimeUrl(), [websocketProtocolForClientSecret(clientSecret.value)])
    this.websocket = websocket

    await new Promise<void>((resolve, reject) => {
      websocket.addEventListener("open", () => resolve(), { once: true })
      websocket.addEventListener("error", () => reject(new Error("Unable to connect to xAI voice chat.")), {
        once: true,
      })
    })

    if (this.stopped) {
      this.stop()
      return
    }

    websocket.addEventListener("message", (event) => {
      void this.handleMessage(event.data)
    })
    websocket.addEventListener("close", () => {
      if (!this.stopped) {
        this.options.onStatus?.("closed")
      }
      this.stop()
    })
    websocket.addEventListener("error", () => {
      this.handleError(new Error("The xAI voice connection failed."))
    })

    this.send({
      session: {
        audio: {
          input: {
            format: {
              rate: VOICE_SAMPLE_RATE,
              type: "audio/pcm",
            },
            transcription: {
              model: "grok-transcribe",
            },
          },
          output: {
            format: {
              rate: VOICE_SAMPLE_RATE,
              type: "audio/pcm",
            },
          },
        },
        instructions: voiceInstructions({
          healthDataAccessEnabled: Boolean(this.options.healthDataAccessEnabled && this.options.healthContextReader),
          uiContext: this.options.uiContext,
        }),
        tools: voiceTools({
          healthContextReader: this.options.healthContextReader,
          healthDataAccessEnabled: this.options.healthDataAccessEnabled,
        }),
        turn_detection: {
          prefix_padding_ms: 333,
          silence_duration_ms: 500,
          threshold: 0.55,
          type: "server_vad",
        },
        voice: XAI_VOICE,
      },
      type: "session.update",
    })

    this.startMicrophoneStream()
    this.options.onStatus?.("listening")
  }

  stop() {
    this.stopped = true
    this.inputNode?.disconnect()
    this.sourceNode?.disconnect()
    this.mutedOutput?.disconnect()
    this.inputStream?.getTracks().forEach((track) => track.stop())
    for (const source of this.outputSources) {
      try {
        source.stop()
      } catch {
        // Already ended.
      }
    }
    this.outputSources.clear()

    if (
      this.websocket &&
      (this.websocket.readyState === WebSocket.CONNECTING || this.websocket.readyState === WebSocket.OPEN)
    ) {
      this.websocket.close()
    }

    void this.audioContext?.close().catch(() => undefined)
    this.audioContext = null
    this.bargeInFrames = 0
    this.inputNode = null
    this.inputStream = null
    this.mutedOutput = null
    this.outputInterrupted = false
    this.playingResponseId = null
    this.sourceNode = null
    this.websocket = null
    this.options.onInputLevel?.({ level: 0, rms: 0 })
    this.options.onStatus?.("closed")
  }

  private startMicrophoneStream() {
    if (!this.audioContext || !this.inputStream) return

    this.sourceNode = this.audioContext.createMediaStreamSource(this.inputStream)
    this.inputNode = this.audioContext.createScriptProcessor(INPUT_BUFFER_SIZE, 1, 1)
    this.mutedOutput = this.audioContext.createGain()
    this.mutedOutput.gain.value = 0

    this.inputNode.onaudioprocess = (event) => {
      if (this.stopped || !this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
        return
      }

      const channel = event.inputBuffer.getChannelData(0)
      const rms = rmsForChannel(channel)
      this.options.onInputLevel?.({
        level: voiceLevelForRms(rms),
        rms,
      })
      this.send({
        audio: bytesToBase64(floatToPcm16(channel)),
        type: "input_audio_buffer.append",
      })

      this.detectLocalBargeIn(rms)
    }

    this.sourceNode.connect(this.inputNode)
    this.inputNode.connect(this.mutedOutput)
    this.mutedOutput.connect(this.audioContext.destination)
  }

  private async handleMessage(data: unknown) {
    if (typeof data !== "string") return

    let event: RealtimeEvent
    try {
      event = JSON.parse(data) as RealtimeEvent
    } catch {
      return
    }

    if (event.type === "error") {
      this.handleError(new Error(event.error?.message ?? "xAI voice chat returned an error."))
      return
    }

    if (event.type === "response.function_call_arguments.done") {
      await this.handleFunctionCall(event)
      return
    }

    if (
      event.type === "response.created" ||
      event.type === "response.output_item.added" ||
      event.type === "response.content_part.added"
    ) {
      this.playingResponseId = this.responseIdForEvent(event)
    }

    if (event.type === "response.output_audio.delta" || event.type === "response.audio.delta") {
      this.playingResponseId = this.responseIdForEvent(event)
      if (event.delta && !this.outputInterrupted) {
        this.options.onStatus?.("speaking")
        this.playOutputAudio(event.delta)
      }
      return
    }

    if (
      event.type === "input_audio_buffer.speech_started" ||
      event.type === "input_audio_buffer.speech_stopped" ||
      event.type === "conversation.item.input_audio_transcription.updated"
    ) {
      if (event.type === "input_audio_buffer.speech_started") {
        this.interruptAssistantSpeech()
      }
      this.options.onStatus?.("listening")
    }

    if (
      event.type === "conversation.item.input_audio_transcription.completed" ||
      event.type === "conversation.item.input_audio_transcription.updated"
    ) {
      if (event.transcript) {
        this.options.onTranscript?.({
          final: event.type === "conversation.item.input_audio_transcription.completed",
          mode: "replace",
          role: "user",
          text: event.transcript,
        })
      }
      if (event.type === "conversation.item.input_audio_transcription.completed") {
        this.outputInterrupted = false
        this.playingResponseId = null
      }
      return
    }

    if (event.type === "response.output_text.delta" || event.type === "response.text.delta") {
      if (event.delta) {
        this.options.onTranscript?.({
          mode: "append",
          role: "assistant",
          text: event.delta,
        })
      }
      return
    }

    if (event.type === "response.done") {
      const transcript = event.response?.output
        ?.flatMap((output) => output.content ?? [])
        .map((content) => content.transcript)
        .filter(Boolean)
        .join(" ")
      if (transcript) {
        this.options.onTranscript?.({
          final: true,
          mode: "replace",
          role: "assistant",
          text: transcript,
        })
      }
      this.outputInterrupted = false
      this.playingResponseId = null
      this.options.onStatus?.("listening")
    }
  }

  private async handleFunctionCall(event: RealtimeEvent) {
    const callId = event.call_id
    const name = event.name
    if (!callId || !name) return

    const output = await this.executeVoiceTool(name, event.arguments ?? "{}")
    this.send({
      item: {
        call_id: callId,
        output: JSON.stringify(output),
        type: "function_call_output",
      },
      type: "conversation.item.create",
    })
    this.send({ type: "response.create" })
  }

  private async executeVoiceTool(name: string, rawArguments: string) {
    let args: Record<string, unknown>
    try {
      args = JSON.parse(rawArguments) as Record<string, unknown>
    } catch {
      return { error: "Invalid tool arguments.", ok: false }
    }

    if (name === "get_app_context") {
      return {
        modelOutput: {
          uiContext: this.options.uiContext ?? null,
        },
        ok: true,
      }
    }

    if (name === "get_health_context") {
      if (!this.options.healthContextReader) {
        return {
          error: "HealthView OS health context is unavailable in this voice session.",
          ok: false,
        }
      }

      return {
        modelOutput: {
          healthDataAccess: "enabled",
          source: "browser_local_workspace",
          summary: await this.options.healthContextReader(),
        },
        ok: true,
      }
    }

    if (name === "end_voice_chat") {
      window.setTimeout(() => {
        this.stop()
      }, END_VOICE_CHAT_DELAY_MS)
      return {
        modelOutput: {
          message: "Voice chat ended.",
        },
        ok: true,
      }
    }

    if (!this.options.controlClient) {
      return {
        error: "HealthView OS UI control is unavailable in this voice session.",
        ok: false,
      }
    }

    if (name === "search_records") {
      if (args.limit !== undefined && (!Number.isInteger(args.limit) || Number(args.limit) < 1 || Number(args.limit) > 20)) {
        return { error: "Invalid record search limit.", ok: false }
      }
      if (args.categoryId !== undefined && !isHealthViewRecordCategoryId(args.categoryId)) {
        return { error: "Invalid record category.", ok: false }
      }

      return this.options.controlClient.executeCommand({
        categoryId: isHealthViewRecordCategoryId(args.categoryId) ? args.categoryId : undefined,
        limit: typeof args.limit === "number" ? args.limit : undefined,
        query: typeof args.query === "string" ? args.query : undefined,
        type: "records/search",
      })
    }

    if (name === "get_record") {
      if (typeof args.recordId !== "string" || !args.recordId.trim()) {
        return { error: "Invalid record ID.", ok: false }
      }

      return this.options.controlClient.executeCommand({
        recordId: args.recordId,
        type: "records/get",
      })
    }

    if (name === "create_record") {
      const fields = stringRecord(args.fields)
      if (!isHealthViewRecordCategoryId(args.categoryId)) {
        return { error: "Invalid record category.", ok: false }
      }
      if (!fields) {
        return { error: "Invalid record fields.", ok: false }
      }
      if (args.historySectionId !== undefined && !isHealthViewHistorySectionId(args.historySectionId)) {
        return { error: "Invalid history section.", ok: false }
      }

      return this.options.controlClient.executeCommand({
        categoryId: args.categoryId,
        fields,
        historySectionId: isHealthViewHistorySectionId(args.historySectionId) ? args.historySectionId : undefined,
        type: "records/create",
      })
    }

    if (name === "update_record") {
      const fields = stringRecord(args.fields)
      if (typeof args.recordId !== "string" || !args.recordId.trim()) {
        return { error: "Invalid record ID.", ok: false }
      }
      if (!fields) {
        return { error: "Invalid record fields.", ok: false }
      }

      return this.options.controlClient.executeCommand({
        fields,
        recordId: args.recordId,
        type: "records/update",
      })
    }

    if (name === "search_atlas_targets") {
      if (typeof args.query !== "string" || !args.query.trim()) {
        return { error: "Invalid atlas search query.", ok: false }
      }
      if (args.limit !== undefined && (!Number.isInteger(args.limit) || Number(args.limit) < 1 || Number(args.limit) > 12)) {
        return { error: "Invalid atlas search limit.", ok: false }
      }
      if (args.targetType !== undefined && !isHealthViewAtlasTargetType(args.targetType)) {
        return { error: "Invalid atlas target type.", ok: false }
      }

      return this.options.controlClient.executeCommand({
        limit: typeof args.limit === "number" ? args.limit : undefined,
        query: args.query,
        targetType: isHealthViewAtlasTargetType(args.targetType) ? args.targetType : undefined,
        type: "atlas/searchTargets",
      })
    }

    if (name === "control_atlas_view") {
      if (!isHealthViewAtlasControlAction(args.action)) {
        return { error: "Invalid atlas control action.", ok: false }
      }
      const objectIds = stringArray(args.objectIds)
      const regionIds = stringArray(args.regionIds)
      if (args.objectIds !== undefined && !objectIds) {
        return { error: "Invalid atlas object IDs.", ok: false }
      }
      if (args.regionIds !== undefined && !regionIds) {
        return { error: "Invalid atlas region IDs.", ok: false }
      }

      return this.options.controlClient.executeCommand({
        action: args.action,
        animate: typeof args.animate === "boolean" ? args.animate : undefined,
        objectIds,
        orbiting: typeof args.orbiting === "boolean" ? args.orbiting : undefined,
        regionIds,
        systemId: args.systemId === null ? null : isHealthViewAtlasSystemId(args.systemId) ? args.systemId : undefined,
        targetId: typeof args.targetId === "string" ? args.targetId : args.targetId === null ? null : undefined,
        targetLabel: typeof args.targetLabel === "string" ? args.targetLabel : args.targetLabel === null ? null : undefined,
        targetType: args.targetType === null ? null : isHealthViewAtlasTargetType(args.targetType) ? args.targetType : undefined,
        type: "atlas/control",
        zoom: isHealthViewAtlasZoomLevel(args.zoom) ? args.zoom : undefined,
      })
    }

    if (name === "navigate") {
      if (!isHealthViewAppLocation(args.location)) {
        return { error: "Invalid HealthView OS location.", ok: false }
      }

      return this.options.controlClient.executeCommand({
        location: args.location,
        type: "ui/navigate",
      })
    }

    if (name === "search_app") {
      if (typeof args.query !== "string" || !args.query.trim()) {
        return { error: "Invalid search query.", ok: false }
      }
      if (args.limit !== undefined && (!Number.isInteger(args.limit) || Number(args.limit) < 1 || Number(args.limit) > 10)) {
        return { error: "Invalid search limit.", ok: false }
      }

      return this.options.controlClient.executeCommand({
        limit: typeof args.limit === "number" ? args.limit : undefined,
        query: args.query,
        type: "ui/search",
      })
    }

    if (name === "run_ui_action") {
      if (typeof args.actionId !== "string" || !args.actionId.trim()) {
        return { error: "Invalid UI action.", ok: false }
      }

      return this.options.controlClient.executeCommand({
        actionId: args.actionId,
        type: "ui/runAction",
      })
    }

    if (name === "open_page") {
      const pageId = args.pageId
      if (typeof pageId !== "string" || !healthViewPageIds.includes(pageId as never)) {
        return { error: "Invalid HealthView OS page.", ok: false }
      }

      return this.options.controlClient.executeCommand({
        location: { page: pageId as (typeof healthViewPageIds)[number] },
        type: "ui/navigate",
      })
    }

    if (name === "set_chat_open") {
      if (typeof args.open !== "boolean") {
        return { error: "Invalid chat open state.", ok: false }
      }

      return this.options.controlClient.executeCommand({
        open: args.open,
        type: "ui/setChatOpen",
      })
    }

    return { error: `Unknown voice tool: ${name}`, ok: false }
  }

  private playOutputAudio(delta: string) {
    if (!this.audioContext || this.stopped) return

    const samples = decodePcm16(base64ToBytes(delta))
    const audioBuffer = this.audioContext.createBuffer(1, samples.length, VOICE_SAMPLE_RATE)
    audioBuffer.copyToChannel(samples, 0)

    const source = this.audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(this.audioContext.destination)
    source.onended = () => {
      this.outputSources.delete(source)
    }

    const startTime = Math.max(this.audioContext.currentTime, this.nextOutputTime)
    source.start(startTime)
    this.nextOutputTime = startTime + audioBuffer.duration
    this.outputSources.add(source)
  }

  private interruptAssistantSpeech() {
    if (!this.isAssistantOutputActive() && !this.playingResponseId) return

    this.outputInterrupted = true
    this.stopOutputAudio()
    this.options.onStatus?.("listening")
  }

  private stopOutputAudio() {
    for (const source of this.outputSources) {
      try {
        source.stop()
      } catch {
        // Already ended.
      }
    }
    this.outputSources.clear()
    this.nextOutputTime = this.audioContext?.currentTime ?? 0
  }

  private responseIdForEvent(event: RealtimeEvent) {
    return event.response_id ?? event.response?.id ?? this.playingResponseId
  }

  private detectLocalBargeIn(rms: number) {
    if (!this.isAssistantOutputActive()) {
      this.bargeInFrames = 0
      return
    }

    if (rms < BARGE_IN_RMS_THRESHOLD) {
      this.bargeInFrames = 0
      return
    }

    this.bargeInFrames += 1
    if (this.bargeInFrames >= BARGE_IN_CONSECUTIVE_FRAMES) {
      this.interruptAssistantSpeech()
      this.bargeInFrames = 0
    }
  }

  private isAssistantOutputActive() {
    if (this.outputSources.size > 0) return true
    if (!this.audioContext) return false
    return this.nextOutputTime > this.audioContext.currentTime + 0.03
  }

  private send(message: unknown) {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return
    }
    this.websocket.send(JSON.stringify(message))
  }

  private handleError(error: Error) {
    this.options.onError?.(error)
    this.stop()
  }
}

export async function startXaiVoiceSession(options: HealthViewVoiceSessionOptions) {
  const session = new XaiVoiceSession(options)
  try {
    await session.start()
    return session
  } catch (error) {
    session.stop()
    throw error
  }
}
