import { useState, type FormEvent } from 'react'

import type { Persona } from '@/features/auth/preview-personas'
import { Alert, AlertTitle } from '@/shared/components/ui/alert'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Textarea } from '@/shared/components/ui/textarea'
import { canReply, personaName, saveReply, ticketDate, ticketMessages, type PreviewTicket } from './ticket-preview'

function ReplyForm({ ticket, persona, internal, onSave }: {
  ticket: PreviewTicket; persona: Persona; internal: boolean; onSave: () => void
}) {
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const id = internal ? 'internal-note' : 'ticket-reply'

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const length = Array.from(body.trim()).length
    if (length < 1 || length > 2000) {
      setError('Enter 1 to 2,000 characters.')
      return
    }
    if (!saveReply(ticket.id, persona, body, internal)) {
      setError('Could not save this message. Reload the ticket and try again.')
      return
    }
    setError('')
    setBody('')
    onSave()
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border p-3" noValidate>
      <label htmlFor={id} className="text-sm font-semibold">{internal ? 'Internal note' : 'Reply to ticket'}</label>
      <p id={`${id}-scope`} className="text-xs text-muted-foreground">{internal ? 'Visible to support agents with ticket access.' : 'Visible to the requester and support staff with ticket access.'}</p>
      <Textarea id={id} value={body} onChange={(event) => setBody(event.target.value)} required rows={3}
        aria-invalid={!!error} aria-describedby={error ? `${id}-scope ${id}-error` : `${id}-scope`} />
      {error && <p id={`${id}-error`} className="text-sm text-destructive" role="alert">{error}</p>}
      <Button type="submit" variant={internal ? 'outline' : 'default'}>{internal ? 'Add internal note' : 'Send reply'}</Button>
    </form>
  )
}

export function TicketConversation({ ticket, persona }: { ticket: PreviewTicket; persona: Persona }) {
  const [messages, setMessages] = useState(() => ticketMessages(ticket, persona))
  const [confirmation, setConfirmation] = useState('')
  const refresh = (message: string) => {
    setMessages(ticketMessages(ticket, persona))
    setConfirmation(message)
  }

  return (
    <Card>
      <CardHeader><h2 className="text-lg font-bold">Conversation</h2></CardHeader>
      <CardContent className="space-y-4">
        {messages.length > 0 ? <ol className="space-y-3">
          {messages.map((message) => (
            <li key={message.id} className={message.internal ? 'rounded-xl border border-amber-400/40 bg-amber-500/10 p-3' : 'rounded-xl bg-muted/60 p-3'}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-semibold">{personaName(message.authorId)}</span>
                {message.internal && <Badge variant="outline">Internal note</Badge>}
                <time className="text-xs text-muted-foreground" dateTime={message.at}>{ticketDate.format(new Date(message.at))}</time>
              </div>
              <p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm">{message.body}</p>
            </li>
          ))}
        </ol> : <p className="text-sm text-muted-foreground">No messages yet.</p>}
        {confirmation && <Alert role="status"><AlertTitle>{confirmation}</AlertTitle></Alert>}
        {canReply(ticket, persona, false)
          ? <ReplyForm ticket={ticket} persona={persona} internal={false} onSave={() => refresh('Reply saved in this tab.')} />
          : <p className="text-sm text-muted-foreground">This conversation is read-only.</p>}
        {canReply(ticket, persona, true) && <ReplyForm ticket={ticket} persona={persona} internal onSave={() => refresh('Internal note saved in this tab.')} />}
      </CardContent>
    </Card>
  )
}
