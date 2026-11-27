import type { Persona } from '@/features/auth/preview-personas'
import { isRecord, readPreview, writePreview } from '@/shared/lib/preview-storage'

export const articles = [
  { id: 'vpn-reconnect', title: 'Reconnect to the company VPN', category: 'Connectivity', summary: 'Checks to try after switching networks or waking your device.', body: 'Confirm that you can open an internal site without the VPN, then reconnect from the VPN client.\nIf it still disconnects, note the time and the network you were using before reporting an incident.' },
  { id: 'shared-drive-access', title: 'Get access to a shared drive', category: 'Accounts & access', summary: 'Identify the shared drive and submit a catalog request.', body: 'Ask the team which shared drive or folder you need. Open the service catalog and submit a shared drive access request with your work justification.', service: 'shared-drive' },
  { id: 'external-monitor', title: 'Troubleshoot an external monitor', category: 'Hardware', summary: 'Check your dock, display input, and cable before reporting an issue.', body: 'Select the input that matches the connected cable. Disconnect and reconnect the cable at both ends. If available, connect the screen directly to your device to isolate the dock.' },
  { id: 'software-access', title: 'Request access to work software', category: 'Software', summary: 'Use a named request so support knows which application you need.', body: 'Confirm the application name with your team. Open the software access request and include what you need to do in the application.', service: 'software-access' },
] as const

export type Article = typeof articles[number]
const draftKey = (id: string) => `service-desk.preview.knowledge-draft.${id}`
export type ArticleDraft = { title: string; body: string }

function isDraft(value: unknown): value is ArticleDraft {
  return isRecord(value) && typeof value.title === 'string' && typeof value.body === 'string'
}

export function readDraft(persona: Persona, article: Article): ArticleDraft | null {
  if (persona.role !== 'administrator') return null
  return readPreview(draftKey(article.id), isDraft, null)
}

export function editDraft(persona: Persona, article: Article, draft: ArticleDraft | null) {
  if (persona.role !== 'administrator') return false
  if (!draft) return writePreview(draftKey(article.id), null)
  const title = draft.title.trim()
  const body = draft.body.trim()
  if (!title || Array.from(title).length > 120 || !body || Array.from(body).length > 4000) return false
  return writePreview(draftKey(article.id), { title, body })
}
