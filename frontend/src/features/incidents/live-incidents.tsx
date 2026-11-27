import { useEffect, useState } from 'react'
import { RiArrowLeftLine, RiFileAddLine } from '@remixicon/react'

import { ActionLink, PageHeading, PriorityBadge, StatusBadge } from '@/app/ui'
import { errorMessage, protectedRead, protectedWrite } from '@/features/auth/client'
import { Alert, AlertTitle } from '@/shared/components/ui/alert'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { DeskSelect } from '@/shared/components/ui/desk-select'
import { Spinner } from '@/shared/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import type { Priority } from './incident-model'
import { TriageForm } from './triage-form'

type Summary = {
  id: string
  reference: string
  summary: string
  status: 'new' | 'triaged'
  priority: 1 | 2 | 3 | 4 | null
  created_at: string
  updated_at: string
}
type Detail = Summary & { description: string }
type StaffDetail = Detail & { queue: 'l1'; prompt_review: boolean }

function useData<T>(path: string, actor: string) {
  const [result, setResult] = useState<{ path: string; data?: T; error?: string }>()
  useEffect(() => {
    const controller = new AbortController()
    void protectedRead<T>(path, actor, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setResult({ path, data }) },
      (error: unknown) => {
        if (!controller.signal.aborted) setResult({ path, error: errorMessage(error) })
      },
    )
    return () => controller.abort()
  }, [path, actor])
  return result?.path === path ? result : undefined
}

function Loading() {
  return <div className="grid min-h-48 place-items-center"><Spinner aria-label="Loading incidents" /></div>
}

function Fail({ error }: { error: string }) {
  return <Alert variant="destructive"><AlertTitle>{error}</AlertTitle></Alert>
}

function priority(value: Summary['priority']): Priority | null {
  return value === null ? null : `P${value}`
}

const date = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

export function LiveIncidents({ actor, staff = false }: { actor: string; staff?: boolean }) {
  const [flagged, setFlagged] = useState(false)
  const [size, setSize] = useState(10)
  const [page, setPage] = useState(0)
  const endpoint = staff ? '/api/v1/queues/l1/incidents' : '/api/v1/incidents'
  const result = useData<Array<Summary | StaffDetail>>(
    `${endpoint}?limit=${size}&offset=${size * page}${staff && flagged ? '&flagged_only=true' : ''}`, actor,
  )
  const base = staff ? '/workspace' : '/portal'

  return (
    <div className="space-y-5">
      <PageHeading title={staff ? 'L1 intake queue' : 'My Tickets'}
        description={staff ? 'Review new incidents in the order they arrived.' : 'Track the incidents you reported.'}
        actions={!staff && <ActionLink href="/portal/incidents/new"><RiFileAddLine /> Report an incident</ActionLink>} />
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {staff && <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={flagged} onChange={(event) => { setFlagged(event.target.checked); setPage(0) }} />
              Flagged for prompt review only
            </label>}
            <label className="ml-auto flex items-center gap-2 text-sm">Show
              <DeskSelect value={size} onChange={(event) => { setSize(Number(event.target.value)); setPage(0) }}>
                {[10, 20, 50, 100].map((count) => <option key={count} value={count}>{count}</option>)}
              </DeskSelect>
            </label>
          </div>
          {!result ? <Loading /> : result.error ? <Fail error={result.error} /> :
            !result.data?.length ? <p className="p-4 text-sm text-muted-foreground">No incidents to show.</p> :
              <Table>
                <TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Summary</TableHead>
                  <TableHead>Status</TableHead><TableHead>Priority</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
                <TableBody>
                  {result.data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.reference}</TableCell>
                      <TableCell><a className="font-semibold text-primary hover:underline" href={`${base}/tickets/${item.id}`}>{item.summary}</a>
                        {'prompt_review' in item && item.prompt_review && <Badge variant="outline" className="ml-2">Prompt review</Badge>}</TableCell>
                      <TableCell><StatusBadge status={item.status} /></TableCell>
                      <TableCell><PriorityBadge priority={priority(item.priority)} /></TableCell>
                      <TableCell>{date(item.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>}
          <nav className="flex items-center justify-end gap-2" aria-label="Incident pages">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page + 1}</span>
            <Button variant="outline" size="sm" disabled={result?.data?.length !== size} onClick={() => setPage(page + 1)}>Next</Button>
          </nav>
        </CardContent>
      </Card>
    </div>
  )
}

export function LiveIncident({ id, actor, staff }: { id: string; actor: string; staff: boolean }) {
  const endpoint = `/api/v1/incidents/${id}`
  const result = useData<Detail | StaffDetail>(endpoint, actor)
  const item = result?.data
  const base = staff ? '/workspace' : '/portal'
  const outcome = new URLSearchParams(window.location.search).get('result')
  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <ActionLink variant="ghost" href={staff ? '/workspace/queue' : '/portal/tickets'}>
        <RiArrowLeftLine /> {staff ? 'Back to intake queue' : 'Back to My Tickets'}
      </ActionLink>
      {!result ? <Loading /> : result.error ? <Fail error={result.error} /> : item &&
        <>
          <PageHeading title={item.summary} description={item.reference} />
          {outcome === 'created' && <Alert><AlertTitle>Incident submitted</AlertTitle></Alert>}
          {outcome === 'triaged' && item.status === 'triaged' && <Alert><AlertTitle>Triage completed</AlertTitle></Alert>}
          <Card>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2"><StatusBadge status={item.status} />
                <PriorityBadge priority={priority(item.priority)} />
                {staff && 'prompt_review' in item && item.prompt_review && <Badge variant="outline">Prompt review</Badge>}
              </div>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{item.description}</p>
              <p className="text-sm text-muted-foreground">Updated {date(item.updated_at)}</p>
            </CardContent>
          </Card>
          {staff && 'queue' in item && item.status === 'new' && <TriageForm save={async (impact, urgency) => {
            await protectedWrite(`${endpoint}/triage`, actor, { impact, urgency })
            window.location.assign(`${base}/tickets/${id}?result=triaged`)
          }} />}
        </>}
    </div>
  )
}
