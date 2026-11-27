import type { Persona } from '@/features/auth/preview-personas'
import { isRecord, readPreview, writePreview } from '@/shared/lib/preview-storage'

import type { Article } from './knowledge-markdown'

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
