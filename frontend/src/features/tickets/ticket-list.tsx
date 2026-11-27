import { useState } from 'react'
import { RiArrowRightSLine, RiInbox2Line, RiSearchLine } from '@remixicon/react'

import { ActionLink, PageHeading, PriorityBadge, StatusBadge } from '@/app/ui'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { personaName, previewIntake, ticketStatuses, type PreviewTicket } from './ticket-preview'

const pageSize = 6
const shortDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

export function TicketList({ tickets, mode }: { tickets: PreviewTicket[]; mode: 'employee' | 'queue' | 'all' | 'assigned' }) {
  const queue = mode === 'queue'
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get('q') ?? '')
  const [status, setStatus] = useState('all')
  const [priority, setPriority] = useState('all')
  const [kind, setKind] = useState('all')
  const [assignment, setAssignment] = useState('all')
  const [sort, setSort] = useState('newest')
  const [flagged, setFlagged] = useState(false)
  const [page, setPage] = useState(1)
  const needle = query.trim().toLowerCase()
  const candidates = queue ? previewIntake(tickets, flagged) : tickets
  const results = candidates.filter((incident) =>
    (!needle || `${incident.id} ${incident.summary}`.toLowerCase().includes(needle))
    && (status === 'all' || incident.status === status)
    && (priority === 'all' || (incident.priority ?? (incident.source.kind === 'incident' ? 'pending' : 'none')) === priority)
    && (kind === 'all' || incident.source.kind === kind)
    && (assignment === 'all' || Boolean(incident.assigneeId) === (assignment === 'assigned')),
  )
  if (!queue) results.sort((a, b) => (sort === 'oldest' ? 1 : -1)
    * (Date.parse(a.createdAt) - Date.parse(b.createdAt)) || a.id.localeCompare(b.id))
  const pages = Math.max(1, Math.ceil(results.length / pageSize))
  const currentPage = Math.min(page, pages)
  const rows = results.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const title = queue ? 'L1 intake queue' : mode === 'employee' ? 'My Tickets' : mode === 'assigned' ? 'My assignments' : 'All tickets'
  const base = mode === 'employee' ? '/portal/tickets' : '/workspace/tickets'
  const emptyText = tickets.length ? 'No tickets match this view.' : 'No tickets to show.'

  function ticketLink(ticket: PreviewTicket) {
    return (
      <a className="inline-flex items-center gap-1 wrap-anywhere font-semibold hover:text-primary hover:underline"
        href={`${base}/${ticket.id}`}>{ticket.summary}<RiArrowRightSLine className="size-4 shrink-0" aria-hidden="true" /></a>
    )
  }

  function metadata(ticket: PreviewTicket) {
    return <>
      {queue && ticket.source.kind === 'incident' && ticket.source.incident.promptReview && <Badge variant="outline" className="mt-1">Prompt review</Badge>}
      {ticket.source.kind === 'request' && <p className="text-xs text-muted-foreground">Service request</p>}
      {mode !== 'employee' && ticket.assigneeId && <p className="text-xs text-muted-foreground">{personaName(ticket.assigneeId)}</p>}
    </>
  }

  return (
    <div className="space-y-5">
      <PageHeading title={title} description={queue ? 'Review new incidents in arrival order.' : 'Search, filter, and review ticket status.'}
        actions={mode === 'employee' ? <ActionLink href="/portal/incidents/new">Report an incident</ActionLink> : undefined} />
      <Card className="gap-0">
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full space-y-1 sm:max-w-65">
              <Label htmlFor="ticket-query">Search</Label>
              <div className="relative">
                <RiSearchLine className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input id="ticket-query" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }}
                  placeholder="Reference or summary" className="pl-9" />
              </div>
            </div>
            {queue ? (
              <div className="flex min-h-9 items-center gap-2">
                <Checkbox id="flagged-only" checked={flagged} onCheckedChange={(checked) => { setFlagged(checked); setPage(1) }} />
                <Label htmlFor="flagged-only">Prompt review only</Label>
              </div>
            ) : (
              <>
                <label className="filter-label">Status
                  <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} className="desk-select">
                    <option value="all">All statuses</option>
                    {Object.entries(ticketStatuses).filter(([key]) => mode === 'employee' || key !== 'submitted')
                      .map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </label>
                <label className="filter-label">Priority
                  <select value={priority} onChange={(event) => { setPriority(event.target.value); setPage(1) }} className="desk-select">
                    <option value="all">All priorities</option><option value="pending">Pending triage</option>
                    <option>P1</option><option>P2</option><option>P3</option><option>P4</option>
                  </select>
                </label>
                {mode === 'employee' && <label className="filter-label">Type
                  <select value={kind} onChange={(event) => { setKind(event.target.value); setPage(1) }} className="desk-select">
                    <option value="all">All types</option><option value="incident">Incidents</option><option value="request">Service requests</option>
                  </select>
                </label>}
                {mode === 'all' && <label className="filter-label">Assignment
                  <select value={assignment} onChange={(event) => { setAssignment(event.target.value); setPage(1) }} className="desk-select">
                    <option value="all">Any assignment</option><option value="assigned">Assigned</option><option value="unassigned">Unassigned</option>
                  </select>
                </label>}
                <label className="filter-label">Sort
                  <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1) }} className="desk-select">
                    <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
                  </select>
                </label>
              </>
            )}
          </div>
          <div className="md:hidden">
            {rows.length ? <ul className="divide-y divide-border">
              {rows.map((ticket) => (
                <li key={ticket.id} className="space-y-2 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground">
                    <span className="font-mono">{ticket.id}</span><time dateTime={ticket.createdAt}>{shortDate.format(new Date(ticket.createdAt))}</time>
                  </div>
                  <div className="text-sm">{ticketLink(ticket)}{metadata(ticket)}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={ticket.status} />
                    {ticket.source.kind === 'incident' && <PriorityBadge priority={ticket.priority} />}
                  </div>
                </li>
              ))}
            </ul> : <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>}
          </div>
          <div className="hidden md:block"><Table className="min-w-[620px]">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead scope="col">Reference</TableHead><TableHead scope="col">Summary</TableHead>
                <TableHead scope="col">Status</TableHead><TableHead scope="col">Priority</TableHead>
                <TableHead scope="col">Reported</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{incident.id}</TableCell>
                  <TableCell className="max-w-70 whitespace-normal">
                    {ticketLink(incident)}{metadata(incident)}
                  </TableCell>
                  <TableCell><StatusBadge status={incident.status} /></TableCell>
                  <TableCell>{incident.source.kind === 'incident' ? <PriorityBadge priority={incident.priority} /> : '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{shortDate.format(new Date(incident.createdAt))}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                <RiInbox2Line className="mx-auto mb-2 size-6" aria-hidden="true" />
                {emptyText}
              </TableCell></TableRow>}
            </TableBody>
          </Table></div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-muted-foreground" aria-live="polite">{results.length} {results.length === 1 ? 'ticket' : 'tickets'}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</Button>
              <span className="whitespace-nowrap text-xs text-muted-foreground">Page {currentPage} of {pages}</span>
              <Button variant="outline" size="sm" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
