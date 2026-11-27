import { useState, type FormEvent } from 'react'
import { RiCheckLine } from '@remixicon/react'

import { PriorityBadge } from '@/app/ui'
import { Alert, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { DeskSelect } from '@/shared/components/ui/desk-select'
import { Card, CardContent, CardFooter, CardHeader } from '@/shared/components/ui/card'
import type { Persona } from '@/features/auth/preview-personas'
import { savePreviewTriage } from './incident-fixtures'
import { assessPriority, assessments, type Assessment, type Incident } from './incident-model'

export function TriageForm({ incident, persona }: { incident: Incident; persona: Persona }) {
  const [impact, setImpact] = useState<Assessment | ''>('')
  const [urgency, setUrgency] = useState<Assessment | ''>('')
  const [failure, setFailure] = useState(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!impact || !urgency) return
    if (!savePreviewTriage(incident.id, persona, impact, urgency)) {
      setFailure(true)
      return
    }
    window.location.assign(`/workspace/tickets/${incident.id}?result=triaged`)
  }

  return (
    <form onSubmit={submit}>
      <Card>
        <CardHeader><h2 className="text-lg font-bold">L1 triage</h2></CardHeader>
        <CardContent className="space-y-4">
          {failure && <Alert variant="destructive"><AlertTitle>Triage could not be saved. Reload to check the current status.</AlertTitle></Alert>}
          <label className="filter-label">Impact
            <DeskSelect required value={impact} onChange={(event) => setImpact(event.target.value as Assessment | '')}>
              <option value="">Select impact</option>{assessments.map((level) => <option key={level} value={level}>{level[0].toUpperCase() + level.slice(1)}</option>)}
            </DeskSelect>
            <span className="font-normal text-muted-foreground">How widely does this affect work?</span>
          </label>
          <label className="filter-label">Urgency
            <DeskSelect required value={urgency} onChange={(event) => setUrgency(event.target.value as Assessment | '')}>
              <option value="">Select urgency</option>{assessments.map((level) => <option key={level} value={level}>{level[0].toUpperCase() + level.slice(1)}</option>)}
            </DeskSelect>
            <span className="font-normal text-muted-foreground">How long can the affected work wait?</span>
          </label>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 p-3">
            <span className="text-sm font-semibold">Calculated priority</span>
            <PriorityBadge priority={impact && urgency ? assessPriority(impact, urgency) : null} />
          </div>
        </CardContent>
        <CardFooter><Button type="submit" disabled={!impact || !urgency}><RiCheckLine /> Complete triage</Button></CardFooter>
      </Card>
    </form>
  )
}
