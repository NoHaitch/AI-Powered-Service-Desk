import type { Persona } from '@/features/auth/preview-personas'

export const summaryLimit = 120
export const descriptionLimit = 4000
export const assessments = ['low', 'medium', 'high'] as const
export type Assessment = (typeof assessments)[number]
export type Priority = 'P1' | 'P2' | 'P3' | 'P4'

const priorityMatrix: Record<Assessment, Record<Assessment, Priority>> = {
  low: { low: 'P4', medium: 'P4', high: 'P3' },
  medium: { low: 'P4', medium: 'P3', high: 'P2' },
  high: { low: 'P3', medium: 'P2', high: 'P1' },
}

export function assessPriority(impact: Assessment, urgency: Assessment) {
  return priorityMatrix[impact][urgency]
}

export type IncidentInput = { summary: string; description: string; promptReview: boolean }
type IncidentBase = IncidentInput & { id: string; requesterId: string; createdAt: string }
export type Incident = IncidentBase & (
  | { status: 'new'; priority: null }
  | { status: 'triaged'; priority: Priority; impact: Assessment; urgency: Assessment; triagedAt: string }
)

export function validateIncident(input: IncidentInput) {
  const summary = input.summary.trim()
  const description = input.description.trim()
  const errors: Partial<Record<'summary' | 'description', string>> = {}
  if (!summary || Array.from(summary).length > summaryLimit) {
    errors.summary = `Enter a summary of 1 to ${summaryLimit} characters.`
  }
  if (!description || Array.from(description).length > descriptionLimit) {
    errors.description = `Enter a description of 1 to ${descriptionLimit.toLocaleString('en-US')} characters.`
  }
  return { values: { summary, description, promptReview: input.promptReview }, errors }
}

export function canViewIncident(incident: Incident, persona: Persona) {
  return persona.role === 'agent' || (persona.role === 'employee' && incident.requesterId === persona.id)
}

export function intakeQueue(incidents: Incident[], flaggedOnly: boolean) {
  return incidents
    .filter(({ status, promptReview }) => status === 'new' && (!flaggedOnly || promptReview))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
}

export function triageIncident(
  incident: Incident,
  persona: Persona,
  impact: Assessment,
  urgency: Assessment,
  triagedAt: string,
): Incident | undefined {
  if (persona.role !== 'agent' || incident.status !== 'new') return undefined
  return { ...incident, status: 'triaged', priority: assessPriority(impact, urgency), impact, urgency, triagedAt }
}
