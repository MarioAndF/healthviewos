import { buildHealthViewAgentInstructions } from "@healthviewos/agent/prompts"
import { healthViewPageIds, type HealthViewControlClient } from "@healthviewos/agent/control"
import type { HealthViewUiContext } from "@healthviewos/agent/types"
import { createXaiVoiceClientSecret } from "./agent"

const XAI_REALTIME_URL = "wss://api.x.ai/v1/realtime"
const XAI_VOICE_MODEL = "grok-voice-latest"
const XAI_VOICE = "ara"
const VOICE_SAMPLE_RATE = 24_000
const INPUT_BUFFER_SIZE = 2048
const BARGE_IN_RMS_THRESHOLD = 0.012
const BARGE_IN_CONSECUTIVE_FRAMES = 2
const END_VOICE_CHAT_DELAY_MS = 1200

export type HealthViewVoiceStatus = "connecting" | "listening" | "speaking" | "closed"

type HealthViewVoiceSessionOptions = {
  controlClient?: HealthViewControlClient
  onError?: (error: Error) => void
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

function websocketProtocolForClientSecret(value: string) {
  return value.startsWith("xai-client-secret.") ? value : `xai-client-secret.${value}`
}

function xaiRealtimeUrl() {
  const url = new URL(XAI_REALTIME_URL)
  url.searchParams.set("model", XAI_VOICE_MODEL)
  return url.toString()
}

function voiceInstructions(uiContext?: HealthViewUiContext | null) {
  return [
    buildHealthViewAgentInstructions({ uiContext }),
    "You are in a realtime voice session. Keep spoken replies concise, conversational, and easy to interrupt.",
    "Safe UI tools may open HealthView OS pages or report current app context. Health record search and local file access are not enabled in this version.",
  ].join("\n\n")
}

function voiceTools() {
  return [
    {
      description:
        "Read the current visible HealthView OS UI context. This does not read health records, billing data, or local files.",
      name: "get_app_context",
      parameters: {
        additionalProperties: false,
        properties: {},
        type: "object",
      },
      type: "function",
    },
    {
      description:
        "Open a top-level HealthView OS page in the visible app UI. This is UI navigation only and does not read health records.",
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
      description: "Open or close the HealthView OS chat panel in the visible app UI.",
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
      description:
        "End the current HealthView OS realtime voice session. Call this when the user says goodbye, says they are done, or asks to stop voice chat.",
      name: "end_voice_chat",
      parameters: {
        additionalProperties: false,
        properties: {},
        type: "object",
      },
      type: "function",
    },
  ]
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
        instructions: voiceInstructions(this.options.uiContext),
        tools: voiceTools(),
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
      this.send({
        audio: bytesToBase64(floatToPcm16(channel)),
        type: "input_audio_buffer.append",
      })

      this.detectLocalBargeIn(channel)
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
          healthDataAccess: "disabled_in_v1",
          uiContext: this.options.uiContext ?? null,
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

    if (name === "open_page") {
      const pageId = args.pageId
      if (typeof pageId !== "string" || !healthViewPageIds.includes(pageId as never)) {
        return { error: "Invalid HealthView OS page.", ok: false }
      }

      return this.options.controlClient.executeCommand({
        pageId: pageId as (typeof healthViewPageIds)[number],
        type: "ui/openPage",
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

  private detectLocalBargeIn(channel: Float32Array) {
    if (!this.isAssistantOutputActive()) {
      this.bargeInFrames = 0
      return
    }

    let total = 0
    for (let index = 0; index < channel.length; index += 1) {
      const sample = channel[index] ?? 0
      total += sample * sample
    }

    const rms = Math.sqrt(total / channel.length)
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
