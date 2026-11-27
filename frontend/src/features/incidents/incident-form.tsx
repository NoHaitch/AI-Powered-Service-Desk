import { useState, type FormEvent } from 'react'
import { RiArrowLeftLine, RiSendPlaneLine } from '@remixicon/react'

import { ActionLink, PageHeading } from '@/app/ui'
import { Alert, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardFooter } from '@/shared/components/ui/card'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { errorMessage, protectedWrite } from '@/features/auth/client'
import { descriptionLimit, summaryLimit, validateIncident } from './incident-model'

export function IncidentForm({ actor }: { actor: string }) {
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [promptReview, setPromptReview] = useState(false)
  const [errors, setErrors] = useState<{ summary?: string; description?: string }>({})
  const [failure, setFailure] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const input = { summary, description, promptReview }
    const { errors, values } = validateIncident(input)
    setErrors(errors)
    setFailure('')
    if (Object.keys(errors).length) {
      event.currentTarget.querySelector<HTMLElement>(errors.summary ? '#summary' : '#description')?.focus()
      return
    }
    setBusy(true)
    try {
      const incident = await protectedWrite<{ id: string }>('/api/v1/incidents', actor, {
        summary: values.summary, description: values.description, prompt_review: values.promptReview,
      })
      window.location.assign(`/portal/tickets/${incident.id}?result=created`)
    } catch (error) {
      setFailure(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-5 py-8 sm:px-8">
      <ActionLink variant="ghost" href="/portal/tickets"><RiArrowLeftLine /> My Tickets</ActionLink>
      <PageHeading title="Report an incident" description="Describe a disruption or an issue with an IT service." />
      <form noValidate onSubmit={submit}>
        <Card>
          <CardContent className="space-y-5">
            {failure && <Alert variant="destructive"><AlertTitle>{failure}</AlertTitle></Alert>}
            <div className="space-y-1.5">
              <Label htmlFor="summary">Summary</Label>
              <Input id="summary" required value={summary} placeholder="Example: VPN disconnects when switching networks"
                aria-invalid={!!errors.summary} aria-describedby="summary-help"
                onChange={(event) => setSummary(event.target.value)} />
              <p id="summary-help" className={errors.summary ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
                {errors.summary ?? `A short description, up to ${summaryLimit} characters.`}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" required className="min-h-32" value={description}
                aria-invalid={!!errors.description} aria-describedby="description-help"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Which service is affected? What happened, who is affected, and when did it start?" />
              <p id="description-help" className={errors.description ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
                {errors.description ?? `Use synthetic information only. Up to ${descriptionLimit.toLocaleString('en-US')} characters.`}
              </p>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3">
              <Checkbox id="prompt-review" checked={promptReview} onCheckedChange={setPromptReview} aria-describedby="prompt-review-help" />
              <div>
                <Label htmlFor="prompt-review">Request prompt review</Label>
                <p id="prompt-review-help" className="mt-1 text-xs text-muted-foreground">Flags the report for L1. Priority is set during triage.</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="gap-2">
            <Button type="submit" disabled={busy}><RiSendPlaneLine /> Submit incident</Button>
            <ActionLink href="/portal/tickets" variant="outline">Cancel</ActionLink>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
