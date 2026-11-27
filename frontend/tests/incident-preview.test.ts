import { expect, test } from 'bun:test'
import { canEnter, personas } from '../src/features/auth/preview-personas'
import { assessPriority, assessments, canViewIncident, intakeQueue, triageIncident, validateIncident, type Incident } from '../src/features/incidents/incident-model'

const [employee, anotherEmployee, agent, administrator] = personas
const incident: Incident = {
  id: 'INC-10',
  requesterId: employee.id,
  summary: 'Unable to connect',
  description: 'The local connection stops after a restart.',
  createdAt: '2026-11-27T10:00:00.000Z',
  promptReview: false,
  status: 'new',
  priority: null,
}

test('derives priority for all nine impact and urgency combinations', () => {
  expect(assessments.map((impact) => assessments.map((urgency) => assessPriority(impact, urgency))))
    .toEqual([['P4', 'P4', 'P3'], ['P4', 'P3', 'P2'], ['P3', 'P2', 'P1']])
})

test('enforces trimmed incident text boundaries', () => {
  expect(validateIncident({ ...incident, summary: '   ' }).errors.summary).toBeDefined()
  expect(validateIncident({ ...incident, description: '' }).errors.description).toBeDefined()
  expect(validateIncident({ ...incident, summary: 'a'.repeat(121) }).errors.summary).toBeDefined()
  expect(validateIncident({ ...incident, description: 'a'.repeat(4001) }).errors.description).toBeDefined()
  expect(validateIncident({ ...incident, summary: ` ${'a'.repeat(120)} `, description: 'a'.repeat(4000) }).errors).toEqual({})
})

test('keeps employee ownership and L1 access distinct from administration', () => {
  expect(canViewIncident(incident, employee)).toBe(true)
  expect(canViewIncident(incident, anotherEmployee)).toBe(false)
  expect(canViewIncident(incident, agent)).toBe(true)
  expect(canViewIncident(incident, administrator)).toBe(false)
  expect(canEnter(employee.role, 'workspace')).toBe(false)
  expect(canEnter(administrator.role, 'workspace')).toBe(true)
  expect(canEnter(administrator.role, 'queue')).toBe(false)
})

test('keeps queue order oldest first and excludes triaged entries', () => {
  const flagged: Incident = { ...incident, id: 'INC-11', promptReview: true }
  const older: Incident = { ...incident, id: 'INC-9', createdAt: '2026-11-26T09:00:00.000Z' }
  const triaged = triageIncident(incident, agent, 'high', 'high', incident.createdAt)!
  expect(intakeQueue([flagged, older, triaged], false).map(({ id }) => id)).toEqual(['INC-9', 'INC-11'])
  expect(intakeQueue([flagged, older, triaged], true)).toEqual([flagged])
})

test('only L1 can triage a new incident and the review flag does not set priority', () => {
  const flagged = { ...incident, promptReview: true }
  expect(triageIncident(flagged, employee, 'high', 'high', incident.createdAt)).toBeUndefined()
  expect(triageIncident(flagged, administrator, 'high', 'high', incident.createdAt)).toBeUndefined()
  const triaged = triageIncident(flagged, agent, 'low', 'high', incident.createdAt)!
  expect(triaged).toMatchObject({ status: 'triaged', priority: 'P3', promptReview: true })
  expect(triageIncident(triaged, agent, 'high', 'high', incident.createdAt)).toBeUndefined()
})
