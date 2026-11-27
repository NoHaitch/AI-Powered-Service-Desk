import { beforeEach, expect, test } from 'bun:test'

import { personas } from '../src/features/auth/preview-personas'
import { services, validateRequest } from '../src/features/catalog/catalog-model'
import { submitRequest } from '../src/features/catalog/request-fixtures'
import { articles, editDraft, readDraft } from '../src/features/knowledge/knowledge-preview'
import { canViewTicket, previewIntake, readTickets, saveReply, ticketHistory, ticketMessages } from '../src/features/tickets/ticket-preview'

const [maya, jordan, alex, sam] = personas

beforeEach(() => {
  const storage = new Map<string, string>()
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  })
})

test('keeps a submitted request visible to its requester and out of the L1 incident queue', () => {
  expect(validateRequest('  ', 'test').errors.item).toBeTruthy()
  expect(validateRequest(' test ', 'x'.repeat(2001)).errors.justification).toBeTruthy()
  expect(submitRequest(alex, services[0], 'Schedule tool', 'Team planning')).toBeUndefined()
  const request = submitRequest(maya, services[0], '  Schedule tool ', ' Team planning ')
  expect(request?.item).toBe('Schedule tool')
  const ticket = readTickets().find(({ id }) => id === request?.id)!
  expect(ticket.status).toBe('submitted')
  expect(ticket.priority).toBeNull()
  expect(canViewTicket(ticket, maya)).toBe(true)
  expect(canViewTicket(ticket, jordan)).toBe(false)
  expect(canViewTicket(ticket, alex)).toBe(false)
  expect(previewIntake(readTickets()).some(({ id }) => id === ticket.id)).toBe(false)
})

test('keeps request and reply failures from reporting success', () => {
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem: () => null,
    setItem: () => { throw new Error('Synthetic storage failure') },
  } })
  expect(submitRequest(maya, services[0], 'Schedule tool', 'Team planning')).toBeUndefined()
  expect(saveReply('INC-1047', maya, 'A reply', false)).toBe(false)
})

test('filters conversation and history by ticket scope and staff visibility', () => {
  const ticket = readTickets().find(({ id }) => id === 'INC-1047')!
  expect(saveReply(ticket.id, maya, ' I still need access. ', false)).toBe(true)
  expect(saveReply(ticket.id, alex, 'Check the synthetic groups.', true)).toBe(true)
  expect(saveReply(ticket.id, maya, 'forbidden private note', true)).toBe(false)
  expect(saveReply(ticket.id, jordan, 'forbidden reply', false)).toBe(false)
  expect(saveReply(ticket.id, sam, 'administrator has no queue grant', true)).toBe(false)
  expect(ticketMessages(ticket, maya).map(({ body }) => body)).toContain('I still need access.')
  expect(ticketMessages(ticket, maya).every(({ internal }) => !internal)).toBe(true)
  expect(ticketMessages(ticket, alex).map(({ body }) => body)).toContain('Check the synthetic groups.')
  expect(ticketMessages(ticket, jordan)).toEqual([])
  expect(ticketHistory(ticket, maya).every(({ internal }) => !internal)).toBe(true)
  expect(ticketHistory(ticket, alex).some(({ internal }) => internal)).toBe(true)
})

test('shows a seeded resolution and keeps a closed conversation read-only', () => {
  const ticket = readTickets().find(({ id }) => id === 'INC-1044')!
  expect(ticket.resolution?.summary).toContain('docking cable')
  expect(ticket.status).toBe('closed')
  expect(saveReply(ticket.id, maya, 'Another reply', false)).toBe(false)
})

test('permits administrator knowledge drafts without changing published content', () => {
  const article = articles[0]
  const draft = { title: 'Draft title', body: 'Draft content' }
  expect(editDraft(alex, article, draft)).toBe(false)
  expect(editDraft(sam, article, { ...draft, title: ' ' })).toBe(false)
  expect(editDraft(sam, article, draft)).toBe(true)
  expect(readDraft(sam, article)).toEqual(draft)
  expect(readDraft(maya, article)).toBeNull()
  expect(article.title).toBe('Reconnect to the company VPN')
  expect(editDraft(sam, article, null)).toBe(true)
  expect(readDraft(sam, article)).toBeNull()
})
