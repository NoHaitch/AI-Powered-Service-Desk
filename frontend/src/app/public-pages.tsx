import { RiArrowLeftLine, RiErrorWarningLine, RiQuestionLine } from '@remixicon/react'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/components/ui/accordion'
import { Card, CardContent } from '@/shared/components/ui/card'
import { ActionLink, PageHeading } from './ui'

const faqs = [
  ['How do I report an IT issue?', 'Enter as an employee, choose Report an incident, and describe the affected service, impact, and when the issue started.'],
  ['What happens after I submit an incident?', 'It appears as New in My Tickets. An L1 agent reviews impact and urgency. Priority remains pending until triage is complete.'],
  ['What does Request prompt review do?', 'It adds a visible flag that L1 can filter by. It does not set priority or change normal queue order.'],
  ['Are preview changes sent to the service desk?', 'No. This preview uses synthetic accounts and data stored in the current browser tab.'],
] as const

export function InformationPage({ help = false }: { help?: boolean }) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-5 py-10 sm:px-8">
      {help ? (
        <>
          <PageHeading title="Help & FAQ" description="Answers about reporting and tracking incidents in the preview." />
          <Card><CardContent>
            <Accordion>
              {faqs.map(([question, answer]) => (
                <AccordionItem key={question} value={question}>
                  <AccordionTrigger>{question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent></Card>
        </>
      ) : (
        <>
          <PageHeading title="About Service Desk" description="A local-first IT support application for employees and service desk teams." />
          <Card><CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>Employees report disruptions and follow their tickets in one place. Support teams review incoming incidents and assess impact and urgency in a shared L1 queue.</p>
            <p>The current release is a frontend preview. Service requests, knowledge articles, and AI-assisted troubleshooting are planned for later milestones.</p>
          </CardContent></Card>
        </>
      )}
      <ActionLink href="/help" variant="outline" className={help ? 'hidden' : ''}><RiQuestionLine /> Read the FAQ</ActionLink>
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
