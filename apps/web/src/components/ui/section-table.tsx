import { ChevronRight, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

function SectionTable({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-background/90 text-card-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:bg-background/45 dark:shadow-none",
        className,
      )}
      role="list"
    >
      {children}
    </div>
  )
}

function SectionTableRow({
  children,
  className,
  description,
  disclosure = false,
  icon: Icon,
  leading,
  onClick,
  subtitle,
  title,
  trailing,
}: {
  children?: ReactNode
  className?: string
  description?: ReactNode
  disclosure?: boolean
  icon?: LucideIcon
  leading?: ReactNode
  onClick?: () => void
  subtitle?: ReactNode
  title?: ReactNode
  trailing?: ReactNode
}) {
  const content = (
    <>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      {Icon ? (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </div>
      ) : null}
      {children ? (
        children
      ) : (
        <div className="min-w-0 flex-1">
          {title ? <p className="truncate text-sm font-medium">{title}</p> : null}
          {subtitle ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p> : null}
          {description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
        </div>
      )}
      {trailing || disclosure ? (
        <div className="ml-auto flex shrink-0 items-center gap-2 text-muted-foreground">
          {trailing}
          {disclosure ? (
            <ChevronRight
              className="size-4 text-muted-foreground/70 transition-transform group-hover/section-row:translate-x-0.5"
              aria-hidden="true"
            />
          ) : null}
        </div>
      ) : null}
    </>
  )
  const rowClassName = cn(
    "group/section-row flex min-h-14 w-full items-center gap-3 border-b px-3.5 py-3 text-left last:border-b-0",
    onClick &&
      "transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
    className,
  )

  if (onClick) {
    return (
      <button className={rowClassName} onClick={onClick} role="listitem" type="button">
        {content}
      </button>
    )
  }

  return (
    <div className={rowClassName} role="listitem">
      {content}
    </div>
  )
}

function SectionTableKeyRow({
  className,
  description,
  label,
  trailing,
}: {
  className?: string
  description: ReactNode
  label: ReactNode
  trailing?: ReactNode
}) {
  return (
    <SectionTableRow className={cn("items-start", className)}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </SectionTableRow>
  )
}

export { SectionTable, SectionTableKeyRow, SectionTableRow }
