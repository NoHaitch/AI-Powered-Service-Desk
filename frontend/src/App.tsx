import { lazy, Suspense, useEffect, useState } from 'react'

import { AppErrorBoundary } from '@/app/error-boundary'
import { TopLayout, WorkspaceLayout } from '@/app/layouts'
import { ErrorPage, InformationPage, PlannedPage, type ErrorCode } from '@/app/public-pages'
import { ActionLink, PageHeading } from '@/app/ui'
import { LiveProfile } from '@/features/account/live-profile'
import { homeForIdentity, restoreSession, subscribeAuthChanges, type Identity } from '@/features/auth/client'
import { LoginPage } from '@/features/auth/login-page'
import { IncidentForm } from '@/features/incidents/incident-form'
import { LiveIncident, LiveIncidents } from '@/features/incidents/live-incidents'
import { articles } from '@/features/knowledge/knowledge-articles'
import { Spinner } from '@/shared/components/ui/spinner'

const ServiceCatalog = lazy(() => import('@/features/catalog/catalog-pages').then(({ ServiceCatalog }) => ({ default: ServiceCatalog })))
const KnowledgeList = lazy(() => import('@/features/knowledge/knowledge-pages').then(({ KnowledgeList }) => ({ default: KnowledgeList })))
const KnowledgeArticle = lazy(() => import('@/features/knowledge/knowledge-pages').then(({ KnowledgeArticle }) => ({ default: KnowledgeArticle })))

const loadingPage = (
  <div className="grid min-h-48 flex-1 place-items-center px-5 py-8">
    <Spinner aria-label="Loading page" className="size-7 text-primary" />
  </div>
)

const plannedFeatures = new Map([
  ['/portal/requests/new', 'Service requests'],
  ['/portal/assistant', 'AI assistant'],
  ['/portal/notifications', 'Notifications'],
  ['/workspace/access', 'User & access management'],
  ['/workspace/knowledge', 'Knowledge management'],
  ['/workspace/settings', 'System settings'],
  ['/workspace/assignments', 'Assignments'],
  ['/workspace/notifications', 'Notifications'],
])
const errorRoutes = new Map<string, ErrorCode>([
  ['/error/401', 401], ['/error/403', 403], ['/error/404', 404], ['/error/500', 500], ['/error/503', 503],
])

type Session = { state: 'loading' | 'unavailable' | 'ready'; identity?: Identity }

function useSession() {
  const [session, setSession] = useState<Session>({ state: 'loading' })
  useEffect(() => {
    let active = true
    let sequence = 0
    function load() {
      const current = ++sequence
      void restoreSession().then(
        (identity) => { if (active && current === sequence) setSession({ state: 'ready', identity: identity ?? undefined }) },
        () => { if (active && current === sequence) setSession({ state: 'unavailable' }) },
      )
    }
    load()
    const unsubscribe = subscribeAuthChanges(() => {
      setSession({ state: 'loading' })
      load()
    })
    return () => { active = false; unsubscribe() }
  }, [])
  return session
}

function RoutedPage() {
  const requested = window.location.pathname.replace(/\/+$/, '') || '/'
  const path = requested === '/' ? '/login' : requested
  const session = useSession()
  const identity = session.identity
  const home = identity ? homeForIdentity(identity) : '/login'
  const error = (code: ErrorCode) => <TopLayout path={path} identity={identity}><ErrorPage code={code} home={home} /></TopLayout>

  const status = errorRoutes.get(path)
  if (status) return error(status)
  if (path === '/about' || path === '/help') {
    return <TopLayout path={path} identity={identity}><InformationPage help={path === '/help'} /></TopLayout>
  }
  if (path === '/login') {
    return <TopLayout path={path} identity={identity}>
      {session.state === 'loading' ? loadingPage : identity ? (
        <div className="mx-auto w-full max-w-xl space-y-4 px-5 py-10">
          <PageHeading title="You are signed in" description={identity.display_name} />
          <ActionLink href={home}>Continue to Service Desk</ActionLink>
        </div>
      ) : <LoginPage />}
    </TopLayout>
  }

  const area = path.split('/')[1]
  if (area !== 'portal' && area !== 'workspace') return error(404)
  if (session.state === 'loading') return <TopLayout path={path}>{loadingPage}</TopLayout>
  if (session.state === 'unavailable') return error(503)
  if (!identity) return error(401)

  const employee = identity.roles.includes('employee')
  const agent = identity.roles.includes('agent')
  const admin = identity.roles.includes('administrator')
  if (area === 'portal' ? !employee : !(agent || admin)) return error(403)

  const ticket = /^\/(?:portal|workspace)\/tickets\/([\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})$/i.exec(path)
  const knowledge = /^\/portal\/knowledge\/([^/]+)$/.exec(path)
  const service = /^\/portal\/requests\/new\/[^/]+$/.test(path)
  const planned = plannedFeatures.get(path) ?? (service ? 'Service requests' : undefined)
  let page
  if (area === 'portal') {
    if (path === '/portal') {
      page = <div className="brand-hero space-y-5 rounded-4xl border border-border p-8 sm:p-12">
        <PageHeading title={`Welcome, ${identity.display_name}`} description="Report workplace IT disruptions and track their progress." />
        <div className="flex flex-wrap gap-2">
          <ActionLink href="/portal/incidents/new">Report an incident</ActionLink>
          <ActionLink href="/portal/tickets" variant="outline">My Tickets</ActionLink>
        </div>
      </div>
    } else if (path === '/portal/incidents/new') page = <IncidentForm actor={identity.id} />
    else if (path === '/portal/tickets') page = <LiveIncidents actor={identity.id} />
    else if (ticket) page = <LiveIncident id={ticket[1]} actor={identity.id} staff={false} />
    else if (path === '/portal/profile') page = <LiveProfile identity={identity} />
    else if (path === '/portal/catalog') page = <ServiceCatalog />
    else if (path === '/portal/knowledge') page = <KnowledgeList />
    else if (knowledge) {
      const article = articles.find(({ id }) => id === knowledge[1])
      if (!article) return error(404)
      page = <KnowledgeArticle article={article} />
    } else if (planned) page = <PlannedPage title={planned} description="This workflow is currently unavailable." back="/portal" />
    else return error(404)

    return <TopLayout path={path} identity={identity} employee>
      <Suspense fallback={loadingPage}>
        <div className={`flex-1 ${knowledge || path === '/portal/knowledge' ? 'bg-card dark:bg-background' : 'bg-desk-surface'}`}>
          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">{page}</div>
        </div>
      </Suspense>
    </TopLayout>
  }

  if (path === '/workspace') {
    page = <div className="brand-hero space-y-5 rounded-4xl border border-border p-8 sm:p-12">
      <PageHeading title={`Welcome, ${identity.display_name}`}
        description={agent ? 'Review new reports from the L1 intake queue.' : 'Review your administrator profile.'} />
      <ActionLink href={agent ? '/workspace/queue' : '/workspace/profile'}>{agent ? 'Open intake queue' : 'Open profile'}</ActionLink>
    </div>
  } else if (path === '/workspace/profile') page = <LiveProfile identity={identity} />
  else if (path === '/workspace/queue' || path === '/workspace/tickets' || ticket) {
    if (!agent) return error(403)
    page = ticket ? <LiveIncident id={ticket[1]} actor={identity.id} staff /> : <LiveIncidents actor={identity.id} staff />
  } else if (planned) {
    if (['/workspace/access', '/workspace/settings', '/workspace/knowledge'].includes(path) && !admin) return error(403)
    page = <PlannedPage title={planned} description="This workflow is currently unavailable." back="/workspace" />
  } else return error(404)

  return <WorkspaceLayout path={path} identity={identity}><Suspense fallback={loadingPage}>{page}</Suspense></WorkspaceLayout>
}

export default function App() {
  return <AppErrorBoundary><RoutedPage /></AppErrorBoundary>
}
