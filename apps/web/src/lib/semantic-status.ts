export type SemanticTone = "good" | "warning" | "bad" | "info" | "neutral"

export type SemanticBadgeVariant = "success" | "warning" | "danger" | "info" | "secondary"

const contextTokenMap: Record<string, Partial<Record<string, SemanticTone>>> = {
  confidence: {
    high: "good",
    medium: "warning",
    low: "bad",
  },
  criticality: {
    high: "bad",
    low: "warning",
    unable_to_assess: "neutral",
    unknown: "neutral",
  },
  freshness: {
    current: "good",
    stale: "warning",
    unknown: "neutral",
  },
  severity: {
    severe: "bad",
    moderate: "warning",
    mild: "warning",
    unknown: "neutral",
  },
  verification: {
    confirmed: "good",
    provisional: "warning",
    refuted: "bad",
    unknown: "neutral",
  },
}

const valueTokenMap: Record<string, SemanticTone> = {
  active: "good",
  amended: "good",
  approved: "good",
  available: "good",
  clear: "good",
  completed: "good",
  corrected: "good",
  current: "good",
  final: "good",
  finished: "good",
  good: "good",
  no_flags: "good",
  paid: "good",
  stable: "good",

  arrived: "warning",
  building: "warning",
  draft: "warning",
  in_progress: "warning",
  in_rehab: "warning",
  intended: "warning",
  medium: "warning",
  on_hold: "warning",
  open: "warning",
  partial: "warning",
  past: "warning",
  pending: "warning",
  planned: "warning",
  preliminary: "warning",
  registered: "warning",
  requested: "warning",
  watch: "warning",

  abnormal: "bad",
  attention: "bad",
  bad: "bad",
  cancelled: "bad",
  denied: "bad",
  entered_in_error: "bad",
  expired: "bad",
  failed: "bad",
  high: "bad",
  inactive: "bad",
  inflamed: "bad",
  not_done: "bad",
  overdue: "bad",
  revoked: "bad",
  stopped: "bad",
  strained: "bad",
  suspended: "bad",

  neutral: "neutral",
  unknown: "neutral",
}

export function semanticToneForScore(score: number): SemanticTone {
  if (score >= 75) return "good"
  if (score >= 60) return "warning"
  return "bad"
}

export function semanticToneForValue(value: string | undefined, context?: string): SemanticTone {
  const normalizedValue = normalizeSemanticToken(value)
  if (!normalizedValue) return "neutral"

  const normalizedContext = normalizeSemanticToken(context)
  if (normalizedContext) {
    const contextMatch = Object.entries(contextTokenMap).find(([key]) => normalizedContext.includes(key))
    const contextualTone = contextMatch?.[1][normalizedValue]
    if (contextualTone) return contextualTone
  }

  return valueTokenMap[normalizedValue] ?? "neutral"
}

export function semanticBadgeVariantForTone(tone: SemanticTone): SemanticBadgeVariant {
  if (tone === "good") return "success"
  if (tone === "warning") return "warning"
  if (tone === "bad") return "danger"
  if (tone === "info") return "info"
  return "secondary"
}

export function semanticSurfaceClass(tone: SemanticTone) {
  if (tone === "good") return "border border-[color:var(--semantic-good-border)] bg-[color:var(--semantic-good-bg)]"
  if (tone === "warning") return "border border-[color:var(--semantic-warning-border)] bg-[color:var(--semantic-warning-bg)]"
  if (tone === "bad") return "border border-[color:var(--semantic-bad-border)] bg-[color:var(--semantic-bad-bg)]"
  if (tone === "info") return "border border-[color:var(--semantic-info-border)] bg-[color:var(--semantic-info-bg)]"
  return "bg-secondary"
}

export function semanticDotClass(tone: SemanticTone) {
  if (tone === "good") return "bg-[color:var(--semantic-good-solid)]"
  if (tone === "warning") return "bg-[color:var(--semantic-warning-solid)]"
  if (tone === "bad") return "bg-[color:var(--semantic-bad-solid)]"
  if (tone === "info") return "bg-[color:var(--semantic-info-solid)]"
  return "bg-muted-foreground"
}

export function semanticIconSurfaceClass(tone: SemanticTone, selected = false) {
  if (selected) {
    if (tone === "good") return "bg-[color:var(--semantic-good-solid)] text-white shadow-[0_10px_28px_color-mix(in_oklch,var(--semantic-good-solid)_24%,transparent)]"
    if (tone === "warning") return "bg-[color:var(--semantic-warning-solid)] text-white shadow-[0_10px_28px_color-mix(in_oklch,var(--semantic-warning-solid)_24%,transparent)]"
    if (tone === "bad") return "bg-[color:var(--semantic-bad-solid)] text-white shadow-[0_10px_28px_color-mix(in_oklch,var(--semantic-bad-solid)_24%,transparent)]"
    if (tone === "info") return "bg-[color:var(--semantic-info-solid)] text-white shadow-[0_10px_28px_color-mix(in_oklch,var(--semantic-info-solid)_24%,transparent)]"
    return "bg-foreground text-background"
  }

  if (tone === "good") return "bg-[color:var(--semantic-good-bg)] text-[color:var(--semantic-good-fg)] ring-1 ring-[color:var(--semantic-good-border)] hover:bg-[color:var(--semantic-good-border)]"
  if (tone === "warning") return "bg-[color:var(--semantic-warning-bg)] text-[color:var(--semantic-warning-fg)] ring-1 ring-[color:var(--semantic-warning-border)] hover:bg-[color:var(--semantic-warning-border)]"
  if (tone === "bad") return "bg-[color:var(--semantic-bad-bg)] text-[color:var(--semantic-bad-fg)] ring-1 ring-[color:var(--semantic-bad-border)] hover:bg-[color:var(--semantic-bad-border)]"
  if (tone === "info") return "bg-[color:var(--semantic-info-bg)] text-[color:var(--semantic-info-fg)] ring-1 ring-[color:var(--semantic-info-border)] hover:bg-[color:var(--semantic-info-border)]"
  return "bg-muted/55 text-muted-foreground hover:bg-muted hover:text-foreground"
}

export function semanticProgressIndicatorClass(tone: SemanticTone) {
  if (tone === "good") return "bg-[color:var(--semantic-good-solid)]"
  if (tone === "warning") return "bg-[color:var(--semantic-warning-solid)]"
  if (tone === "bad") return "bg-[color:var(--semantic-bad-solid)]"
  if (tone === "info") return "bg-[color:var(--semantic-info-solid)]"
  return "bg-primary"
}

export function semanticProgressTrackClass(tone: SemanticTone) {
  if (tone === "good") return "bg-[color:var(--semantic-good-bg)]"
  if (tone === "warning") return "bg-[color:var(--semantic-warning-bg)]"
  if (tone === "bad") return "bg-[color:var(--semantic-bad-bg)]"
  if (tone === "info") return "bg-[color:var(--semantic-info-bg)]"
  return "bg-muted"
}

function normalizeSemanticToken(value: string | undefined) {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
}
