import { useState } from 'react'

import { PageHeading } from '@/app/ui'
import { errorMessage, roleLabels, signOut, type Identity } from '@/features/auth/client'
import { Alert, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'

export function LiveProfile({ identity }: { identity: Identity }) {
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')

  async function logout() {
    if (busy) return
    setBusy(true)
    setFailure('')
    try {
      await signOut()
      window.location.replace('/login')
    } catch (error) {
      setFailure(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <PageHeading title="Profile & preferences" description="Review your account and manage this browser session." />
      <Card>
        <CardHeader><h2 className="text-lg font-semibold">Account</h2></CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div><dt className="text-sm text-muted-foreground">Display name</dt><dd>{identity.display_name}</dd></div>
            <div><dt className="text-sm text-muted-foreground">Roles</dt>
              <dd>{identity.roles.map((role) => roleLabels[role]).join(', ') || 'No assigned roles'}</dd></div>
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><h2 className="text-lg font-semibold">Appearance</h2></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Appearance starts with your system theme. The theme button in the header changes it for this browser.</p></CardContent>
      </Card>
      <Card>
        <CardHeader><h2 className="text-lg font-semibold">Session security</h2></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Sign out to end this browser session.</p>
          {failure && <Alert variant="destructive"><AlertTitle>{failure}</AlertTitle></Alert>}
          <Button variant="outline" onClick={() => void logout()} disabled={busy}>Sign out</Button>
        </CardContent>
      </Card>
    </div>
  )
}
