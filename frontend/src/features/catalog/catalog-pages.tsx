import { useRef, useState, type FormEvent } from 'react'
import { RiArrowRightLine } from '@remixicon/react'

import { BrowseFilters } from '@/app/browse-filters'
import { ActionLink, PageHeading } from '@/app/ui'
import type { Persona } from '@/features/auth/preview-personas'
import { Alert, AlertTitle } from '@/shared/components/ui/alert'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { services, validateRequest, type Service } from './catalog-model'
import { submitRequest } from './request-fixtures'

const categories = [...new Set(services.map(({ category }) => category))].sort()

export function ServiceCatalog() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const needle = query.trim().toLowerCase()
  const results = services.filter((service) => (!category || service.category === category)
    && `${service.title} ${service.description} ${service.category}`.toLowerCase().includes(needle))

  return (
    <div className="space-y-5">
      <PageHeading title="Service catalog" description="Find and request standard IT services." />
      <BrowseFilters query={query} category={category} categories={categories} onQuery={setQuery} onCategory={setCategory} />
      <p className="text-sm text-muted-foreground" aria-live="polite">{results.length} {results.length === 1 ? 'service' : 'services'}</p>
      {results.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((service) => (
          <Card key={service.id} className="border border-border shadow-none ring-0">
            <CardHeader><Badge variant="outline" className="bg-muted text-muted-foreground">{service.category}</Badge><h2 className="mt-2 text-lg font-bold">{service.title}</h2></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{service.description}</p>
              <a className="inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:underline"
                href={`/portal/requests/new/${service.id}`}>
                Open request <RiArrowRightLine className="size-4" aria-hidden="true" />
              </a>
            </CardContent>
          </Card>
        ))}
      </div> : <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">No services match your filters.</p>}
    </div>
  )
}

export function RequestForm({ service, persona }: { service: Service; persona: Persona }) {
  const [errors, setErrors] = useState({ item: '', justification: '' })
  const [failure, setFailure] = useState(false)
  const submitted = useRef(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitted.current) return
    const form = new FormData(event.currentTarget)
    const item = String(form.get('item') ?? '')
    const justification = String(form.get('justification') ?? '')
    const validation = validateRequest(item, justification)
    setErrors(validation.errors)
    setFailure(false)
    if (validation.errors.item || validation.errors.justification) return
    const request = submitRequest(persona, service, item, justification)
    if (!request) {
      setFailure(true)
      return
    }
    submitted.current = true
    window.location.assign(`/portal/tickets/${request.id}?result=requested`)
  }

  return (
    <div className="max-w-2xl space-y-5">
      <ActionLink href="/portal/catalog" variant="ghost">Back to service catalog</ActionLink>
      <PageHeading title={service.title} description={service.description} />
      <Card className="border border-border shadow-none ring-0">
        <CardContent>
          <form className="space-y-4" onSubmit={submit} noValidate>
            {failure && <Alert variant="destructive"><AlertTitle>Could not save the request in this tab. Try again.</AlertTitle></Alert>}
            <label className="filter-label">{service.field} <Input name="item" required aria-invalid={!!errors.item} aria-describedby={errors.item ? 'item-error' : undefined} /></label>
            {errors.item && <p id="item-error" role="alert" className="text-sm text-destructive">{errors.item}</p>}
            <label className="filter-label">Business justification
              <Textarea name="justification" required rows={5} aria-invalid={!!errors.justification}
                aria-describedby={errors.justification ? 'request-hint justification-error' : 'request-hint'} />
            </label>
            <p id="request-hint" className="text-sm text-muted-foreground">{service.hint} Use synthetic information only.</p>
            {errors.justification && <p id="justification-error" role="alert" className="text-sm text-destructive">{errors.justification}</p>}
            <Button type="submit">Submit preview request</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
