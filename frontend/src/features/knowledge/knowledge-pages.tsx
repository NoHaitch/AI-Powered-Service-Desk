import { useState, type FormEvent } from 'react'

import { BrowseFilters } from '@/app/browse-filters'
import { ActionLink, PageHeading } from '@/app/ui'
import type { Persona } from '@/features/auth/preview-personas'
import { Alert, AlertTitle } from '@/shared/components/ui/alert'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { articles, editDraft, readDraft, type Article } from './knowledge-preview'

const categories = [...new Set(articles.map(({ category }) => category))].sort()

export function KnowledgeList({ manager }: { manager?: Persona }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const needle = query.trim().toLowerCase()
  const shown = articles.filter((article) => (!category || article.category === category)
    && `${article.title} ${article.summary} ${article.body} ${article.category}`.toLowerCase().includes(needle))
  return (
    <div className="space-y-5">
      <PageHeading title={manager ? 'Manage knowledge' : 'Knowledge base'}
        description={manager ? 'Review published fixture articles and edit local drafts.' : 'Find troubleshooting guides and instructions for common IT requests.'} />
      <BrowseFilters query={query} category={category} categories={categories} onQuery={setQuery} onCategory={setCategory} />
      <p aria-live="polite" className="text-sm text-muted-foreground">{shown.length} {shown.length === 1 ? 'article' : 'articles'}</p>
      {shown.length ? <div className="grid gap-4 sm:grid-cols-2">
        {shown.map((article) => (
          <Card key={article.id}>
            <CardHeader>
              <div className="flex flex-wrap gap-2"><Badge variant="outline">{article.category}</Badge>
                {manager && readDraft(manager, article) && <Badge>Draft saved</Badge>}</div>
              <h2 className="mt-2 text-lg font-bold">{article.title}</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{article.summary}</p>
              <ActionLink variant="outline" href={`${manager ? '/workspace/knowledge' : '/portal/knowledge'}/${article.id}`}>
                {manager ? 'Edit draft' : 'Read article'}
              </ActionLink>
            </CardContent>
          </Card>
        ))}
      </div> : <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">No articles match your filters.</p>}
    </div>
  )
}

export function KnowledgeArticle({ article }: { article: Article }) {
  return (
    <div className="max-w-3xl space-y-5">
      <ActionLink href="/portal/knowledge" variant="ghost">Back to knowledge base</ActionLink>
      <PageHeading title={article.title} description={article.summary} actions={<Badge variant="outline">{article.category}</Badge>} />
      <Card><CardContent className="space-y-4">
        {article.body.split('\n').map((paragraph) => <p key={paragraph} className="text-sm leading-relaxed">{paragraph}</p>)}
        {'service' in article && <ActionLink href={`/portal/requests/new/${article.service}`}>Open service request</ActionLink>}
      </CardContent></Card>
    </div>
  )
}

export function KnowledgeEditor({ article, persona }: { article: Article; persona: Persona }) {
  const [draft, setDraft] = useState(() => readDraft(persona, article) ?? { title: article.title, body: article.body })
  const [saved, setSaved] = useState(() => !!readDraft(persona, article))
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('')
    setError('')
    if (!editDraft(persona, article, draft)) {
      setError('Could not save. Enter a title of 1–120 characters and content of 1–4,000 characters, then try again.')
      return
    }
    setSaved(true)
    setStatus('Draft saved in this tab.')
  }

  function discard() {
    if (!editDraft(persona, article, null)) {
      setError('Could not discard the draft. Try again.')
      return
    }
    setDraft({ title: article.title, body: article.body })
    setSaved(false)
    setConfirm(false)
    setError('')
    setStatus('Draft discarded.')
  }

  return (
    <div className="max-w-3xl space-y-5">
      <ActionLink variant="ghost" href="/workspace/knowledge">Back to manage knowledge</ActionLink>
      <PageHeading title="Edit knowledge draft" description="Draft changes stay in this tab. The published fixture remains available to employees." />
      <Card><CardContent className="space-y-4">
        {error && <Alert variant="destructive" role="alert"><AlertTitle>{error}</AlertTitle></Alert>}
        {status && <Alert role="status"><AlertTitle>{status}</AlertTitle></Alert>}
        <form className="space-y-4" onSubmit={save} noValidate>
          <label className="filter-label">Title<Input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <label className="filter-label">Article content<Textarea required rows={8} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">Save draft</Button>
            {saved && <Dialog open={confirm} onOpenChange={setConfirm}>
              <DialogTrigger render={<Button type="button" variant="outline" />}>Discard draft</DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Discard this draft?</DialogTitle><DialogDescription>The editor will return to the published text.</DialogDescription></DialogHeader>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
                  <Button type="button" variant="destructive" onClick={discard}>Discard draft</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>}
          </div>
        </form>
      </CardContent></Card>
    </div>
  )
}
