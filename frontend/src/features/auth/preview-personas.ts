export type Role = 'employee' | 'agent' | 'administrator'

export const personas = [
  { id: 'maya', name: 'Maya Chen', initials: 'MC', role: 'employee', team: 'Operations' },
  { id: 'jordan', name: 'Jordan Lee', initials: 'JL', role: 'employee', team: 'Design' },
  { id: 'alex', name: 'Alex Morgan', initials: 'AM', role: 'agent', team: 'L1 Support' },
  { id: 'sam', name: 'Sam Rivera', initials: 'SR', role: 'administrator', team: 'Platform' },
] as const

export type Persona = (typeof personas)[number]
export const roleLabels: Record<Role, string> = {
  employee: 'Employee',
  agent: 'L1 support agent',
  administrator: 'Administrator',
}

export function homeFor(role: Role) {
  return role === 'employee' ? '/portal' : '/workspace'
}

export function canEnter(role: Role, area: 'portal' | 'workspace' | 'queue') {
  if (area === 'portal') return role === 'employee'
  if (area === 'queue') return role === 'agent'
  return role === 'agent' || role === 'administrator'
}

const personaKey = 'service-desk.preview.persona'

export function readPersona(): Persona | undefined {
  try {
    const id = sessionStorage.getItem(personaKey)
    return personas.find((persona) => persona.id === id)
  } catch {
    return undefined
  }
}

export function enterPreview(persona: Persona) {
  try {
    sessionStorage.setItem(personaKey, persona.id)
    window.location.assign(homeFor(persona.role))
  } catch {
    window.location.assign('/error/503')
  }
}

export function leavePreview() {
  sessionStorage.removeItem(personaKey)
  window.location.assign('/login')
}
