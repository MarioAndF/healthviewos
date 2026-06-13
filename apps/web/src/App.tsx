import type { EvidenceBackedClaim } from "@healthviewos/schema"
import {
  Activity,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  Heart,
  Hospital,
  List,
  Menu,
  MessageCircle,
  Send,
  Settings,
  Stethoscope,
  UserRound,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react"
import { useState, type ReactNode } from "react"

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
  systemRows,
  systemStatus,
  upcomingCare,
  vitals,
  warningSigns,
} from "@/data/mock-health"
import { cn } from "@/lib/utils"
import { useNavigationStore, type PageId } from "@/store/navigation"

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

const mockChatThreads = [
  {
    id: "signals",
    title: "Warning signs review",
    preview: "Review today's signals.",
    meta: "Now",
  },
  {
    id: "records",
    title: "Records summary",
    preview: "Recent labs and visit notes",
    meta: "12m",
  },
  {
    id: "care",
    title: "Care next steps",
    preview: "Upcoming care plan reminders",
    meta: "Yesterday",
  },
]

function App() {
  const sidebarCollapsed = useNavigationStore((state) => state.sidebarCollapsed)
  const [chatOpen, setChatOpen] = useState(false)

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
  const [chatView, setChatView] = useState<"conversation" | "threads">("conversation")
  const showingThreads = chatView === "threads"
  const goToThreads = () => setChatView("threads")
  const goToConversation = () => setChatView("conversation")

  return (
    <aside
      aria-label="HealthView chat"
      className={cn(
        "fixed right-4 z-40 overflow-hidden rounded-[1.75rem] border border-white/70 bg-card/75 text-foreground shadow-[0_18px_50px_rgba(15,23,42,0.16)] ring-1 ring-foreground/5 backdrop-blur-xl transition-[bottom,width,height,background,box-shadow] duration-300 ease-out dark:border-white/10 dark:bg-card/70 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)] md:right-6",
        open
          ? "bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] h-[calc(100dvh-6rem-env(safe-area-inset-bottom,0px))] w-[calc(100vw-2rem)] max-w-[25rem] bg-card/88 shadow-[0_24px_70px_rgba(15,23,42,0.22)] md:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] md:h-[calc(100dvh-3rem-env(safe-area-inset-bottom,0px))] md:w-[24rem]"
          : "bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] size-14 md:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]",
      )}
    >
      <button
        aria-controls="healthview-chat-panel"
        aria-expanded={open}
        aria-label="Open chat"
        className={cn(
          "absolute inset-0 z-10 flex items-center justify-center text-foreground transition-[opacity,transform,background] duration-200 hover:bg-card/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          open ? "pointer-events-none scale-75 opacity-0" : "scale-100 opacity-100",
        )}
        tabIndex={open ? -1 : undefined}
        title="Open chat"
        type="button"
        onClick={() => {
          setChatView("conversation")
          onOpenChange(true)
        }}
      >
        <MessageCircle className="size-6" aria-hidden="true" strokeWidth={2.1} />
        <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-[color:var(--health-attention)] ring-2 ring-card" />
      </button>

      <div
        aria-hidden={!open}
        className={cn(
          "flex h-full min-h-0 flex-col transition-[opacity,transform] duration-200",
          open ? "translate-y-0 opacity-100 delay-100" : "pointer-events-none translate-y-3 opacity-0",
        )}
        id="healthview-chat-panel"
      >
        <header className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
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
                {showingThreads ? "Recent conversations" : "Local assistant panel"}
              </p>
            </div>
          </div>
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
        </header>

        <Separator />

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 pt-5">
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <section
              aria-hidden={showingThreads}
              className={cn(
                "absolute inset-0 flex min-h-0 flex-col gap-3 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                showingThreads ? "opacity-0" : "opacity-100",
              )}
              style={{
                transform: showingThreads ? "translate3d(100%, 0, 0)" : "translate3d(0, 0, 0)",
              }}
            >
              <div className="min-h-0 flex-1 overflow-hidden">
                <div className="flex h-full flex-col justify-end gap-3 px-1">
                  <div className="max-w-[88%] rounded-2xl bg-secondary px-3.5 py-2.5 text-sm leading-6 text-secondary-foreground">
                    Ask about your health map, warning signs, records, or care next steps.
                  </div>
                  <div className="ml-auto max-w-[80%] rounded-2xl bg-primary px-3.5 py-2.5 text-sm leading-6 text-primary-foreground">
                    Review today&apos;s signals.
                  </div>
                  <div className="max-w-[88%] rounded-2xl bg-secondary px-3.5 py-2.5 text-sm leading-6 text-secondary-foreground">
                    Chat execution will connect here next.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 rounded-full border bg-background/80 py-1 pl-3 pr-1">
                <input
                  aria-label="Message HealthView"
                  className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
                  disabled
                  placeholder="Message HealthView"
                  tabIndex={showingThreads ? -1 : undefined}
                  type="text"
                />
                <Button
                  aria-label="Send message"
                  className="size-9 rounded-full"
                  disabled
                  size="icon"
                  tabIndex={showingThreads ? -1 : undefined}
                  type="button"
                >
                  <Send className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </section>

            <section
              aria-hidden={!showingThreads}
              className={cn(
                "absolute inset-0 flex min-h-0 flex-col gap-2 overflow-y-auto px-1 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                showingThreads ? "opacity-100" : "opacity-0",
              )}
              style={{
                transform: showingThreads ? "translate3d(0, 0, 0)" : "translate3d(-100%, 0, 0)",
              }}
            >
              {mockChatThreads.map((thread) => (
                <button
                  className="flex items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  key={thread.id}
                  onClick={goToConversation}
                  tabIndex={showingThreads ? undefined : -1}
                  type="button"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                    <MessageCircle className="size-4" aria-hidden="true" strokeWidth={2.1} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{thread.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{thread.preview}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{thread.meta}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              ))}
            </section>
          </div>
        </div>
      </div>
    </aside>
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

  return (
    <div key={activePage} className="healthview-page-transition">
      {activePage === "health" ? <HealthPage /> : <MockPage page={activePage} />}
    </div>
  )
}

function HealthPage() {
  const [selectedClaim, setSelectedClaim] = useState<EvidenceBackedClaim | null>(null)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-7">
      <PageHeader
        title="Health"
        description="A visual operating layer for your current state, trends, warning signs, and care context."
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <HealthMapCard onOpenEvidence={setSelectedClaim} />
        <SystemStatusCard onOpenEvidence={setSelectedClaim} />
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
        <WarningSigns onOpenEvidence={setSelectedClaim} />
        <UpcomingCare />
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
}: {
  onOpenEvidence: (claim: EvidenceBackedClaim) => void
}) {
  return (
    <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
      <CardHeader>
        <CardTitle>Health map</CardTitle>
        <CardDescription>Mock body-system overview with provenance-ready signals.</CardDescription>
        <CardAction className="flex items-center gap-2">
          <Badge variant="secondary">Live mock</Badge>
          <EvidenceButton claim={systemRows[1]} label="Why?" onOpenEvidence={onOpenEvidence} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid gap-5 lg:grid-cols-[minmax(16rem,1fr)_16rem]">
          <div className="relative min-h-72 overflow-hidden rounded-2xl border bg-muted/30 sm:min-h-96">
            <div className="absolute left-4 top-4 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              Full body signal view
            </div>
            <BodySignalMap />
          </div>
          <SectionTable className="hidden lg:block">
            {systemRows.map((row) => (
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

function BodySignalMap() {
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
        {bodySignalNodes.map((node) => (
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
              {node.value}
            </text>
          </g>
        ))}
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
}: {
  onOpenEvidence: (claim: EvidenceBackedClaim) => void
}) {
  return (
    <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
      <CardHeader>
        <CardTitle>System status</CardTitle>
        <CardDescription>Current model confidence and data freshness.</CardDescription>
        <CardAction>
          <EvidenceButton claim={systemStatus} label="Evidence" onOpenEvidence={onOpenEvidence} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-2xl bg-secondary p-4">
          <p className="text-sm font-medium text-muted-foreground">Overall readiness</p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <span className="text-5xl font-semibold leading-none">82</span>
            <Badge variant="secondary">Good</Badge>
          </div>
          <Progress value={82} className="mt-5" />
        </div>
        <SectionTable>
          {[
            ["Connected sources", "6"],
            ["Latest sync", "11 min ago"],
            ["Unreviewed signals", "3"],
            ["Evidence coverage", "74%"],
          ].map(([label, value]) => (
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
  vital: (typeof vitals)[number]
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
  onOpenEvidence,
}: {
  onOpenEvidence: (claim: EvidenceBackedClaim) => void
}) {
  return (
    <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
      <CardHeader>
        <CardTitle>Warning signs</CardTitle>
        <CardDescription>Mock early signals surfaced from recent trends.</CardDescription>
      </CardHeader>
      <CardContent>
        <SectionTable>
          {warningSigns.map((item) => (
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

function UpcomingCare() {
  return (
    <Card className={cn(sectionCardClass, "rounded-2xl [--card-spacing:--spacing(5)]")}>
      <CardHeader>
        <CardTitle>Upcoming care</CardTitle>
        <CardDescription>Events and reminders connected to your care plan.</CardDescription>
      </CardHeader>
      <CardContent>
        <SectionTable>
          {upcomingCare.map(({ title, detail }, index) => {
            const Icon = careIcons[index] ?? CalendarDays

            return <SectionTableRow icon={Icon} key={title} subtitle={detail} title={title} />
          })}
        </SectionTable>
      </CardContent>
    </Card>
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
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Data coverage", "74%"],
          ["Review queue", "3"],
          ["Last sync", "11m"],
        ].map(([label, value]) => (
          <Card className={metricCardClass} key={label}>
            <CardHeader className="gap-1.5">
              <CardTitle>{label}</CardTitle>
              <CardDescription>Prototype metric</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold leading-none">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default App
