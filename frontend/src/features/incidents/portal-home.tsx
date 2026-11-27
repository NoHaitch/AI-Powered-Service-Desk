import {
  RiArrowRightLine, RiBookOpenLine, RiCustomerService2Line, RiErrorWarningLine,
  RiFileList3Line, RiSearchLine, RiSparkling2Line,
} from '@remixicon/react'

import { ActionLink, StatusBadge } from '@/app/ui'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import type { Persona } from '@/features/auth/preview-personas'
import type { PreviewTicket } from '@/features/tickets/ticket-preview'

const actions = [
  { href: '/portal/incidents/new', title: 'Report an incident', description: 'Tell us about a disruption or technical issue.', icon: RiErrorWarningLine },
  { href: '/portal/catalog', title: 'Request a service', description: 'Find the right way to ask for IT services.', icon: RiCustomerService2Line },
  { href: '/portal/knowledge', title: 'Browse knowledge', description: 'Find articles and troubleshooting guidance.', icon: RiBookOpenLine },
  { href: '/portal/assistant', title: 'Ask the AI assistant', description: 'Get answers backed by service desk knowledge.', icon: RiSparkling2Line, planned: true },
]

export function PortalHome({ persona, tickets }: { persona: Persona; tickets: PreviewTicket[] }) {
  const recent = tickets.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3)
  return (
    <div className="flex-1 bg-desk-surface">
      <section className="brand-hero border-b border-border">
        <div className="mx-auto max-w-7xl px-5 py-11 sm:px-8 sm:py-14">
          <p className="mb-2 text-sm font-semibold text-primary">Employee self-service</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">How can we help, {persona.name.split(' ')[0]}?</h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">Report a problem, track your tickets, or find the right support.</p>
          <form action="/portal/tickets" className="mt-6 flex max-w-xl items-center gap-2 rounded-xl border border-input bg-card p-1.5 text-card-foreground focus-within:ring-2 focus-within:ring-ring">
            <RiSearchLine className="ml-2 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <Input name="q" aria-label="Search your tickets" placeholder="Search your tickets by reference or summary"
              className="min-w-0 grow border-0 bg-transparent text-card-foreground shadow-none focus-visible:ring-0 dark:bg-transparent" />
            <button className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Search</button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-7 px-5 py-8 sm:px-8">
        <section>
          <h2 className="mb-3 text-lg font-bold">Get support</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {actions.map(({ href, title, description, icon: Icon, planned }) => (
              <a key={href} href={href} className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-accent/40">
                <div className="flex items-center justify-between gap-1">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Icon className="size-5" aria-hidden="true" /></span>
                  {planned ? <Badge variant="outline" className="text-muted-foreground">Planned</Badge> : <RiArrowRightLine className="size-4 text-primary" aria-hidden="true" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold"><RiFileList3Line className="size-5 text-primary" /> Recent tickets</h2>
            <ActionLink href="/portal/tickets" variant="outline">View my tickets <RiArrowRightLine /></ActionLink>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? <p className="text-sm text-muted-foreground">You have no tickets yet.</p> : (
              <ul className="divide-y divide-border">
                {recent.map((incident) => (
                  <li key={incident.id}>
                    <a href={`/portal/tickets/${incident.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-primary">
                      <span>
                        <span className="block font-mono text-xs text-muted-foreground">{incident.id}</span>
                        <span className="font-semibold">{incident.summary}</span>
                      </span>
                      <StatusBadge status={incident.status} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
