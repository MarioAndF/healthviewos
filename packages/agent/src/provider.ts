import type {
  HealthViewAgentProviderConfig,
  HealthViewAgentProviderId,
  HealthViewAgentProviderOption,
  HealthViewAgentProviderStatus,
} from "./types"

export const HEALTHVIEW_DEFAULT_OPENAI_MODEL = "gpt-5.5"
export const HEALTHVIEW_DEFAULT_XAI_MODEL = "grok-4.3"

export const healthViewProviderIds: HealthViewAgentProviderId[] = ["openai", "xai"]

export const healthViewProviderOptions: HealthViewAgentProviderOption[] = [
  {
    defaultModel: HEALTHVIEW_DEFAULT_OPENAI_MODEL,
    enabled: true,
    envNames: ["HEALTHVIEW_OPENAI_API_KEY", "OPENAI_API_KEY"],
    id: "openai",
    label: "OpenAI",
    models: ["gpt-5.5", "gpt-5.1", "gpt-5", "gpt-4.1", "gpt-4o-mini"],
  },
  {
    defaultModel: HEALTHVIEW_DEFAULT_XAI_MODEL,
    enabled: true,
    envNames: ["HEALTHVIEW_XAI_API_KEY", "XAI_API_KEY"],
    id: "xai",
    label: "xAI",
    models: ["grok-4.3", "grok-4.3-fast", "grok-4.20-0309-reasoning"],
  },
]

export function getHealthViewProviderOption(provider: HealthViewAgentProviderId) {
  return healthViewProviderOptions.find((option) => option.id === provider) ?? healthViewProviderOptions[0]!
}

export function isHealthViewProviderId(provider: string | null | undefined): provider is HealthViewAgentProviderId {
  return healthViewProviderIds.includes(provider as HealthViewAgentProviderId)
}

export function normalizeHealthViewProviderModel(input: {
  model?: string | null
  provider: HealthViewAgentProviderId
}) {
  const option = getHealthViewProviderOption(input.provider)
  const model = input.model?.trim()
  return model && option.models.includes(model) ? model : option.defaultModel
}

function providerBaseURL(provider: HealthViewAgentProviderId) {
  if (provider === "xai") {
    return "https://api.x.ai/v1"
  }
  return undefined
}

function providerUsesResponses(provider: HealthViewAgentProviderId) {
  return provider === "openai"
}

export function resolveHealthViewProviderConfig(input: {
  apiKey?: string | null
  model?: string | null
  provider?: HealthViewAgentProviderId | null
}): HealthViewAgentProviderConfig {
  const provider = input.provider ?? "openai"
  const option = getHealthViewProviderOption(provider)
  const apiKey = input.apiKey?.trim()
  const model = normalizeHealthViewProviderModel({
    model: input.model,
    provider,
  })

  return {
    apiKey,
    baseURL: providerBaseURL(provider),
    configured: option.enabled && Boolean(apiKey),
    label: option.label,
    model,
    provider,
    useResponses: providerUsesResponses(provider),
  }
}

export function buildHealthViewProviderStatuses(input: {
  apiKey?: string | null
  model: string
  provider: HealthViewAgentProviderId
}): HealthViewAgentProviderStatus[] {
  return healthViewProviderOptions.map((option) => {
    const selected = option.id === input.provider
    return {
      ...option,
      configured: selected && Boolean(input.apiKey?.trim()),
      model: selected
        ? normalizeHealthViewProviderModel({
            model: input.model,
            provider: option.id,
          })
        : option.defaultModel,
      selected,
    }
  })
}

export function missingProviderMessage(provider: HealthViewAgentProviderId) {
  const option = getHealthViewProviderOption(provider)
  if (!option.enabled) {
    return `${option.label} is defined for HealthView OS but is not enabled yet.`
  }

  return `${option.label} is not configured. Add an API key in Settings before using this provider.`
}
