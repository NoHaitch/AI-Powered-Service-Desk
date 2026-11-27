import { useState, type FormEvent } from 'react'
import { RiCheckLine } from '@remixicon/react'

import { PriorityBadge } from '@/app/ui'
import { Alert, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { DeskSelect } from '@/shared/components/ui/desk-select'
import { Card, CardContent, CardFooter, CardHeader } from '@/shared/components/ui/card'
import { errorMessage } from '@/features/auth/client'
import { assessPriority, assessments, type Assessment } from './incident-model'

export function TriageForm({ save }: { save: (impact: Assessment, urgency: Assessment) => Promise<void> }) {
  const [impact, setImpact] = useState<Assessment | ''>('')
  const [urgency, setUrgency] = useState<Assessment | ''>('')
  const [failure, setFailure] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!impact || !urgency || busy) return
    setFailure('')
    setBusy(true)
    try {
      await save(impact, urgency)
    } catch (error) {
      setFailure(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <Card>
        <CardHeader><h2 className="text-lg font-bold">L1 triage</h2></CardHeader>
        <CardContent className="space-y-4">
          {failure && <Alert variant="destructive"><AlertTitle>{failure}</AlertTitle></Alert>}
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
        <CardFooter><Button type="submit" disabled={!impact || !urgency || busy}><RiCheckLine /> Complete triage</Button></CardFooter>
      </Card>
    </form>
  )
}
