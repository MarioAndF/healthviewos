import type {
  EvidenceBackedClaim,
  HealthMapSignal,
  VisualVitalMetric,
  WarningSign,
} from "@healthviewos/schema"
import {
  Activity,
  AlertCircle,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Database,
  Download,
  FileText,
  Heart,
  Hospital,
  LoaderCircle,
  List,
  Menu,
  MessageCircle,
  Mic,
  MicOff,
  Plus,
  RotateCcw,
  Save,
  Send,
  Settings,
  Stethoscope,
  Upload,
  UserRound,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react"

import type {
  HealthViewAgentMessage,
  HealthViewAgentProviderId,
  HealthViewAgentSettings,
  HealthViewAgentThread,
  HealthViewControlClient,
} from "@healthviewos/agent"
import {
  createHealthViewAgentClient,
  createNewHealthViewAgentThread,
  getHealthViewAgentSettings,
  healthViewProviderOptions,
  listHealthViewAgentThreads,
  updateHealthViewAgentSettings,
} from "@/agent"
import { EvidenceDialog } from "@/components/evidence/evidence-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { SectionTable, SectionTableRow } from "@/components/ui/section-table"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  selectSystemReadiness,
  selectSystemRows,
  selectSystemStatus,
  selectSystemStatusRows,
  selectUpcomingCare,
  selectVitals,
  selectWarningSigns,
  selectWorkspaceSummary,
  type SystemStatusRow,
  type UpcomingCareItem,
} from "@/data/workspace-selectors"
import { cn } from "@/lib/utils"
import { useNavigationStore, type PageId } from "@/store/navigation"
import { useWorkspaceStore } from "@/store/workspace"
import { startXaiVoiceSession, type HealthViewVoiceSession, type HealthViewVoiceTranscriptUpdate } from "@/voice"

const navItems: Array<{ id: PageId; label: string; icon: LucideIcon }> = [
  { id: "health", label: "Health", icon: Heart },
  { id: "services", label: "Services", icon: Hospital },
  { id: "records", label: "Records", icon: ClipboardList },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "settings", label: "Settings", icon: Settings },
]

const sectionCardClass =
  "border-white/70 bg-card/85 shadow-[0_18px_55px_rgba(15,23,42,0.07)] ring-1 ring-foreground/5 backdrop-blur-xl supports-[backdrop-filter]:bg-card/75 dark:border-white/10 dark:bg-card/65 dark:shadow-[0_18px_55px_rgba(0,0,0,0.28)]"

const metricCardClass = cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")

const settingsFieldControlClass =
  "h-8 w-40 rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-56"

const careIcons = [Stethoscope, FileText, CalendarDays]

const bodySignalNodes = [
  { cx: 260, cy: 170, r: 28, label: "Neuro", value: "91" },
  { cx: 260, cy: 248, r: 36, label: "Cardio", value: "86" },
  { cx: 214, cy: 314, r: 26, label: "Resp", value: "90" },
  { cx: 306, cy: 330, r: 31, label: "Metabolic", value: "68" },
  { cx: 260, cy: 430, r: 34, label: "Recovery", value: "58" },
]

const bodySignalLabels = [
  { label: "sleep", x: 84, y: 124 },
  { label: "stress", x: 402, y: 124 },
  { label: "oxygen", x: 54, y: 286 },
  { label: "glucose", x: 430, y: 286 },
  { label: "mobility", x: 74, y: 478 },
  { label: "recovery", x: 402, y: 478 },
]

const pageSummaries: Record<
  Exclude<PageId, "health">,
  {
    title: string
    description: string
    icon: LucideIcon
    rows: Array<{ title: string; description: string; meta: string }>
  }
> = {
  services: {
    title: "Services",
    description: "Find care options, saved providers, labs, pharmacy, and virtual visits.",
    icon: Hospital,
    rows: [
      {
        title: "Primary care",
        description: "Routine visits and care navigation.",
        meta: "2 in-network options",
      },
      {
        title: "Lab testing",
        description: "Diagnostics connected to your recent care plan.",
        meta: "3 nearby labs",
      },
      {
        title: "Virtual care",
        description: "On-demand appointments for low-acuity concerns.",
        meta: "Available today",
      },
    ],
  },
  records: {
    title: "Records",
    description: "A structured map of clinical documents, labs, medications, and visits.",
    icon: ClipboardList,
    rows: [
      {
        title: "Lab results",
        description: "CBC, lipid panel, A1C, metabolic panels.",
        meta: "28 records",
      },
      {
        title: "Medications",
        description: "Active prescriptions and historical changes.",
        meta: "4 active",
      },
      {
        title: "Visit notes",
        description: "Clinical notes and summaries from providers.",
        meta: "11 notes",
      },
    ],
  },
  billing: {
    title: "Billing",
    description: "Claims, authorizations, balances, and payment activity.",
    icon: WalletCards,
    rows: [
      {
        title: "Open balance",
        description: "Estimated patient responsibility after insurance.",
        meta: "$142.18",
      },
      {
        title: "Claims",
        description: "Processed and pending insurance claims.",
        meta: "3 pending",
      },
      {
        title: "Authorizations",
        description: "Referrals and prior authorization status.",
        meta: "1 active",
      },
    ],
  },
  settings: {
    title: "Settings",
    description: "Privacy, connections, notifications, and HealthView OS preferences.",
    icon: Settings,
    rows: [
      {
        title: "Data connections",
        description: "Apple Health, labs, insurer, and provider portals.",
        meta: "4 connected",
      },
      {
        title: "Privacy",
        description: "Local storage, sharing permissions, and audit trail.",
        meta: "Local-first",
      },
      {
        title: "Notifications",
        description: "Warning signs, care reminders, and billing alerts.",
        meta: "Digest on",
      },
    ],
  },
}

const chatPanelTransitionMs = 300

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return ""

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 60) return "Now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function voiceMessageId(role: HealthViewAgentMessage["role"]) {
  return `voice_${role}_active`
}

function mergeVoiceTranscript(
  previousMessages: HealthViewAgentMessage[],
  update: HealthViewVoiceTranscriptUpdate,
  threadId: string,
) {
  const activeId = voiceMessageId(update.role)
  const activeIndex = previousMessages.findLastIndex((message) => message.id === activeId)
  const existing = activeIndex >= 0 ? previousMessages[activeIndex] : undefined
  const text = update.mode === "append" ? `${existing?.text ?? ""}${update.text}` : update.text
  const message: HealthViewAgentMessage = {
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    id: update.final ? `voice_${update.role}_${Date.now().toString(36)}` : activeId,
    role: update.role,
    text,
    threadId,
  }

  if (activeIndex < 0) {
    return [...previousMessages, message]
  }

  const next = [...previousMessages]
  next[activeIndex] = message
  return next
}

function App() {
  const sidebarCollapsed = useNavigationStore((state) => state.sidebarCollapsed)
  const loadWorkspace = useWorkspaceStore((state) => state.loadWorkspace)
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    void loadWorkspace()
  }, [loadWorkspace])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className={cn(
          "flex min-h-screen transition-[padding-left] duration-300 ease-out md:pl-60",
          sidebarCollapsed && "md:pl-16",
        )}
      >
        <DesktopSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileHeader />
          <main className="min-w-0 flex-1 overflow-x-hidden px-4 pb-28 pt-5 sm:px-6 md:px-8 md:pb-8 md:pt-8">
            <PageContent />
          </main>
        </div>
      </div>
      <FloatingChatPanel open={chatOpen} onOpenChange={setChatOpen} />
      <MobileTabbar />
    </div>
  )
}

function FloatingChatPanel({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const activePage = useNavigationStore((state) => state.activePage)
  const setActivePage = useNavigationStore((state) => state.setActivePage)
  const [chatView, setChatView] = useState<"conversation" | "threads">("conversation")
  const [messages, setMessages] = useState<HealthViewAgentMessage[]>([])
  const [threads, setThreads] = useState<HealthViewAgentThread[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>()
  const [input, setInput] = useState("")
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [settings, setSettings] = useState<HealthViewAgentSettings>(() => getHealthViewAgentSettings())
  const [voiceSession, setVoiceSession] = useState<HealthViewVoiceSession | null>(null)
  const [voiceStatus, setVoiceStatus] = useState<"closed" | "connecting" | "listening" | "speaking">("closed")
  const [panelRendered, setPanelRendered] = useState(open)
  const [panelVisible, setPanelVisible] = useState(open)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const showingThreads = chatView === "threads"
  const panelInteractive = open && panelVisible
  const goToThreads = () => setChatView("threads")
  const goToConversation = () => setChatView("conversation")
  const voiceAvailable = settings.provider === "xai"
  const voiceActive = voiceSession !== null || voiceStatus === "connecting"
  const openChat = () => {
    setSettings(getHealthViewAgentSettings())
    setChatView("conversation")
    onOpenChange(true)
  }
  const controlClient = useMemo<HealthViewControlClient>(
    () => ({
      async executeCommand(command) {
        if (command.type === "ui/openPage") {
          setActivePage(command.pageId)
          return { message: `Opened ${command.pageId}.`, ok: true }
        }

        if (command.open) {
          setSettings(getHealthViewAgentSettings())
        }
        onOpenChange(command.open)
        return { message: command.open ? "Opened chat." : "Closed chat.", ok: true }
      },
    }),
    [onOpenChange, setActivePage],
  )

  useEffect(() => {
    let cancelled = false

    async function loadChat() {
      const client = await createHealthViewAgentClient({ controlClient })
      const thread = await client.getOrCreateActiveThread()
      const [nextMessages, nextThreads] = await Promise.all([
        client.listMessages(thread.id),
        listHealthViewAgentThreads(),
      ])

      if (!cancelled) {
        setActiveThreadId(thread.id)
        setMessages(nextMessages)
        setThreads(nextThreads)
      }
    }

    void loadChat()

    return () => {
      cancelled = true
    }
  }, [controlClient])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" })
  }, [messages, status, error, showingThreads])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing || event.key !== "Escape") return

      event.preventDefault()
      onOpenChange(false)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onOpenChange, open])

  useEffect(() => {
    let animationFrame = 0
    let revealFrame = 0
    let closeTimer: ReturnType<typeof setTimeout> | undefined

    animationFrame = window.requestAnimationFrame(() => {
      if (open) {
        setPanelRendered(true)
        revealFrame = window.requestAnimationFrame(() => setPanelVisible(true))
      } else {
        setPanelVisible(false)
        closeTimer = setTimeout(() => setPanelRendered(false), chatPanelTransitionMs)
      }
    })

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.cancelAnimationFrame(revealFrame)
      if (closeTimer) {
        clearTimeout(closeTimer)
      }
    }
  }, [open])

  async function refreshThreads() {
    setThreads(await listHealthViewAgentThreads())
  }

  async function loadThread(threadId: string) {
    const client = await createHealthViewAgentClient({ controlClient })
    setActiveThreadId(threadId)
    setMessages(await client.listMessages(threadId))
    await refreshThreads()
    goToConversation()
  }

  async function handleNewThread() {
    const thread = await createNewHealthViewAgentThread()
    setActiveThreadId(thread.id)
    setMessages([])
    await refreshThreads()
    goToConversation()
  }

  async function sendCurrentMessage() {
    const text = input.trim()
    if (!text || running) return

    setError(null)
    setStatus(null)
    setRunning(true)
    setInput("")

    try {
      const client = await createHealthViewAgentClient({ controlClient })
      for await (const agentEvent of client.run({
        text,
        threadId: activeThreadId,
        uiContext: {
          activePage,
          chatOpen: open,
        },
      })) {
        if ("type" in agentEvent) {
          if (agentEvent.type === "thread") {
            setActiveThreadId(agentEvent.thread.id)
          } else if (agentEvent.type === "user_message" || agentEvent.type === "assistant_message") {
            setMessages((current) => [...current, agentEvent.message])
          } else if (agentEvent.type === "status") {
            setStatus(agentEvent.message)
          } else if (agentEvent.type === "error") {
            setError(agentEvent.message)
          }
        }
      }
      setStatus(null)
      await refreshThreads()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to run the HealthView assistant.")
    } finally {
      setRunning(false)
    }
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await sendCurrentMessage()
  }

  async function handleVoiceToggle() {
    if (voiceSession) {
      voiceSession.stop()
      setVoiceSession(null)
      setVoiceStatus("closed")
      return
    }

    if (!voiceAvailable) {
      setError("Select xAI in Settings before starting voice chat.")
      return
    }

    setError(null)
    setStatus(null)
    setVoiceStatus("connecting")

    try {
      const client = await createHealthViewAgentClient({ controlClient })
      const thread = activeThreadId ? { id: activeThreadId } : await client.getOrCreateActiveThread()
      setActiveThreadId(thread.id)
      const session = await startXaiVoiceSession({
        controlClient,
        onError(nextError) {
          setError(nextError.message)
        },
        onStatus(nextStatus) {
          setVoiceStatus(nextStatus)
          if (nextStatus === "closed") {
            setVoiceSession(null)
          }
        },
        onTranscript(update) {
          setMessages((current) => mergeVoiceTranscript(current, update, thread.id))
        },
        uiContext: {
          activePage,
          chatOpen: open,
        },
      })
      setVoiceSession(session)
      await refreshThreads()
    } catch (caughtError) {
      setVoiceStatus("closed")
      setVoiceSession(null)
      setError(caughtError instanceof Error ? caughtError.message : "Unable to start xAI voice chat.")
    }
  }

  return (
    <>
      {!open && !panelRendered ? (
        <button
          aria-controls="healthview-chat-panel"
          aria-expanded="false"
          aria-label="Open chat"
          className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] right-4 z-40 flex size-14 items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/70 bg-card/75 text-foreground shadow-[0_18px_50px_rgba(15,23,42,0.16)] ring-1 ring-foreground/5 backdrop-blur-xl transition-[background,box-shadow,transform] duration-200 hover:bg-card/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-white/10 dark:bg-card/70 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)] md:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] md:right-6"
          title="Open chat"
          type="button"
          onClick={openChat}
        >
          <MessageCircle className="size-6" aria-hidden="true" strokeWidth={2.1} />
          <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-[color:var(--health-attention)] ring-2 ring-card" />
        </button>
      ) : null}

      {panelRendered ? (
        <aside
          aria-label="HealthView chat"
          className={cn(
            "fixed right-4 z-40 origin-bottom-right overflow-hidden rounded-[1.75rem] border border-white/70 text-foreground ring-1 ring-foreground/5 backdrop-blur-xl transition-[bottom,width,height,max-width,opacity,transform,background,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-white/10 dark:bg-card/70 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)] md:right-6",
            panelVisible
              ? "bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] h-[calc(100dvh-6rem-env(safe-area-inset-bottom,0px))] w-[calc(100vw-2rem)] max-w-[25rem] scale-100 bg-card/88 opacity-100 shadow-[0_24px_70px_rgba(15,23,42,0.22)] md:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] md:h-[calc(100dvh-3rem-env(safe-area-inset-bottom,0px))] md:w-[24rem]"
              : "pointer-events-none bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] size-14 max-w-[3.5rem] scale-95 bg-card/75 opacity-0 shadow-[0_18px_50px_rgba(15,23,42,0.16)] md:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]",
          )}
        >
      <div
        aria-hidden={!panelInteractive}
        className={cn(
          "flex h-full min-h-0 flex-col transition-[opacity,transform] duration-200",
          panelVisible ? "translate-y-0 opacity-100 delay-75" : "translate-y-3 opacity-0",
        )}
        id="healthview-chat-panel"
      >
        <header className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              aria-label="Show chat threads"
              aria-pressed={showingThreads}
              className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground transition-colors hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              onClick={goToThreads}
              tabIndex={open ? undefined : -1}
              title="Show chat threads"
              type="button"
            >
              <List className="size-5" aria-hidden="true" strokeWidth={2.1} />
            </button>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">{showingThreads ? "Chat threads" : "HealthView Chat"}</h2>
              <p className="truncate text-xs text-muted-foreground">
                {showingThreads
                  ? "Recent conversations"
                  : voiceActive
                    ? `xAI voice ${voiceStatus}`
                    : `${settings.provider === "openai" ? "OpenAI" : "xAI"} · ${settings.model}`}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              aria-label="New chat"
              className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground transition-colors hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              onClick={() => void handleNewThread()}
              tabIndex={open ? undefined : -1}
              title="New chat"
              type="button"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
            <button
              aria-label="Close chat"
              className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground transition-colors hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              onClick={() => onOpenChange(false)}
              tabIndex={open ? undefined : -1}
              title="Close chat"
              type="button"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <Separator />

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 pt-5">
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <section
              aria-hidden={showingThreads}
              className={cn(
                "absolute inset-0 flex min-h-0 flex-col gap-3 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                showingThreads ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100",
              )}
              style={{
                transform: showingThreads ? "translate3d(100%, 0, 0)" : "translate3d(0, 0, 0)",
              }}
            >
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="flex min-h-full flex-col justify-end gap-3 px-1">
                  {messages.length === 0 ? (
                    <div className="max-w-[88%] rounded-2xl bg-secondary px-3.5 py-2.5 text-sm leading-6 text-secondary-foreground">
                      Ask about your health map, warning signs, records, or care next steps.
                    </div>
                  ) : null}
                  {messages.map((message) => (
                    <div
                      className={cn(
                        "max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6",
                        message.role === "user"
                          ? "ml-auto bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground",
                      )}
                      key={message.id}
                    >
                      {message.text}
                    </div>
                  ))}
                  {status ? (
                    <div className="max-w-[88%] rounded-2xl bg-secondary/70 px-3.5 py-2.5 text-xs leading-5 text-muted-foreground">
                      {status}
                    </div>
                  ) : null}
                  {error ? (
                    <div className="max-w-[88%] rounded-2xl bg-destructive/10 px-3.5 py-2.5 text-sm leading-6 text-destructive">
                      {error}
                    </div>
                  ) : null}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <form className="flex items-center gap-1 rounded-full border bg-background/80 py-1 pl-3 pr-1" onSubmit={(event) => void handleSend(event)}>
                <input
                  aria-label="Message HealthView"
                  className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
                  disabled={running}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Message HealthView"
                  tabIndex={showingThreads ? -1 : undefined}
                  type="text"
                  value={input}
                />
                <Button
                  aria-label={voiceActive ? "Stop xAI voice" : "Start xAI voice"}
                  className={cn(
                    "size-9 rounded-full",
                    voiceActive && "bg-[color:var(--health-attention)] text-white hover:bg-[color:var(--health-attention)]/90",
                  )}
                  disabled={!voiceAvailable && !voiceActive}
                  onClick={() => void handleVoiceToggle()}
                  size="icon"
                  tabIndex={showingThreads ? -1 : undefined}
                  title={voiceAvailable ? "xAI voice" : "Select xAI in Settings for voice"}
                  type="button"
                  variant={voiceActive ? "default" : "ghost"}
                >
                  {voiceStatus === "connecting" ? (
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  ) : voiceActive ? (
                    <MicOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Mic className="size-4" aria-hidden="true" />
                  )}
                </Button>
                <Button
                  aria-label="Send message"
                  className="size-9 rounded-full"
                  disabled={!input.trim() || running}
                  size="icon"
                  tabIndex={showingThreads ? -1 : undefined}
                  onClick={() => void sendCurrentMessage()}
                  type="button"
                >
                  {running ? (
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="size-4" aria-hidden="true" />
                  )}
                </Button>
              </form>
            </section>

            <section
              aria-hidden={!showingThreads}
              className={cn(
                "absolute inset-0 flex min-h-0 flex-col gap-2 overflow-y-auto px-1 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                showingThreads ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
              )}
              style={{
                transform: showingThreads ? "translate3d(0, 0, 0)" : "translate3d(-100%, 0, 0)",
              }}
            >
              {threads.map((thread) => (
                <button
                  className="flex items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  key={thread.id}
                  onClick={() => void loadThread(thread.id)}
                  tabIndex={showingThreads ? undefined : -1}
                  type="button"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                    <MessageCircle className="size-4" aria-hidden="true" strokeWidth={2.1} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{thread.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {thread.id === activeThreadId ? "Active conversation" : "Saved locally"}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(thread.updatedAt)}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              ))}
            </section>
          </div>
        </div>
      </div>
        </aside>
      ) : null}
    </>
  )
}

function DesktopSidebar() {
  const collapsed = useNavigationStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useNavigationStore((state) => state.toggleSidebar)
  const toggleLabel = collapsed ? "Expand sidebar" : "Collapse sidebar"

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden h-dvh shrink-0 overflow-hidden border-r bg-sidebar px-3 py-5 text-sidebar-foreground transition-[width] duration-300 ease-out md:flex md:flex-col",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className="flex items-center">
        <Brand collapsed={collapsed} iconLabel={toggleLabel} onIconClick={toggleSidebar} />
      </div>
      <nav aria-label="Primary" className="mt-8 flex flex-col gap-1">
        <NavButtons collapsed={collapsed} />
      </nav>
      <button
        aria-label={collapsed ? "Account" : undefined}
        className="mt-auto flex h-10 w-full items-center rounded-xl px-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        title={collapsed ? "Account" : undefined}
        type="button"
      >
        <UserRound className="size-5 shrink-0" aria-hidden="true" />
        <div
          aria-hidden={collapsed}
          className={cn(
            "min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-200 ease-out",
            collapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100 delay-75",
            !collapsed && "ml-3",
          )}
        >
          <p className="truncate text-sm font-medium">Account</p>
          <p className="truncate text-xs text-muted-foreground">Personal profile</p>
        </div>
      </button>
    </aside>
  )
}

function Brand({
  collapsed = false,
  iconLabel,
  onIconClick,
}: {
  collapsed?: boolean
  iconLabel?: string
  onIconClick?: () => void
}) {
  const IconShell = onIconClick ? "button" : "div"

  return (
    <div className="flex w-full items-center" title={collapsed ? "HealthView OS" : undefined}>
      <IconShell
        aria-label={iconLabel}
        className={cn(
          "flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors",
          onIconClick && "hover:bg-primary/85 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
        onClick={onIconClick}
        title={iconLabel}
        type={onIconClick ? "button" : undefined}
      >
        <Activity className="size-5" aria-hidden="true" />
      </IconShell>
      <div
        aria-hidden={collapsed}
        className={cn(
          "min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-200 ease-out",
          collapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100 delay-75",
          !collapsed && "ml-3",
        )}
      >
        <p className="truncate text-sm font-semibold">HealthView OS</p>
        <p className="truncate text-xs text-muted-foreground">Personal health map</p>
      </div>
    </div>
  )
}

function NavButtons({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const activePage = useNavigationStore((state) => state.activePage)
  const setActivePage = useNavigationStore((state) => state.setActivePage)

  return navItems.map(({ id, label, icon: Icon }) => {
    const active = activePage === id

    return (
      <button
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? label : undefined}
        className={cn(
          "flex h-10 w-full items-center rounded-xl px-2.5 text-left text-sm font-medium transition-colors",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
        key={id}
        onClick={() => {
          setActivePage(id)
          onNavigate?.()
        }}
        title={collapsed ? label : undefined}
        type="button"
      >
        <Icon className="size-5 shrink-0" aria-hidden="true" />
        <span
          aria-hidden={collapsed}
          className={cn(
            "overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-200 ease-out",
            collapsed ? "max-w-0 opacity-0" : "max-w-32 opacity-100 delay-75",
            !collapsed && "ml-3",
          )}
        >
          {label}
        </span>
      </button>
    )
  })
}

function MobileHeader() {
  const activePage = useNavigationStore((state) => state.activePage)
  const title = navItems.find((item) => item.id === activePage)?.label ?? "Health"

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/85 px-4 py-3 backdrop-blur-xl md:hidden">
      <Brand />
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon-lg" aria-label="Open navigation">
            <Menu data-icon="inline-start" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72">
          <SheetHeader>
            <SheetTitle>HealthView OS</SheetTitle>
            <SheetDescription>Navigate personal health workspaces.</SheetDescription>
          </SheetHeader>
          <nav aria-label={`${title} navigation`} className="flex flex-col gap-1 px-3">
            <NavButtons />
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  )
}

function MobileTabbar() {
  const activePage = useNavigationStore((state) => state.activePage)
  const setActivePage = useNavigationStore((state) => state.setActivePage)

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:hidden"
    >
      <div className="flex w-full max-w-xl items-center gap-1 rounded-full border bg-background/80 p-1 shadow-lg backdrop-blur-xl">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = activePage === id

          return (
            <button
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full font-medium transition-colors",
                active ? "bg-secondary text-foreground" : "text-muted-foreground",
              )}
              key={id}
              onClick={() => setActivePage(id)}
              type="button"
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span className="truncate text-[10px] leading-none">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function PageContent() {
  const activePage = useNavigationStore((state) => state.activePage)
  const error = useWorkspaceStore((state) => state.error)
  const loadWorkspace = useWorkspaceStore((state) => state.loadWorkspace)
  const status = useWorkspaceStore((state) => state.status)

  if (status === "idle" || status === "loading") {
    return (
      <WorkspaceStateCard
        description="Opening the browser-local HealthView workspace."
        title="Opening local vault"
      />
    )
  }

  if (status === "error") {
    return (
      <WorkspaceStateCard
        action={
          <Button variant="outline" onClick={() => void loadWorkspace()}>
            Retry
          </Button>
        }
        description={error ?? "The browser-local workspace could not be opened."}
        title="Vault unavailable"
      />
    )
  }

  return (
    <div key={activePage} className="healthview-page-transition">
      {activePage === "health" ? (
        <HealthPage />
      ) : activePage === "settings" ? (
        <SettingsPage />
      ) : (
        <MockPage page={activePage} />
      )}
    </div>
  )
}

function WorkspaceStateCard({
  action,
  description,
  title,
}: {
  action?: ReactNode
  description: string
  title: string
}) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-7">
      <PageHeader title={title} description={description} action={action} />
      <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
        <CardContent className="flex items-center gap-3 py-6">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            <Database className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">Browser-local IndexedDB</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Health data remains local to this browser origin.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function HealthPage() {
  const [selectedClaim, setSelectedClaim] = useState<EvidenceBackedClaim | null>(null)
  const workspace = useWorkspaceStore((state) => state.workspace)
  const systemRows = selectSystemRows(workspace)
  const systemStatus = selectSystemStatus(workspace)
  const systemStatusRows = selectSystemStatusRows(workspace)
  const readiness = selectSystemReadiness(workspace)
  const upcomingCare = selectUpcomingCare(workspace)
  const vitals = selectVitals(workspace)
  const warningSigns = selectWarningSigns(workspace)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-7">
      <PageHeader
        title="Health"
        description="A visual operating layer for your current state, trends, warning signs, and care context."
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <HealthMapCard rows={systemRows} onOpenEvidence={setSelectedClaim} />
        <SystemStatusCard
          readiness={readiness}
          rows={systemStatusRows}
          statusClaim={systemStatus}
          onOpenEvidence={setSelectedClaim}
        />
      </section>

      <section
        aria-label="Vitals"
        className="-mx-4 -my-8 flex gap-4 overflow-x-auto overscroll-x-contain px-4 py-8 scroll-smooth [scrollbar-width:none] sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {vitals.map((vital) => (
          <div className="w-[17rem] shrink-0 sm:w-[18rem]" key={vital.id}>
            <VitalCard vital={vital} onOpenEvidence={setSelectedClaim} />
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <WarningSigns items={warningSigns} onOpenEvidence={setSelectedClaim} />
        <UpcomingCare items={upcomingCare} />
      </section>

      <EvidenceDialog
        claim={selectedClaim}
        open={Boolean(selectedClaim)}
        onOpenChange={(open) => {
          if (!open) setSelectedClaim(null)
        }}
      />
    </div>
  )
}

function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-4xl font-semibold leading-none sm:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

function EvidenceButton({
  claim,
  label = "Evidence",
  onOpenEvidence,
}: {
  claim: EvidenceBackedClaim
  label?: string
  onOpenEvidence: (claim: EvidenceBackedClaim) => void
}) {
  return (
    <Button variant="ghost" size="sm" onClick={() => onOpenEvidence(claim)}>
      {label}
    </Button>
  )
}

function HealthMapCard({
  onOpenEvidence,
  rows,
}: {
  onOpenEvidence: (claim: EvidenceBackedClaim) => void
  rows: HealthMapSignal[]
}) {
  const leadClaim = rows[Math.min(1, rows.length - 1)]

  return (
    <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
      <CardHeader>
        <CardTitle>Health map</CardTitle>
        <CardDescription>Body-system overview loaded from the local workspace.</CardDescription>
        <CardAction className="flex items-center gap-2">
          <Badge variant="secondary">Local vault</Badge>
          {leadClaim ? <EvidenceButton claim={leadClaim} label="Why?" onOpenEvidence={onOpenEvidence} /> : null}
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid gap-5 lg:grid-cols-[minmax(16rem,1fr)_16rem]">
          <div className="relative min-h-72 overflow-hidden rounded-2xl border bg-muted/30 sm:min-h-96">
            <div className="absolute left-4 top-4 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              Full body signal view
            </div>
            <BodySignalMap signals={rows} />
          </div>
          <SectionTable className="hidden lg:block">
            {rows.map((row) => (
              <SectionTableRow
                className="items-start"
                key={row.id}
                onClick={() => onOpenEvidence(row)}
                trailing={<span className="text-sm font-semibold text-foreground">{row.score}</span>}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{row.value}</p>
                  <Progress value={row.score} className="mt-3" />
                </div>
              </SectionTableRow>
            ))}
          </SectionTable>
        </div>
      </CardContent>
    </Card>
  )
}

function BodySignalMap({ signals }: { signals: HealthMapSignal[] }) {
  return (
    <div className="flex h-full min-h-72 items-center justify-center p-6 sm:min-h-96 sm:p-8">
      <svg
        aria-label="Body systems signal map"
        className="h-full max-h-[34rem] w-full max-w-xl"
        role="img"
        viewBox="0 0 520 560"
      >
        <defs>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="16" floodOpacity="0.08" stdDeviation="18" />
          </filter>
        </defs>
        <path
          d="M261 78c38 0 69 30 69 68 0 25-13 47-33 59 42 15 73 54 76 101l8 120c2 28-20 52-48 52h-18l-16-128-19 145c-3 21-21 37-42 37s-39-16-42-37l-19-145-16 128h-18c-28 0-50-24-48-52l8-120c3-47 34-86 76-101-20-12-33-34-33-59 0-38 31-68 69-68Z"
          fill="white"
          filter="url(#softShadow)"
          stroke="currentColor"
          strokeOpacity="0.12"
          strokeWidth="2"
        />
        {bodySignalNodes.map((node) => {
          const signal = signals.find((item) => item.label.toLowerCase().includes(node.label.toLowerCase()))
          const value = signal?.score ?? node.value

          return (
            <g key={node.label}>
              <circle
                cx={node.cx}
                cy={node.cy}
                fill="var(--health-signal-fill)"
                r={node.r}
                stroke="var(--health-signal-border)"
                strokeWidth="1.5"
              />
              <text
                fill="var(--foreground)"
                fontSize="15"
                fontWeight="650"
                textAnchor="middle"
                x={node.cx}
                y={node.cy + 5}
              >
                {value}
              </text>
            </g>
          )
        })}
        <path
          d="M128 120h70M322 120h70M96 282h82M342 282h82M124 474h78M318 474h78"
          stroke="currentColor"
          strokeLinecap="round"
          strokeOpacity="0.12"
          strokeWidth="2"
        />
        <g fill="var(--muted-foreground)" fontSize="12" fontWeight="550">
          {bodySignalLabels.map((item) => (
            <text key={item.label} x={item.x} y={item.y}>
              {item.label}
            </text>
          ))}
        </g>
      </svg>
    </div>
  )
}

function SystemStatusCard({
  onOpenEvidence,
  readiness,
  rows,
  statusClaim,
}: {
  onOpenEvidence: (claim: EvidenceBackedClaim) => void
  readiness: number
  rows: SystemStatusRow[]
  statusClaim: EvidenceBackedClaim
}) {
  return (
    <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
      <CardHeader>
        <CardTitle>System status</CardTitle>
        <CardDescription>Current model confidence and data freshness.</CardDescription>
        <CardAction>
          <EvidenceButton claim={statusClaim} label="Evidence" onOpenEvidence={onOpenEvidence} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-2xl bg-secondary p-4">
          <p className="text-sm font-medium text-muted-foreground">Overall readiness</p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <span className="text-5xl font-semibold leading-none">{readiness}</span>
            <Badge variant="secondary">Good</Badge>
          </div>
          <Progress value={readiness} className="mt-5" />
        </div>
        <SectionTable>
          {rows.map(({ label, value }) => (
            <SectionTableRow
              key={label}
              title={label}
              trailing={<span className="text-sm font-medium text-foreground">{value}</span>}
            />
          ))}
        </SectionTable>
      </CardContent>
    </Card>
  )
}

function VitalCard({
  onOpenEvidence,
  vital,
}: {
  onOpenEvidence: (claim: EvidenceBackedClaim) => void
  vital: VisualVitalMetric
}) {
  return (
    <Card className={metricCardClass}>
      <CardHeader className="gap-1.5">
        <CardTitle>{vital.title}</CardTitle>
        <CardDescription>{vital.detail}</CardDescription>
        <CardAction className="pt-0.5">
          <EvidenceButton claim={vital} label={`${vital.evidence.length} source`} onOpenEvidence={onOpenEvidence} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-semibold leading-none">{vital.value}</span>
          {vital.unit ? <span className="text-xs text-muted-foreground">{vital.unit}</span> : null}
        </div>
        <Progress value={vital.score} className="mt-4" />
      </CardContent>
    </Card>
  )
}

function WarningSigns({
  items,
  onOpenEvidence,
}: {
  items: WarningSign[]
  onOpenEvidence: (claim: EvidenceBackedClaim) => void
}) {
  return (
    <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
      <CardHeader>
        <CardTitle>Warning signs</CardTitle>
        <CardDescription>Early signals surfaced from recent workspace trends.</CardDescription>
      </CardHeader>
      <CardContent>
        <SectionTable>
          {items.map((item) => (
            <SectionTableRow
              className="items-start"
              disclosure
              key={item.id}
              leading={
                <div
                  className={cn(
                    "mt-2 size-2 rounded-full",
                    item.tone === "attention"
                      ? "bg-[color:var(--health-attention)]"
                      : item.tone === "watch"
                        ? "bg-[color:var(--health-watch)]"
                        : "bg-muted-foreground",
                  )}
                />
              }
              onClick={() => onOpenEvidence(item)}
              trailing={<Badge variant="secondary">{item.confidence}</Badge>}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
            </SectionTableRow>
          ))}
        </SectionTable>
      </CardContent>
    </Card>
  )
}

function UpcomingCare({ items }: { items: UpcomingCareItem[] }) {
  return (
    <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
      <CardHeader>
        <CardTitle>Upcoming care</CardTitle>
        <CardDescription>Events and reminders connected to your care plan.</CardDescription>
      </CardHeader>
      <CardContent>
        <SectionTable>
          {items.map(({ title, detail }, index) => {
            const Icon = careIcons[index] ?? CalendarDays

            return <SectionTableRow icon={Icon} key={title} subtitle={detail} title={title} />
          })}
        </SectionTable>
      </CardContent>
    </Card>
  )
}

function SettingsPage() {
  const error = useWorkspaceStore((state) => state.error)
  const exportWorkspaceJson = useWorkspaceStore((state) => state.exportWorkspaceJson)
  const importWorkspaceJson = useWorkspaceStore((state) => state.importWorkspaceJson)
  const resetWorkspace = useWorkspaceStore((state) => state.resetWorkspace)
  const workspace = useWorkspaceStore((state) => state.workspace)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<"export" | "import" | "reset" | null>(null)
  const summary = pageSummaries.settings
  const Icon = summary.icon
  const workspaceSummary = selectWorkspaceSummary(workspace)
  const [agentSettings, setAgentSettings] = useState<HealthViewAgentSettings>(() => getHealthViewAgentSettings())
  const [agentProvider, setAgentProvider] = useState<HealthViewAgentProviderId>(agentSettings.provider)
  const [agentModel, setAgentModel] = useState(agentSettings.model)
  const [agentApiKey, setAgentApiKey] = useState(agentSettings.apiKey ?? "")
  const [agentMessage, setAgentMessage] = useState<string | null>(null)
  const selectedProviderOption =
    healthViewProviderOptions.find((option) => option.id === agentProvider) ?? healthViewProviderOptions[0]

  function handleAgentProviderChange(provider: HealthViewAgentProviderId) {
    const option = healthViewProviderOptions.find((item) => item.id === provider) ?? healthViewProviderOptions[0]
    setAgentProvider(provider)
    setAgentModel(option.defaultModel)
    setAgentMessage(null)
  }

  function handleSaveAgentSettings() {
    const nextSettings = updateHealthViewAgentSettings({
      apiKey: agentApiKey,
      model: agentModel,
      provider: agentProvider,
    })
    setAgentSettings(nextSettings)
    setAgentMessage(`${selectedProviderOption.label} saved for HealthView Chat.`)
  }

  async function runVaultAction(action: "export" | "import" | "reset", task: () => Promise<string>) {
    setActionError(null)
    setActionMessage(null)
    setBusyAction(action)

    try {
      const message = await task()
      setActionMessage(message)
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : "The vault action failed.")
    } finally {
      setBusyAction(null)
    }
  }

  async function handleReset() {
    await runVaultAction("reset", async () => {
      await resetWorkspace()
      return "Demo vault reset to the validated synthetic seed."
    })
  }

  async function handleExport() {
    await runVaultAction("export", async () => {
      const json = await exportWorkspaceJson()
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }))
      const anchor = document.createElement("a")

      anchor.href = url
      anchor.download = "healthviewos-workspace.json"
      anchor.click()
      URL.revokeObjectURL(url)

      return "Workspace JSON exported from browser-local storage."
    })
  }

  async function handleImport(file: File | undefined) {
    if (!file) {
      return
    }

    await runVaultAction("import", async () => {
      await importWorkspaceJson(await file.text())
      return "Workspace JSON imported and validated."
    })
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-7">
      <PageHeader title={summary.title} description={summary.description} />

      <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
        <CardHeader>
          <CardTitle>AI assistant</CardTitle>
          <CardDescription>Provider, model, and browser-local key for HealthView Chat.</CardDescription>
          <CardAction>
            <Badge variant={agentSettings.apiKey ? "secondary" : "outline"}>
              {agentSettings.apiKey ? "Configured" : "Key needed"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SectionTable>
            <SectionTableRow
              title={
                <label htmlFor="agent-provider-select">
                  Provider
                </label>
              }
              subtitle="Assistant backend for HealthView Chat."
              trailing={
                <select
                  id="agent-provider-select"
                  className={settingsFieldControlClass}
                  value={agentProvider}
                  onChange={(event) => handleAgentProviderChange(event.target.value as HealthViewAgentProviderId)}
                >
                  {healthViewProviderOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              }
            />

            <SectionTableRow
              title={
                <label htmlFor="agent-model-select">
                  Model
                </label>
              }
              subtitle="Default model for text calls."
              trailing={
                <select
                  id="agent-model-select"
                  className={settingsFieldControlClass}
                  value={agentModel}
                  onChange={(event) => {
                    setAgentModel(event.target.value)
                    setAgentMessage(null)
                  }}
                >
                  {selectedProviderOption.models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              }
            />

            <SectionTableRow
              title={
                <label htmlFor="agent-api-key-input">
                  API key
                </label>
              }
              subtitle="Stored in this browser only."
              trailing={
                <input
                  id="agent-api-key-input"
                  autoComplete="off"
                  className={cn(settingsFieldControlClass, "placeholder:text-muted-foreground")}
                  placeholder={agentProvider === "openai" ? "sk-..." : "xai-..."}
                  type="password"
                  value={agentApiKey}
                  onChange={(event) => {
                    setAgentApiKey(event.target.value)
                    setAgentMessage(null)
                  }}
                />
              }
            />

            <SectionTableRow
              title="Text calls"
              subtitle="Requests use this browser-local key directly."
              trailing={
                <Button onClick={handleSaveAgentSettings} type="button">
                  <Save data-icon="inline-start" />
                  Save AI settings
                </Button>
              }
            />

            {agentMessage ? (
              <SectionTableRow className="bg-secondary/55" title={agentMessage} />
            ) : null}
          </SectionTable>
        </CardContent>
      </Card>

      <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
        <CardHeader>
          <CardTitle>Local demo vault</CardTitle>
          <CardDescription>Persistent browser storage for demo patient workspaces.</CardDescription>
          <CardAction>
            <Badge variant="secondary">Browser-local IndexedDB</Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SectionTable>
            {workspaceSummary.map((row) => (
              <SectionTableRow
                key={row.label}
                title={row.label}
                trailing={<span className="max-w-52 truncate text-right text-sm font-medium text-foreground">{row.value}</span>}
              />
            ))}
          </SectionTable>

          <div className="flex flex-wrap gap-2">
            <Button disabled={Boolean(busyAction)} variant="outline" onClick={() => void handleReset()}>
              <RotateCcw data-icon="inline-start" />
              Reset demo vault
            </Button>
            <Button disabled={Boolean(busyAction)} variant="outline" onClick={() => void handleExport()}>
              <Download data-icon="inline-start" />
              Export JSON
            </Button>
            <Button disabled={Boolean(busyAction)} variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload data-icon="inline-start" />
              Import JSON
            </Button>
            <input
              ref={fileInputRef}
              accept="application/json,.json"
              className="sr-only"
              type="file"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                void handleImport(file)
                event.currentTarget.value = ""
              }}
            />
          </div>

          {actionMessage ? (
            <p className="rounded-xl bg-secondary px-3 py-2 text-sm text-secondary-foreground">{actionMessage}</p>
          ) : null}
          {actionError || error ? (
            <p className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive">
              <AlertCircle className="mt-1 size-4 shrink-0" aria-hidden="true" />
              <span>{actionError ?? error}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
        <CardHeader>
          <CardTitle>{summary.title} workspace</CardTitle>
          <CardDescription>Privacy, connections, notifications, and local vault preferences.</CardDescription>
          <CardAction>
            <div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <Icon className="size-4" aria-hidden="true" />
            </div>
          </CardAction>
        </CardHeader>
        <CardContent>
          <SectionTable>
            {summary.rows.map((row) => (
              <SectionTableRow
                disclosure
                icon={Icon}
                key={row.title}
                subtitle={row.description}
                title={row.title}
                trailing={<Badge variant="secondary">{row.meta}</Badge>}
              />
            ))}
          </SectionTable>
        </CardContent>
      </Card>
    </div>
  )
}

function MockPage({ page }: { page: Exclude<PageId, "health"> }) {
  const summary = pageSummaries[page]
  const Icon = summary.icon

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-7">
      <PageHeader title={summary.title} description={summary.description} />
      <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
        <CardHeader>
          <CardTitle>{summary.title} workspace</CardTitle>
          <CardDescription>Mock content scaffolded for the first HealthView OS prototype.</CardDescription>
          <CardAction>
            <div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <Icon className="size-4" aria-hidden="true" />
            </div>
          </CardAction>
        </CardHeader>
        <CardContent>
          <SectionTable>
            {summary.rows.map((row) => (
              <SectionTableRow
                disclosure
                icon={Icon}
                key={row.title}
                subtitle={row.description}
                title={row.title}
                trailing={<Badge variant="secondary">{row.meta}</Badge>}
              />
            ))}
          </SectionTable>
        </CardContent>
      </Card>
    </div>
  )
}

export default App
