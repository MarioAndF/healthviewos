import type { EvidenceBackedClaim } from "@healthviewos/schema"
import {
  Activity,
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  HeartPulse,
  Hospital,
  Menu,
  Settings,
  Stethoscope,
  UserRound,
  WalletCards,
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
  { id: "health", label: "Health", icon: HeartPulse },
  { id: "services", label: "Services", icon: Hospital },
  { id: "records", label: "Records", icon: ClipboardList },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "settings", label: "Settings", icon: Settings },
]

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

function App() {
  const sidebarCollapsed = useNavigationStore((state) => state.sidebarCollapsed)

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
      <MobileTabbar />
    </div>
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
                "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full text-xs font-medium transition-colors",
                active ? "bg-secondary text-foreground" : "text-muted-foreground",
              )}
              key={id}
              onClick={() => setActivePage(id)}
              type="button"
            >
              <Icon className="size-4" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function PageContent() {
  const activePage = useNavigationStore((state) => state.activePage)

  if (activePage === "health") {
    return <HealthPage />
  }

  return <MockPage page={activePage} />
}

function HealthPage() {
  const [selectedClaim, setSelectedClaim] = useState<EvidenceBackedClaim | null>(null)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-7">
      <PageHeader
        title="Health"
        description="A visual operating layer for your current state, trends, warning signs, and care context."
        action={
          <Button variant="outline" size="lg" onClick={() => setSelectedClaim(warningSigns[0])}>
            <Bell data-icon="inline-start" />
            Review signals
          </Button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <HealthMapCard onOpenEvidence={setSelectedClaim} />
        <SystemStatusCard onOpenEvidence={setSelectedClaim} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {vitals.map((vital) => (
          <VitalCard key={vital.id} vital={vital} onOpenEvidence={setSelectedClaim} />
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
    <Card className="rounded-2xl [--card-spacing:--spacing(5)]">
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
          <div className="hidden flex-col gap-3 lg:flex">
            {systemRows.map((row) => (
              <button
                className="rounded-xl border bg-background p-3 text-left transition-colors hover:bg-muted/40"
                key={row.id}
                onClick={() => onOpenEvidence(row)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.value}</p>
                  </div>
                  <span className="text-sm font-semibold">{row.score}</span>
                </div>
                <Progress value={row.score} className="mt-3" />
              </button>
            ))}
          </div>
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
    <Card className="rounded-2xl [--card-spacing:--spacing(5)]">
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
        <Separator />
        {[
          ["Connected sources", "6"],
          ["Latest sync", "11 min ago"],
          ["Unreviewed signals", "3"],
          ["Evidence coverage", "74%"],
        ].map(([label, value]) => (
          <div className="flex items-center justify-between gap-4" key={label}>
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-medium">{value}</span>
          </div>
        ))}
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
    <Card className="rounded-2xl" size="sm">
      <CardHeader>
        <CardTitle>{vital.title}</CardTitle>
        <CardDescription>{vital.detail}</CardDescription>
        <CardAction>
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
    <Card className="rounded-2xl [--card-spacing:--spacing(5)]">
      <CardHeader>
        <CardTitle>Warning signs</CardTitle>
        <CardDescription>Mock early signals surfaced from recent trends.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {warningSigns.map((item) => (
          <button
            className="flex items-start gap-3 rounded-xl border bg-background p-3 text-left transition-colors hover:bg-muted/40"
            key={item.id}
            onClick={() => onOpenEvidence(item)}
            type="button"
          >
            <div
              className={cn(
                "mt-1 size-2 rounded-full",
                item.tone === "attention"
                  ? "bg-[color:var(--health-attention)]"
                  : item.tone === "watch"
                    ? "bg-[color:var(--health-watch)]"
                    : "bg-muted-foreground",
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{item.title}</p>
                <Badge variant="secondary">{item.confidence}</Badge>
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
            </div>
            <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        ))}
      </CardContent>
    </Card>
  )
}

function UpcomingCare() {
  return (
    <Card className="rounded-2xl [--card-spacing:--spacing(5)]">
      <CardHeader>
        <CardTitle>Upcoming care</CardTitle>
        <CardDescription>Events and reminders connected to your care plan.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {upcomingCare.map(({ title, detail }, index) => {
          const Icon = careIcons[index] ?? CalendarDays

          return (
            <div className="flex items-center gap-3" key={title}>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <Icon className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{title}</p>
                <p className="truncate text-xs text-muted-foreground">{detail}</p>
              </div>
            </div>
          )
        })}
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
      <Card className="rounded-2xl [--card-spacing:--spacing(5)]">
        <CardHeader>
          <CardTitle>{summary.title} workspace</CardTitle>
          <CardDescription>Mock content scaffolded for the first HealthView OS prototype.</CardDescription>
          <CardAction>
            <div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <Icon className="size-4" aria-hidden="true" />
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {summary.rows.map((row) => (
            <div className="flex items-center justify-between gap-4 rounded-xl border bg-background p-4" key={row.title}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.title}</p>
                <p className="mt-1 truncate text-sm text-muted-foreground">{row.description}</p>
              </div>
              <Badge variant="secondary">{row.meta}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Data coverage", "74%"],
          ["Review queue", "3"],
          ["Last sync", "11m"],
        ].map(([label, value]) => (
          <Card className="rounded-2xl" key={label} size="sm">
            <CardHeader>
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
