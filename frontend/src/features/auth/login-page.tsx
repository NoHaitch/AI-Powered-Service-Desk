import {
  RiArrowRightLine, RiHeadphoneLine, RiInbox2Line, RiShieldCheckLine, RiUser3Line,
} from '@remixicon/react'

import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { enterPreview, personas, roleLabels } from './preview-personas'

export function LoginPage() {
  return (
    <div className="grid flex-1 bg-desk-surface lg:grid-cols-[0.93fr_1fr]">
      <section className="brand-hero px-6 py-10 sm:px-12 lg:flex lg:flex-col lg:justify-center lg:px-18 lg:py-16">
        <div className="relative mx-auto w-full max-w-md">
          <div className="mb-6 flex size-13 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <RiHeadphoneLine className="size-7" aria-hidden="true" />
          </div>
          <h1 className="text-4xl leading-tight font-bold tracking-tight sm:text-5xl">AI-Powered<br />Service Desk</h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-muted-foreground">
            Report workplace IT issues, track your tickets, and help the service desk triage incoming incidents.
          </p>
          <div className="mt-10 hidden grid-cols-2 gap-3 lg:grid">
            <div className="rounded-2xl border border-border bg-card/60 p-4">
              <RiUser3Line className="mb-3 size-5 text-primary" aria-hidden="true" />
              <p className="text-sm font-semibold">Employee portal</p>
              <p className="mt-1 text-xs text-muted-foreground">Submit and track incidents</p>
            </div>
            <div className="rounded-2xl border border-border bg-card/60 p-4">
              <RiInbox2Line className="mb-3 size-5 text-primary" aria-hidden="true" />
              <p className="text-sm font-semibold">Support workspace</p>
              <p className="mt-1 text-xs text-muted-foreground">Review and triage reports</p>
            </div>
          </div>
        </div>
      </section>
      <section className="px-5 py-10 sm:px-10 lg:flex lg:items-center lg:py-16">
        <div className="mx-auto w-full max-w-md">
          <Badge variant="outline" className="mb-4"><RiShieldCheckLine aria-hidden="true" /> Local preview</Badge>
          <h2 className="text-3xl font-bold tracking-tight">Sign in to the preview</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Choose a synthetic account to explore its role. The preview does not connect to an authentication service.
          </p>
          <div className="mt-6 grid gap-2.5">
            {personas.map((persona) => (
              <Button key={persona.id} variant="outline" className="h-auto w-full justify-between gap-3 bg-card px-3 py-3.5 text-left"
                onClick={() => enterPreview(persona)} aria-label={`Continue as ${persona.name}, ${roleLabels[persona.role]}`}>
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-xs font-bold text-accent-foreground">{persona.initials}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{persona.name}</span>
                    <span className="block text-xs font-normal text-muted-foreground">{roleLabels[persona.role]} · {persona.team}</span>
                  </span>
                </span>
                <RiArrowRightLine className="text-muted-foreground" aria-hidden="true" />
              </Button>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Use synthetic information only. Preview changes are stored in this tab.</p>
        </div>
      </section>
    </div>
  )
}
