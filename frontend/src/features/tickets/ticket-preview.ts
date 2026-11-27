import { personas, type Persona } from '@/features/auth/preview-personas'
import type { ServiceRequest } from '@/features/catalog/catalog-model'
import { services } from '@/features/catalog/catalog-model'
import { readRequests } from '@/features/catalog/request-fixtures'
import { readIncidents } from '@/features/incidents/incident-fixtures'
import { canViewIncident, intakeQueue, type Incident, type Priority } from '@/features/incidents/incident-model'
import { isRecord, readPreview, writePreview } from '@/shared/lib/preview-storage'

export const ticketStatuses = {
  new: 'New', triaged: 'Triaged', submitted: 'Submitted', assigned: 'Assigned',
  inProgress: 'In progress', resolved: 'Resolved', closed: 'Closed',
} as const
export type TicketStatus = keyof typeof ticketStatuses
export const ticketDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export type PreviewTicket = {
  id: string
  requesterId: string
  summary: string
  description: string
  createdAt: string
  status: TicketStatus
  priority: Priority | null
  source: { kind: 'incident'; incident: Incident } | { kind: 'request'; request: ServiceRequest }
  tier?: 'L1' | 'L2' | 'L3'
  assigneeId?: string
  resolution?: { summary: string; at: string }
  history: { label: string; at: string; internal?: boolean }[]
}

const work: Record<string, Pick<PreviewTicket, 'status' | 'assigneeId' | 'resolution' | 'history'>> = {
  'INC-1047': {
    status: 'inProgress', assigneeId: 'alex',
    history: [{ label: 'Assigned to Alex Morgan', at: '2026-11-26T11:15:00Z', internal: true }],
  },
  'INC-1044': {
    status: 'closed', assigneeId: 'alex',
    resolution: { summary: 'Replaced a faulty docking cable and confirmed that the laptop charges when docked.', at: '2026-11-24T14:15:00Z' },
    history: [{ label: 'Resolved', at: '2026-11-24T14:15:00Z' }, { label: 'Closed', at: '2026-11-25T09:15:00Z' }],
  },
  'INC-1041': {
    status: 'assigned', assigneeId: 'alex',
    history: [{ label: 'Assigned to Alex Morgan', at: '2026-11-20T12:15:00Z', internal: true }],
  },
}

function incidentTicket(incident: Incident): PreviewTicket {
  const recordedWork = incident.status === 'triaged' ? work[incident.id] : undefined
  const history: PreviewTicket['history'] = [{ label: 'Incident reported', at: incident.createdAt }]
  if (incident.status === 'triaged') history.push({ label: `L1 triage completed · ${incident.priority}`, at: incident.triagedAt })
  return {
    ...incident, source: { kind: 'incident', incident }, tier: 'L1', ...recordedWork,
    history: [...history, ...(recordedWork?.history ?? [])],
  }
}

function requestTicket(request: ServiceRequest): PreviewTicket {
  const service = services.find(({ id }) => id === request.serviceId)
  return {
    ...request, source: { kind: 'request', request }, priority: null, status: 'submitted',
    summary: `${service?.title ?? 'Service request'}: ${request.item}`, description: request.justification,
    history: [{ label: 'Service request submitted', at: request.createdAt }],
  }
}

export function readTickets() {
  return [...readIncidents().map(incidentTicket), ...readRequests().map(requestTicket)]
}

export function canViewTicket(ticket: PreviewTicket, persona: Persona) {
  if (ticket.source.kind === 'request') return persona.role === 'employee' && ticket.requesterId === persona.id
  return canViewIncident(ticket.source.incident, persona)
    && (persona.role !== 'agent' || ticket.tier === 'L1')
}

export function previewIntake(tickets: PreviewTicket[], flaggedOnly = false) {
  const incidents = tickets.flatMap(({ source }) => source.kind === 'incident' ? [source.incident] : [])
  const byId = new Map(tickets.map((ticket) => [ticket.id, ticket]))
  return intakeQueue(incidents, flaggedOnly).flatMap(({ id }) => {
    const ticket = byId.get(id)
    return ticket ? [ticket] : []
  })
}

export function ticketHistory(ticket: PreviewTicket, persona: Persona) {
  if (!canViewTicket(ticket, persona)) return []
  return ticket.history.filter((entry) => !entry.internal || persona.role === 'agent')
}

export type TicketMessage = {
  id: string
  ticketId: string
  authorId: string
  at: string
  body: string
  internal: boolean
}
const messagesKey = 'service-desk.preview.ticket-messages.v1'
const seedMessages: TicketMessage[] = [
  { id: 'message-1', ticketId: 'INC-1047', authorId: 'alex', at: '2026-11-26T11:20:00Z', body: 'Can you confirm whether the drive opens from a second device?', internal: false },
  { id: 'message-2', ticketId: 'INC-1047', authorId: 'alex', at: '2026-11-26T11:25:00Z', body: 'Synthetic troubleshooting note: compare the fixture access groups.', internal: true },
  { id: 'message-3', ticketId: 'INC-1047', authorId: 'maya', at: '2026-11-26T12:05:00Z', body: 'I checked another device and see the same message.', internal: false },
]

function isMessage(value: unknown): value is TicketMessage {
  return isRecord(value) && typeof value.internal === 'boolean'
    && typeof value.at === 'string' && Number.isFinite(Date.parse(value.at))
    && ['id', 'ticketId', 'authorId', 'body'].every((field) => typeof value[field] === 'string')
}

function allMessages() {
  return readPreview(messagesKey, (value): value is TicketMessage[] => Array.isArray(value) && value.every(isMessage), seedMessages)
}

export function ticketMessages(ticket: PreviewTicket, persona: Persona) {
  if (!canViewTicket(ticket, persona)) return []
  return allMessages().filter((message) => message.ticketId === ticket.id
    && (!message.internal || persona.role === 'agent'))
}

export function canReply(ticket: PreviewTicket, persona: Persona, internal: boolean) {
  return canViewTicket(ticket, persona) && ticket.status !== 'closed'
    && (!internal || persona.role === 'agent')
}

export function saveReply(ticketId: string, persona: Persona, input: string, internal: boolean) {
  const ticket = readTickets().find(({ id }) => id === ticketId)
  const body = input.trim()
  if (!ticket || !canReply(ticket, persona, internal) || !body || Array.from(body).length > 2000) return false
  const message: TicketMessage = {
    id: crypto.randomUUID(), ticketId, authorId: persona.id, at: new Date().toISOString(), body, internal,
  }
  return writePreview(messagesKey, [...allMessages(), message])
}

export function personaName(id: string) {
  return personas.find((persona) => persona.id === id)?.name ?? 'Service Desk'
}
