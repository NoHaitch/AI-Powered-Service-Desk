import { beforeEach, expect, test } from 'bun:test'

import { personas } from '../src/features/auth/preview-personas'
import { services, validateRequest, validateServiceFields } from '../src/features/catalog/catalog-model'
import { readRequests, submitRequest } from '../src/features/catalog/request-fixtures'
import { readArticle, readMarkdown } from '../src/features/knowledge/knowledge-markdown'
import { editDraft, readDraft } from '../src/features/knowledge/knowledge-preview'
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

test('requires a valid end date for temporary VPN requests and retains submitted service details', () => {
  const vpn = services.find(({ id }) => id === 'vpn-access')!
  const input = { device: 'Company-managed laptop', duration: 'Temporary' }
  expect(validateServiceFields(vpn, input).errors.endDate).toBe('This field is required.')
  expect(validateServiceFields(vpn, { ...input, duration: 'Unknown' }).errors.duration).toBeTruthy()
  expect(validateServiceFields(vpn, { ...input, endDate: '2026-02-30' }).errors.endDate).toBeTruthy()
  expect(submitRequest(maya, vpn, 'Work portal', 'Hybrid work', input)).toBeUndefined()
  const request = submitRequest(maya, vpn, 'Work portal', 'Hybrid work',
    { ...input, endDate: '2026-12-10', unrecognized: 'discard this' })
  expect(request?.details).toEqual({ ...input, endDate: '2026-12-10' })
  expect(readRequests().find(({ id }) => id === request?.id)).toEqual(request!)
  expect(readRequests().find(({ id }) => id === 'REQ-2001')?.details).toBeUndefined()
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

test('loads the Markdown corpus with safe text rendering and valid catalog links', async () => {
  const corpus = new URL('../src/features/knowledge/articles/', import.meta.url)
  const files = Array.from(new Bun.Glob('*.md').scanSync({ cwd: corpus.pathname }))
  expect(files.length).toBeGreaterThan(0)
  const articles = await Promise.all(files.map(async (file) => readArticle(file.slice(0, -3), await Bun.file(new URL(file, corpus)).text())))
  expect(articles.every(({ updated }) => /^\d{4}-\d{2}-\d{2}$/.test(updated))).toBe(true)
  expect(() => readArticle('invalid-date', '---\ntitle: Test\ncategory: Test\nsummary: Test\nupdated: 2026-02-30\n---\nBody')).toThrow('Invalid article update date')
  expect(articles.filter(({ service }) => service).map(({ service }) => service).sort()).toEqual(expect.arrayContaining(['shared-drive', 'software-access']))
  expect(articles.every(({ body }) => readMarkdown(body).some(({ type }) => type === 'heading'))).toBe(true)
  expect(readMarkdown('## Steps\n\n1. First\n2. Second\n\n- One\n\n<img src=x>')).toEqual([
    { type: 'heading', text: 'Steps', level: 2, id: 'section-steps' },
    { type: 'ordered-list', start: 1, items: ['First', 'Second'] },
    { type: 'unordered-list', items: ['One'] },
    { type: 'paragraph', text: '<img src=x>' },
  ])
})

test('parses heading levels, unique outline anchors, and pipe tables', () => {
  expect(readMarkdown('## Checks\n\n### Checks\n\n#### Details\n\n| Part | Status | Count |\n| --- | :---: | ---: |\n| Cable \\| dock | OK | 2 |\n\n3. Retest')).toEqual([
    { type: 'heading', text: 'Checks', level: 2, id: 'section-checks' },
    { type: 'heading', text: 'Checks', level: 3, id: 'section-checks-2' },
    { type: 'heading', text: 'Details', level: 4, id: 'section-details' },
    { type: 'table', headers: ['Part', 'Status', 'Count'], rows: [['Cable | dock', 'OK', '2']], alignments: ['left', 'center', 'right'] },
    { type: 'ordered-list', start: 3, items: ['Retest'] },
  ])
})

test('permits administrator knowledge drafts without changing published content', async () => {
  const file = new URL('../src/features/knowledge/articles/vpn-reconnect.md', import.meta.url)
  const article = readArticle('vpn-reconnect', await Bun.file(file).text())
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
