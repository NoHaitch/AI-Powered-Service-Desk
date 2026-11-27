import { RiArrowLeftLine, RiListUnordered } from '@remixicon/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'

import { BrowseFilters } from '@/app/browse-filters'
import { supportContact } from '@/app/support-contact'
import { ActionLink, PageHeading } from '@/app/ui'
import type { Persona } from '@/features/auth/preview-personas'
import { Alert, AlertTitle } from '@/shared/components/ui/alert'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/shared/components/ui/sheet'
import { Textarea } from '@/shared/components/ui/textarea'
import { ArticleMarkdown } from './article-markdown'
import { articles } from './knowledge-articles'
import { readMarkdown, type Article } from './knowledge-markdown'
import { editDraft, readDraft } from './knowledge-preview'

const categories = [...new Set(articles.map(({ category }) => category))].sort()
const pageSize = 10
const searchDelay = 300
const articleDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' })

function ArticleUpdated({ updated }: { updated: string }) {
  return <span>Last updated <time dateTime={updated}>{articleDate.format(new Date(updated))}</time></span>
}

export function KnowledgeList({ manager }: { manager?: Persona }) {
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const searchText = query.trim().toLowerCase()

  useEffect(() => {
    if (manager || searchText === appliedQuery) return
    const timeout = window.setTimeout(() => {
      setAppliedQuery(searchText)
      setPage(1)
    }, searchDelay)
    return () => window.clearTimeout(timeout)
  }, [appliedQuery, manager, searchText])

  const needle = manager ? searchText : appliedQuery
  const shown = articles.filter((article) => (!category || article.category === category)
    && `${article.title} ${article.summary} ${article.body} ${article.category}`.toLowerCase().includes(needle))
  const pages = Math.ceil(shown.length / pageSize)
  const first = (page - 1) * pageSize
  const rows = shown.slice(first, first + pageSize)
  return (
    <div className={manager ? 'space-y-5' : 'mx-auto w-full max-w-3xl space-y-5'}>
      <PageHeading title={manager ? 'Manage knowledge' : 'Knowledge base'}
        description={manager ? 'Review published fixture articles and edit local drafts.' : 'Find troubleshooting guides and instructions for common IT requests.'} />
      <BrowseFilters query={query} category={category} categories={categories} onQuery={setQuery} onCategory={(value) => {
        setCategory(value)
        setPage(1)
      }} />
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {!manager && pages > 1 ? `Showing ${first + 1}–${first + rows.length} of ` : ''}
        {shown.length} {shown.length === 1 ? 'article' : 'articles'}
      </p>
      {shown.length === 0 ? (
        <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">No articles match your filters.</p>
      ) : manager ? <div className="grid gap-4 sm:grid-cols-2">
        {shown.map((article) => (
          <Card key={article.id}>
            <CardHeader>
              <div className="flex flex-wrap gap-2"><Badge variant="outline">{article.category}</Badge>
                {readDraft(manager, article) && <Badge>Draft saved</Badge>}</div>
              <h2 className="mt-2 text-lg font-bold">{article.title}</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{article.summary}</p>
              <ActionLink variant="outline" href={`/workspace/knowledge/${article.id}`}>Edit draft</ActionLink>
            </CardContent>
          </Card>
        ))}
      </div> : (
        <ul aria-label="Knowledge articles" className="divide-y divide-border border-y border-border">
          {rows.map((article) => (
            <li key={article.id} className="space-y-1 py-4">
              <p className="flex flex-wrap gap-x-3 text-xs font-medium text-muted-foreground">
                <span>{article.category}</span>
                <ArticleUpdated updated={article.updated} />
              </p>
              <h2 className="text-lg font-semibold leading-snug">
                <a href={`/portal/knowledge/${article.id}`} className="rounded-sm text-primary underline-offset-4 hover:underline focus-visible:underline">
                  {article.title}
                </a>
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{article.summary}</p>
            </li>
          ))}
        </ul>
      )}
      {!manager && pages > 1 && (
        <nav aria-label="Knowledge results pagination" className="flex flex-wrap items-center gap-3">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
          <Button variant="outline" disabled={page === pages} onClick={() => setPage(page + 1)}>Next</Button>
        </nav>
      )}
    </div>
  )
}

export function KnowledgeArticle({ article }: { article: Article }) {
  const [outlineOpen, setOutlineOpen] = useState(false)
  const selectedHeading = useRef<string | null>(null)
  const blocks = readMarkdown(article.body)
  const headings = blocks.filter((block) => block.type === 'heading')

  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (id.startsWith('section-')) document.getElementById(id)?.scrollIntoView()
  }, [article.id])

  function finishNavigation(open: boolean) {
    if (open || !selectedHeading.current) return
    const target = document.getElementById(selectedHeading.current)
    selectedHeading.current = null
    if (!target) return
    const hash = `#${target.id}`
    if (window.location.hash !== hash) window.history.pushState(null, '', hash)
    target.focus({ preventScroll: true })
    target.scrollIntoView()
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card py-2 dark:bg-background">
        <ActionLink href="/portal/knowledge" variant="ghost">
          <RiArrowLeftLine aria-hidden="true" /> Back to knowledge base
        </ActionLink>
        {headings.length > 0 && (
          <Sheet open={outlineOpen} onOpenChange={setOutlineOpen} onOpenChangeComplete={finishNavigation}>
            <SheetTrigger render={<Button variant="outline" />}>
              <RiListUnordered aria-hidden="true" /> On this page
            </SheetTrigger>
            <SheetContent className="bg-card text-card-foreground">
              <SheetHeader className="border-b border-border pr-14">
                <SheetTitle>On this page</SheetTitle>
                <SheetDescription>Jump to a section in this article.</SheetDescription>
              </SheetHeader>
              <nav aria-label="Article sections" className="min-h-0 flex-1 overflow-y-auto p-4">
                <ul className="space-y-1">
                  {headings.map(({ id, level, text }) => (
                    <li key={id} style={{ paddingInlineStart: (level - 2) * 10 }}>
                      <a href={`#${id}`} className="block rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:text-primary"
                        onClick={(event) => {
                          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                          event.preventDefault()
                          selectedHeading.current = id
                          setOutlineOpen(false)
                        }}>
                        {text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </SheetContent>
          </Sheet>
        )}
      </div>
      <PageHeading title={article.title} description={article.summary} actions={<Badge variant="outline">{article.category}</Badge>} />
      <p className="text-sm text-muted-foreground"><ArticleUpdated updated={article.updated} /></p>
      <div className="space-y-5">
        <ArticleMarkdown blocks={blocks} />
        {article.service && <ActionLink href={`/portal/requests/new/${article.service}`}>Open service request</ActionLink>}
      </div>
      <Card className="border border-primary/20 bg-secondary text-secondary-foreground shadow-none ring-0">
        <CardContent className="space-y-3">
          <h2 className="text-lg font-semibold">Having Issues?</h2>
          <p className="text-muted-foreground">Contact the service desk by email or phone. These are sample contact details for the preview.</p>
          <div className="flex flex-wrap gap-2">
            <ActionLink variant="outline" href={`mailto:${supportContact.email}`}>{supportContact.email}</ActionLink>
            <ActionLink variant="outline" href={`tel:${supportContact.telephone}`}>{supportContact.phone}</ActionLink>
          </div>
        </CardContent>
      </Card>
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
          <label className="filter-label">Article content (Markdown)<Textarea required rows={8} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></label>
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
