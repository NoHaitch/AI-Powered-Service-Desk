import { RiArrowRightLine, RiCheckDoubleLine, RiFlagLine, RiInbox2Line, RiUserLine } from '@remixicon/react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { ActionLink, PageHeading, StatusBadge } from '@/app/ui'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/shared/components/ui/chart'
import type { Persona } from '@/features/auth/preview-personas'
import { previewIntake, type PreviewTicket } from '@/features/tickets/ticket-preview'

const chartConfig = { count: { label: 'Reported', color: 'var(--chart-2)' } }
const axisTick = { fill: 'var(--muted-foreground)' }
const dayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' })

function recentVolume(incidents: PreviewTicket[]) {
  const latest = incidents.map(({ createdAt }) => createdAt).sort().at(-1)
  const end = new Date(latest ?? Date.now())
  end.setUTCHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(end)
    day.setUTCDate(day.getUTCDate() - 6 + index)
    const key = day.toISOString().slice(0, 10)
    return { day: dayLabel.format(day), count: incidents.filter(({ createdAt }) => createdAt.startsWith(key)).length }
  })
}

export function WorkspaceDashboard({ tickets, persona }: { tickets: PreviewTicket[]; persona: Persona }) {
  const incidents = tickets.filter(({ source }) => source.kind === 'incident')
  const queue = previewIntake(incidents)
  const requestCount = tickets.length - incidents.length
  const isAgent = persona.role === 'agent'
  const mine = tickets.filter(({ assigneeId, status }) => assigneeId === persona.id && status !== 'closed')
  const metrics = [
    { label: 'Awaiting triage', count: queue.length, icon: RiInbox2Line, color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200' },
    { label: 'Prompt review', count: queue.filter(({ source }) => source.kind === 'incident' && source.incident.promptReview).length, icon: RiFlagLine, color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' },
    { label: 'Resolved or closed', count: incidents.filter(({ status }) => status === 'resolved' || status === 'closed').length, icon: RiCheckDoubleLine, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' },
    { label: isAgent ? 'My open assignments' : 'Service requests', count: isAgent ? mine.length : requestCount, icon: RiUserLine, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200' },
  ]
  return (
    <>
      <PageHeading title="Workspace overview" description="Review incident volume, L1 intake, and current workload."
        actions={isAgent ? <div className="flex flex-wrap gap-2">
          <ActionLink href="/workspace/assignments" variant="outline">My assignments</ActionLink>
          <ActionLink href="/workspace/queue">Open intake queue <RiArrowRightLine /></ActionLink>
        </div> : undefined} />
      <div className="grid gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, count, icon: Icon, color }) => (
          <Card key={label}><CardContent className="flex items-center justify-between gap-2 px-3 sm:px-6">
            <div><p className="text-xs font-semibold text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-bold">{count}</p></div>
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl sm:size-10 ${color}`}><Icon className="size-5" aria-hidden="true" /></span>
          </CardContent></Card>
        ))}
      </div>
      <div className={isAgent ? 'grid gap-4 xl:grid-cols-[1.2fr_1fr]' : 'grid gap-4'}>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold">Incident volume</h2>
            <p className="text-xs text-muted-foreground">Seven days ending with the latest fixture report</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-52 w-full">
              <AreaChart accessibilityLayer data={recentVolume(incidents)} margin={{ right: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="day" tick={axisTick} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} width={24} tick={axisTick} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="count" stroke="var(--color-count)" fill="var(--color-count)" fillOpacity={0.16} strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
        {isAgent && (
          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">Next in intake</h2>
              <ActionLink href="/workspace/tickets" variant="outline">All tickets</ActionLink>
            </CardHeader>
            <CardContent>
              {queue.length === 0 ? <p className="text-sm text-muted-foreground">The intake queue is clear.</p> : (
                <ul className="divide-y divide-border">
                  {queue.slice(0, 4).map((incident) => (
                    <li key={incident.id}>
                      <a href={`/workspace/tickets/${incident.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-primary">
                        <span>
                          <span className="block font-mono text-xs text-muted-foreground">{incident.id}</span>
                          <span className="font-semibold">{incident.summary}</span>
                        </span>
                        <StatusBadge status={incident.status} />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
