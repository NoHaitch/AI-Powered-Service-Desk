import { useState } from 'react'

import { ActionLink, PageHeading } from '@/app/ui'
import { roleLabels, type Persona } from '@/features/auth/preview-personas'
import { canViewTicket, type PreviewTicket } from '@/features/tickets/ticket-preview'
import { Alert, AlertTitle } from '@/shared/components/ui/alert'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Switch } from '@/shared/components/ui/switch'
import { readPreview, writePreview } from '@/shared/lib/preview-storage'

const alertsKey = (persona: Persona) => `service-desk.preview.ticket-alerts.${persona.id}`
const readKey = (persona: Persona) => `service-desk.preview.notifications-read.${persona.id}`
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'
const isStringList = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string')

export function ProfilePage({ persona }: { persona: Persona }) {
  const [enabled, setEnabled] = useState(() => readPreview(alertsKey(persona), isBoolean, true))
  const [result, setResult] = useState<'saved' | 'error'>()

  function change(value: boolean) {
    if (writePreview(alertsKey(persona), value)) {
      setEnabled(value)
      setResult('saved')
    } else setResult('error')
  }

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeading title="Profile & preferences" description="Review your preview identity and personalize this tab." />
      <Card>
        <CardHeader><h2 className="text-lg font-bold">Profile</h2></CardHeader>
        <CardContent><dl className="grid grid-cols-2 gap-4 text-sm">
          <div><dt className="text-muted-foreground">Name</dt><dd className="font-semibold">{persona.name}</dd></div>
          <div><dt className="text-muted-foreground">Team</dt><dd className="font-semibold">{persona.team}</dd></div>
          <div><dt className="text-muted-foreground">Role</dt><dd className="font-semibold">{roleLabels[persona.role]}</dd></div>
        </dl></CardContent>
      </Card>
      <Card>
        <CardHeader><h2 className="text-lg font-bold">Preferences</h2></CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">
            Show ticket updates in this tab <Switch checked={enabled} onCheckedChange={change} />
          </label>
          <p className="text-sm text-muted-foreground">Use the theme menu in the header for Light, Dark, or System appearance.</p>
          {result && <Alert role={result === 'saved' ? 'status' : 'alert'} variant={result === 'saved' ? 'default' : 'destructive'}>
            <AlertTitle>{result === 'saved' ? 'Preference saved in this tab.' : 'Could not save the preference. Try again.'}</AlertTitle>
          </Alert>}
        </CardContent>
      </Card>
    </div>
  )
}

export function NotificationsPage({ persona, tickets }: { persona: Persona; tickets: PreviewTicket[] }) {
  const [read, setRead] = useState(() => readPreview(readKey(persona), isStringList, []))
  const [failure, setFailure] = useState(false)
  const enabled = readPreview(alertsKey(persona), isBoolean, true)
  const base = persona.role === 'employee' ? '/portal' : '/workspace'
  const entries = enabled ? tickets.filter((ticket) => canViewTicket(ticket, persona)).flatMap((ticket) => {
    if (persona.role === 'agent') {
      return ticket.assigneeId === persona.id && ticket.status !== 'closed'
        ? [{ ticket, label: 'Assigned to you', id: `${ticket.id}:assignment`, at: ticket.history.at(-1)?.at ?? ticket.createdAt }] : []
    }
    const event = ticket.history.filter(({ internal }) => !internal).at(-1)
    return event && event.label !== 'Incident reported' && event.label !== 'Service request submitted'
      ? [{ ticket, label: event.label, id: `${ticket.id}:${event.at}:${event.label}`, at: event.at }] : []
  }).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)) : []

  function markRead(ids: string[]) {
    const next = [...new Set([...read, ...ids])]
    if (writePreview(readKey(persona), next)) {
      setRead(next)
      setFailure(false)
    } else setFailure(true)
  }

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeading title="Notifications" description="Ticket updates available to your preview persona."
        actions={<Button variant="outline" disabled={entries.every(({ id }) => read.includes(id))}
          onClick={() => markRead(entries.map(({ id }) => id))}>Mark all as read</Button>} />
      {failure && <Alert variant="destructive" role="alert"><AlertTitle>Could not save read status. Try again.</AlertTitle></Alert>}
      {entries.length ? <Card><CardContent><ul className="divide-y divide-border">
        {entries.map(({ ticket, id, label }) => (
          <li key={id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{ticket.id} · {label}</p>
              <a className="text-sm font-semibold hover:underline" href={`${base}/tickets/${ticket.id}`}>{ticket.summary}</a>
            </div>
            {read.includes(id) ? <Badge variant="outline">Read</Badge>
              : <Button size="sm" variant="ghost" aria-label={`Mark ${ticket.id} as read`} onClick={() => markRead([id])}>Mark read</Button>}
          </li>
        ))}
      </ul></CardContent></Card> : <Card><CardContent>
        <p className="mb-3 text-sm text-muted-foreground">{enabled ? 'No notifications yet.' : 'Ticket updates are hidden by your preference.'}</p>
        {!enabled && <ActionLink variant="outline" href={`${base}/profile`}>Open preferences</ActionLink>}
      </CardContent></Card>}
    </div>
  )
}
