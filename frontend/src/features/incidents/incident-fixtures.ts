import type { Persona } from '@/features/auth/preview-personas'
import { triageIncident, validateIncident, type Assessment, type Incident, type IncidentInput } from './incident-model'

const fixtureRows = [
  ['VPN disconnects when switching networks', 'Network', true],
  ['Shared drive access denied after sign-in', 'Access', false],
  ['Meeting room display does not detect laptop', 'Hardware', false],
  ['Email attachments fail to download', 'Email', false],
  ['Laptop battery drains while docked', 'Hardware', false],
  ['Video calls drop for the operations team', 'Network', true],
  ['Unable to print to the third-floor printer', 'Hardware', false],
  ['Browser shows an error opening payroll', 'Software', false],
  ['Shared calendar invitations are delayed', 'Email', false],
  ['Design library is unavailable', 'Software', true],
  ['Screenshot tool closes unexpectedly', 'Software', false],
] as const

const fixtureIncidents: Incident[] = fixtureRows.map(([summary, category, promptReview], index) => {
  const base = {
    id: `INC-${1048 - index}`,
    summary,
    description: `Synthetic ${category.toLowerCase()} report: ${summary}. The issue started during normal work and persists after retrying.`,
    requesterId: index < 9 ? 'maya' : 'jordan',
    promptReview,
    createdAt: new Date(Date.UTC(2026, 10, 27 - index, 9, 20)).toISOString(),
  }
  return index % 3 === 1
    ? { ...base, status: 'triaged', impact: 'medium', urgency: 'medium', priority: 'P3', triagedAt: base.createdAt }
    : { ...base, status: 'new', priority: null }
})

const storageKey = 'service-desk.preview.incidents.v1'

export function readIncidents(): Incident[] {
  try {
    const stored = sessionStorage.getItem(storageKey)
    if (stored) {
      const values: unknown = JSON.parse(stored)
      if (Array.isArray(values)) return values as Incident[]
    }
  } catch {
    // Fixture storage can be unavailable or cleared between visits.
  }
  return fixtureIncidents
}

function saveIncidents(incidents: Incident[]) {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(incidents))
    return true
  } catch {
    return false
  }
}

export function createPreviewIncident(input: IncidentInput, persona: Persona) {
  const { values, errors } = validateIncident(input)
  if (persona.role !== 'employee' || Object.keys(errors).length) return undefined

  const incidents = readIncidents()
  const next = Math.max(1048, ...incidents.map(({ id }) => Number(id.slice(4)))) + 1
  const incident: Incident = {
    ...values,
    id: `INC-${next}`,
    requesterId: persona.id,
    createdAt: new Date().toISOString(),
    status: 'new',
    priority: null,
  }
  return saveIncidents([...incidents, incident]) ? incident : undefined
}

export function savePreviewTriage(id: string, persona: Persona, impact: Assessment, urgency: Assessment) {
  const incidents = readIncidents()
  const current = incidents.find((incident) => incident.id === id)
  const updated = current && triageIncident(current, persona, impact, urgency, new Date().toISOString())
  if (!updated) return false
  return saveIncidents(incidents.map((incident) => incident.id === id ? updated : incident))
}
