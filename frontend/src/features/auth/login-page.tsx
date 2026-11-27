import { useState, type FormEvent } from 'react'
import { RiShieldCheckLine } from '@remixicon/react'

import { PageHeading } from '@/app/ui'
import { Alert, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Spinner } from '@/shared/components/ui/spinner'
import { ApiError, errorMessage, homeForIdentity, signIn } from './client'

export function LoginPage() {
  const [failure, setFailure] = useState('')
  const [busy, setBusy] = useState(false)
  const [retryAt, setRetryAt] = useState(0)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || Date.now() < retryAt) return
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setFailure('')
    try {
      const identity = await signIn(String(form.get('username')), String(form.get('password')))
      window.location.replace(homeForIdentity(identity))
    } catch (error) {
      if (error instanceof ApiError && error.retryAfter) {
        setRetryAt(Date.now() + error.retryAfter * 1000)
      }
      setFailure(errorMessage(error, true))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-8 px-5 py-10 sm:px-8 lg:grid-cols-2">
      <div className="brand-hero space-y-4 rounded-4xl border border-border p-8 sm:p-12">
        <PageHeading title="Workplace IT support" description="Report a disruption, track your incidents, or triage incoming reports from the support workspace." />
      </div>
      <Card className="w-full lg:mx-auto lg:max-w-md">
        <CardContent className="space-y-5 pt-2">
          <div className="space-y-2">
            <RiShieldCheckLine className="size-6 text-primary" aria-hidden="true" />
            <h2 className="text-2xl font-bold">Sign in to Service Desk</h2>
            <p className="text-sm text-muted-foreground">Use your provisioned username and password.</p>
          </div>
          <form className="space-y-4" onSubmit={submit}>
            {failure && <Alert variant="destructive"><AlertTitle>{failure}</AlertTitle></Alert>}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" autoComplete="username" maxLength={128} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" maxLength={128} required />
            </div>
            <Button className="w-full" type="submit" disabled={busy}>
              {busy && <Spinner aria-hidden="true" />} Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
