import { useRef, useState, type FormEvent } from 'react'
import { RiArrowDownLine, RiArrowLeftLine, RiArrowRightLine, RiTimeLine } from '@remixicon/react'

import { BrowseFilters } from '@/app/browse-filters'
import { ActionLink, PageHeading } from '@/app/ui'
import type { Persona } from '@/features/auth/preview-personas'
import { Alert, AlertTitle } from '@/shared/components/ui/alert'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { DeskSelect } from '@/shared/components/ui/desk-select'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { isFieldRequired, services, validateRequest, validateServiceFields, type Service } from './catalog-model'
import { submitRequest } from './request-fixtures'

const categories = [...new Set(services.map(({ category }) => category))].sort()

function ProcessingEstimate({ estimate }: { estimate: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
      <RiTimeLine className="size-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">Estimated processing time: </span>
      {estimate}
    </span>
  )
}

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
              <p><ProcessingEstimate estimate={service.processingEstimate} /></p>
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
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [failure, setFailure] = useState(false)
  const submitted = useRef(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitted.current) return
    const form = new FormData(event.currentTarget)
    const item = String(form.get('item') ?? '')
    const justification = String(form.get('justification') ?? '')
    const validation = validateRequest(item, justification)
    const input = Object.fromEntries(form)
    const extra = validateServiceFields(service, input)
    setErrors({ ...validation.errors, ...extra.errors })
    setFailure(false)
    if (validation.errors.item || validation.errors.justification || Object.keys(extra.errors).length) return
    const request = submitRequest(persona, service, item, justification, input)
    if (!request) {
      setFailure(true)
      return
    }
    submitted.current = true
    window.location.assign(`/portal/tickets/${request.id}?result=requested`)
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <ActionLink href="/portal/catalog" variant="ghost">
        <RiArrowLeftLine aria-hidden="true" /> Back to service catalog
      </ActionLink>
      <PageHeading title={service.title} description={(
        <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{service.description}</span>
          <ProcessingEstimate estimate={service.processingEstimate} />
        </span>
      )}
        actions={<ActionLink href="#request-form">Fill out request form <RiArrowDownLine aria-hidden="true" /></ActionLink>} />
      <section aria-labelledby="service-details" className="space-y-4 border-y border-border py-5">
        <h2 id="service-details" className="text-lg font-semibold">Service details</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{service.details}</p>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">When to use this service</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{service.criteria}</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">What to prepare</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
            {service.preparation.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          After submission, you can find the preview request in My Tickets in this browser tab.
        </p>
      </section>
      <Card className="border border-border shadow-none ring-0">
        <CardHeader>
          <h2 id="request-form" tabIndex={-1} className="scroll-mt-6 text-lg font-semibold">Request form</h2>
          <p className="text-xs text-muted-foreground">Preview estimate after required details and any approvals are in place.</p>
        </CardHeader>
        <CardContent>
          <form aria-labelledby="request-form" className="space-y-4" onSubmit={submit} noValidate>
            {failure && <Alert variant="destructive"><AlertTitle>Could not save the request in this tab. Try again.</AlertTitle></Alert>}
            <label className="filter-label">{service.field} <Input name="item" required aria-invalid={!!errors.item} aria-describedby={errors.item ? 'item-error' : undefined} /></label>
            {errors.item && <p id="item-error" role="alert" className="text-sm text-destructive">{errors.item}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              {service.fields.map((field) => {
                const required = isFieldRequired(field, selections)
                const error = errors[field.id]
                const errorId = `request-${field.id}-error`
                const props = { name: field.id, required, 'aria-invalid': !!error, 'aria-describedby': error ? errorId : undefined }
                return (
                  <div key={field.id} className="space-y-1">
                    <label className="filter-label">
                      <span>{field.label}{!required && <span className="font-normal text-muted-foreground"> (optional)</span>}</span>
                      {field.type === 'select' ? (
                        <DeskSelect {...props} className="aria-invalid:border-destructive"
                          onChange={(event) => setSelections({ ...selections, [field.id]: event.target.value })}>
                          <option value="">Select an option</option>
                          {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                        </DeskSelect>
                      ) : <Input {...props} type={field.type} />}
                    </label>
                    {error && <p id={errorId} role="alert" className="text-sm text-destructive">{error}</p>}
                  </div>
                )
              })}
            </div>
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
