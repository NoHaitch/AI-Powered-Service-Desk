import { RiArrowLeftLine, RiCodeSSlashLine, RiErrorWarningLine, RiFlowChart, RiMailLine, RiQuestionLine, RiToolsLine } from '@remixicon/react'

import { HelpFaq } from '@/features/help/help-faq'
import { Card, CardContent } from '@/shared/components/ui/card'
import { supportContact } from './support-contact'
import { ActionLink, PageHeading } from './ui'

export function InformationPage({ help = false }: { help?: boolean }) {
  return (
    <div className={`mx-auto w-full space-y-6 px-5 py-10 sm:px-8 ${help ? 'max-w-3xl' : 'max-w-6xl'}`}>
      {help ? (
        <HelpFaq />
      ) : (
        <>
          <header className="brand-hero rounded-4xl border border-border px-6 py-8 sm:px-10 sm:py-12">
            <PageHeading title="About Service Desk" description="A local-first IT support application for employees and service desk teams." />
            <div className="mt-6 flex flex-wrap gap-3">
              <ActionLink href="/login">Choose a preview account</ActionLink>
              <ActionLink href="/help" variant="outline"><RiQuestionLine aria-hidden="true" /> Read the FAQ</ActionLink>
            </div>
          </header>
          <div className="grid gap-5 lg:grid-cols-2">
            <section aria-labelledby="about-workflow" className="min-w-0">
              <Card className="h-full">
                <CardContent className="space-y-3 text-justify text-sm leading-relaxed text-muted-foreground">
                  <h2 id="about-workflow" className="flex items-center gap-3 text-left text-lg font-semibold text-foreground">
                    <span className="rounded-xl bg-primary/12 p-2 text-primary"><RiFlowChart className="size-5" aria-hidden="true" /></span>
                    How it works
                  </h2>
                  <ol className="list-decimal space-y-1 pl-5">
                    <li>Choose an employee persona and report a disruption. The ticket appears as <strong>New</strong> in My Tickets.</li>
                    <li>Switch to the L1 support persona in the same tab. In the intake queue, assess impact and urgency to calculate the incident's priority and complete triage.</li>
                    <li>Switch back to the requester to see the updated status, priority, and activity in My Tickets.</li>
                  </ol>
                  <p>The preview uses synthetic accounts and keeps ticket changes in the current browser tab. Use sample information when trying the workflow.</p>
                </CardContent>
              </Card>
            </section>
            <section aria-labelledby="about-use-cases" className="min-w-0">
              <Card className="h-full">
                <CardContent className="space-y-3 text-justify text-sm leading-relaxed text-muted-foreground">
                  <h2 id="about-use-cases" className="flex items-center gap-3 text-left text-lg font-semibold text-foreground">
                    <span className="rounded-xl bg-primary/12 p-2 text-primary"><RiToolsLine className="size-5" aria-hidden="true" /></span>
                    What you can do
                  </h2>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>Report a VPN outage, flag it for prompt review, and track the incident as L1 assesses it.</li>
                    <li>Request shared-drive access through the service catalog or look up instructions in the knowledge base.</li>
                    <li>Review incoming reports as an L1 agent, reply to employees, and leave internal notes for support staff.</li>
                    <li>Try editing a knowledge article draft as an administrator. Employees continue to see the published sample.</li>
                  </ul>
                </CardContent>
              </Card>
            </section>
            <section aria-labelledby="about-stack" className="min-w-0">
              <Card className="h-full">
                <CardContent className="space-y-3 text-justify text-sm leading-relaxed text-muted-foreground">
                  <h2 id="about-stack" className="flex items-center gap-3 text-left text-lg font-semibold text-foreground">
                    <span className="rounded-xl bg-primary/12 p-2 text-primary"><RiCodeSSlashLine className="size-5" aria-hidden="true" /></span>
                    Technology stack
                  </h2>
                  <p>React and TypeScript power the interface, with Tailwind CSS and shadcn/ui for styling and components. Bun manages dependencies, Vite runs the development server and builds the app, and Nginx serves the release build in Docker Compose.</p>
                  <p>The Python and FastAPI backend provides health checks for PostgreSQL and Redis. PostgreSQL is the foundation for durable ticket storage, and Redis is in place for planned sign-in rate limiting. Live ticket storage, account sign-in, and AI-assisted troubleshooting are planned.</p>
                </CardContent>
              </Card>
            </section>
            <section aria-labelledby="about-contact" className="min-w-0">
              <Card className="h-full">
                <CardContent className="space-y-3 text-justify text-sm leading-relaxed text-muted-foreground">
                  <h2 id="about-contact" className="flex items-center gap-3 text-left text-lg font-semibold text-foreground">
                    <span className="rounded-xl bg-primary/12 p-2 text-primary"><RiMailLine className="size-5" aria-hidden="true" /></span>
                    Further questions
                  </h2>
                  <p>These are sample contact details for the demo.</p>
                  <dl className="grid gap-2 text-left sm:grid-cols-2">
                    <div className="rounded-xl bg-muted p-3">
                      <dt className="font-medium text-foreground">Email</dt>
                      <dd className="wrap-break-word">{supportContact.email}</dd>
                    </div>
                    <div className="rounded-xl bg-muted p-3">
                      <dt className="font-medium text-foreground">Phone</dt>
                      <dd>{supportContact.phone}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </section>
          </div>
        </>
      )}
    </div>
  )
}

const errors = {
  401: { title: 'Sign-in required', description: 'Choose a preview account to open this area.' },
  403: { title: 'Access denied', description: 'Your current role does not have access to this area.' },
  404: { title: 'Page not found', description: 'This page or ticket is unavailable.' },
  500: { title: 'Something went wrong', description: 'Try reloading the page. If it keeps happening, return to the service desk.' },
  503: { title: 'Service temporarily unavailable', description: 'Try again later. Preview data may also be unavailable when browser storage is disabled.' },
}

export type ErrorCode = keyof typeof errors

export function ErrorPage({ code, home = '/login' }: { code: ErrorCode; home?: string }) {
  const { title, description } = errors[code]
  return (
    <div className="mx-auto flex min-h-[55vh] w-full max-w-lg flex-col items-start justify-center gap-4 px-5 py-8">
      <RiErrorWarningLine className="size-8 text-primary" aria-hidden="true" />
      <span className="text-sm font-semibold text-muted-foreground">{code}</span>
      <PageHeading title={title} description={description} />
      <ActionLink href={code === 401 ? '/login' : home} className="mt-2"><RiArrowLeftLine /> {code === 401 ? 'Sign in' : 'Return to home'}</ActionLink>
    </div>
  )
}

export function PlannedPage({ title, description, back }: { title: string; description: string; back: string }) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-5 py-10 sm:px-8">
      <PageHeading title={title} description={description} />
      <Card><CardContent className="text-sm text-muted-foreground">This feature is planned for a later milestone.</CardContent></Card>
      <ActionLink href={back} variant="outline"><RiArrowLeftLine /> Back</ActionLink>
    </div>
  )
}
