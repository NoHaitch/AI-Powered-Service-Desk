import type { ComponentProps, ReactNode } from 'react'
import { RiHeadphoneLine } from '@remixicon/react'

import { Badge } from '@/shared/components/ui/badge'
import { buttonVariants } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import type { Priority } from '@/features/incidents/incident-model'
import { ticketStatuses, type TicketStatus } from '@/features/tickets/ticket-preview'

export function Brand({ short = false }: { short?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5 whitespace-nowrap">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <RiHeadphoneLine className="size-5" aria-hidden="true" />
      </span>
      {short ? null : <span className="truncate text-[15px] font-bold tracking-tight">Service Desk</span>}
    </span>
  )
}

export function ActionLink({
  className, variant = 'default', ...props
}: ComponentProps<'a'> & { variant?: 'default' | 'outline' | 'ghost' }) {
  return <a className={cn(buttonVariants({ variant }), className)} {...props} />
}

export function PageHeading({
  title, description, actions,
}: { title: string; description: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="wrap-anywhere text-3xl font-bold tracking-tight sm:text-[2rem]">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {actions}
    </div>
  )
}

const priorityStyles: Record<Priority, string> = {
  P1: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  P2: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  P3: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  P4: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
}

export function PriorityBadge({ priority }: { priority: Priority | null }) {
  return priority
    ? <Badge className={priorityStyles[priority]}>{priority}</Badge>
    : <span className="whitespace-nowrap text-xs text-muted-foreground">Pending triage</span>
}

const statusStyles: Record<TicketStatus, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  triaged: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  assigned: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200',
  inProgress: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  closed: 'bg-muted text-muted-foreground',
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge className={statusStyles[status]}>
      <span className="size-1.5 rounded-full bg-current" />
      {ticketStatuses[status]}
    </Badge>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-border py-4 text-xs text-muted-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 px-5 sm:px-8">
        <span>© {new Date().getFullYear()} NoHaitch · AI-Powered Service Desk</span>
        <div className="flex flex-wrap gap-4">
          <a className="hover:text-foreground" href="/about">About</a>
          <a className="hover:text-foreground" href="/help">Help</a>
          <a className="hover:text-foreground" href="https://github.com/NoHaitch/AI-Powered-Service-Desk">GitHub</a>
        </div>
      </div>
    </footer>
  )
}
