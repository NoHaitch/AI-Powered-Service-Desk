import { RiCheckLine, RiUserLine } from '@remixicon/react'

import { ActionLink, PageHeading, PriorityBadge, StatusBadge } from '@/app/ui'
import type { Persona } from '@/features/auth/preview-personas'
import { services } from '@/features/catalog/catalog-model'
import { TriageForm } from '@/features/incidents/triage-form'
import { savePreviewTriage } from '@/features/incidents/incident-fixtures'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { TicketConversation } from './ticket-conversation'
import { personaName, ticketDate, ticketHistory, type PreviewTicket } from './ticket-preview'

export function TicketDetail({ ticket, persona }: { ticket: PreviewTicket; persona: Persona }) {
  const staff = persona.role === 'agent'
  const result = new URLSearchParams(location.search).get('result')
  const incident = ticket.source.kind === 'incident' ? ticket.source.incident : undefined
  const assignee = ticket.status === 'inProgress' && ticket.assigneeId ? personaName(ticket.assigneeId) : undefined
  const request = ticket.source.kind === 'request' ? ticket.source.request : undefined
  const requestFields = services.find(({ id }) => id === request?.serviceId)?.fields ?? []
  const details = requestFields.flatMap(({ id, label }) => {
    const value = request?.details?.[id]
    return value ? [{ id, label, value }] : []
  })
  const confirmation = staff && result === 'triaged' && incident?.status === 'triaged' ? 'Triage saved in this tab.'
    : !staff && result === 'created' && incident ? 'Incident reported in this tab.'
    : !staff && result === 'requested' && !incident ? 'Service request saved in this tab.' : undefined

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <ActionLink variant="ghost" href={staff ? '/workspace/tickets' : '/portal/tickets'}>{staff ? 'All tickets' : 'My Tickets'}</ActionLink>
        <span aria-hidden="true">/</span><span className="font-mono text-xs" aria-current="page">{ticket.id}</span>
      </nav>
      <PageHeading title={ticket.summary} description={(
        <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>{incident ? 'Incident' : 'Service request'} {ticket.id} · {ticketDate.format(new Date(ticket.createdAt))}</span>
          {assignee && (
            <span className="inline-flex items-center gap-1.5">
              <RiUserLine className="size-4 shrink-0" aria-hidden="true" />
              <span>Assigned to <strong className="font-semibold text-foreground">{assignee}</strong></span>
            </span>
          )}
        </span>
      )}
        actions={<StatusBadge status={ticket.status} />} />
      {confirmation && <Alert role="status"><RiCheckLine aria-hidden="true" /><AlertTitle>{confirmation}</AlertTitle></Alert>}
      <div className={staff ? 'grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]' : 'grid gap-4'}>
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader><h2 className="text-lg font-bold">{incident ? 'Incident details' : 'Request details'}</h2></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {incident && <PriorityBadge priority={ticket.priority} />}
                {incident?.promptReview && <Badge variant="outline">Prompt review</Badge>}
              </div>
              <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed">{ticket.description}</p>
              {details.length > 0 && (
                <dl className="grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
                  {details.map(({ id, label, value }) => (
                    <div key={id} className="min-w-0">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="wrap-break-word font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </CardContent>
          </Card>
          {ticket.resolution && <Card>
            <CardHeader><h2 className="text-lg font-bold">Resolution</h2></CardHeader>
            <CardContent><p className="whitespace-pre-wrap text-sm">{ticket.resolution.summary}</p>
              <time className="mt-2 block text-xs text-muted-foreground" dateTime={ticket.resolution.at}>{ticketDate.format(new Date(ticket.resolution.at))}</time>
            </CardContent>
          </Card>}
          <TicketConversation ticket={ticket} persona={persona} />
          <Card>
            <CardHeader><h2 className="text-lg font-bold">Activity history</h2></CardHeader>
            <CardContent>
              <ol className="space-y-3 border-l border-border pl-4 text-sm">
                {ticketHistory(ticket, persona).map(({ label, at, internal }) => (
                  <li key={`${at}-${label}`}><p className="font-semibold">{label} {internal && <Badge variant="outline">Staff only</Badge>}</p>
                    <time className="text-xs text-muted-foreground" dateTime={at}>{ticketDate.format(new Date(at))}</time>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
        {staff && <aside className="space-y-4">
          {incident?.status === 'new' && <TriageForm save={async (impact, urgency) => {
            if (!savePreviewTriage(incident.id, persona, impact, urgency)) throw new Error('Triage could not be saved.')
            window.location.assign(`/workspace/tickets/${incident.id}?result=triaged`)
          }} />}
          <Card>
            <CardHeader><h2 className="text-lg font-bold">Ticket management</h2></CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-muted-foreground">Support tier</dt><dd className="font-semibold">{ticket.tier ?? '—'}</dd></div>
                <div><dt className="text-muted-foreground">Assignee</dt><dd className="font-semibold">{ticket.assigneeId ? personaName(ticket.assigneeId) : 'Unassigned'}</dd></div>
                {incident?.status === 'triaged' && <>
                  <div><dt className="text-muted-foreground">Impact</dt><dd className="font-semibold capitalize">{incident.impact}</dd></div>
                  <div><dt className="text-muted-foreground">Urgency</dt><dd className="font-semibold capitalize">{incident.urgency}</dd></div>
                </>}
              </dl>
              <Alert><AlertDescription>Assignment, escalation, resolution, and closure actions are awaiting workflow approval.</AlertDescription></Alert>
            </CardContent>
          </Card>
        </aside>}
      </div>
    </div>
  )
}
