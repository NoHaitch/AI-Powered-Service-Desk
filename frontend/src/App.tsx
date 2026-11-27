import { lazy, Suspense, type ReactNode } from 'react'

import { AppErrorBoundary } from '@/app/error-boundary'
import { TopLayout, WorkspaceLayout } from '@/app/layouts'
import { ErrorPage, InformationPage, PlannedPage, type ErrorCode } from '@/app/public-pages'
import { LoginPage } from '@/features/auth/login-page'
import { canEnter, homeFor, readPersona } from '@/features/auth/preview-personas'
import { services } from '@/features/catalog/catalog-model'
import { PortalHome } from '@/features/incidents/portal-home'
import { articles } from '@/features/knowledge/knowledge-articles'
import { Spinner } from '@/shared/components/ui/spinner'
import { canViewTicket, readTickets } from '@/features/tickets/ticket-preview'

const WorkspaceDashboard = lazy(() => import('@/features/incidents/workspace-dashboard')
  .then(({ WorkspaceDashboard }) => ({ default: WorkspaceDashboard })))
const IncidentForm = lazy(() => import('@/features/incidents/incident-form')
  .then(({ IncidentForm }) => ({ default: IncidentForm })))
const TicketDetail = lazy(() => import('@/features/tickets/ticket-detail')
  .then(({ TicketDetail }) => ({ default: TicketDetail })))
const TicketList = lazy(() => import('@/features/tickets/ticket-list')
  .then(({ TicketList }) => ({ default: TicketList })))
const ServiceCatalog = lazy(() => import('@/features/catalog/catalog-pages').then(({ ServiceCatalog }) => ({ default: ServiceCatalog })))
const RequestForm = lazy(() => import('@/features/catalog/catalog-pages').then(({ RequestForm }) => ({ default: RequestForm })))
const KnowledgeList = lazy(() => import('@/features/knowledge/knowledge-pages').then(({ KnowledgeList }) => ({ default: KnowledgeList })))
const KnowledgeArticle = lazy(() => import('@/features/knowledge/knowledge-pages').then(({ KnowledgeArticle }) => ({ default: KnowledgeArticle })))
const KnowledgeEditor = lazy(() => import('@/features/knowledge/knowledge-pages').then(({ KnowledgeEditor }) => ({ default: KnowledgeEditor })))
const ProfilePage = lazy(() => import('@/features/account/account-pages').then(({ ProfilePage }) => ({ default: ProfilePage })))
const NotificationsPage = lazy(() => import('@/features/account/account-pages').then(({ NotificationsPage }) => ({ default: NotificationsPage })))

const loadingPage = (
  <div className="grid min-h-48 flex-1 place-items-center px-5 py-8">
    <Spinner aria-label="Loading page" className="size-7 text-primary" />
  </div>
)

const plannedPortal = new Map([
  ['/portal/assistant', ['AI assistant', 'Grounded answers with sources will be introduced in the AI-powered MVP.']],
])
const plannedAdmin = new Map([
  ['/workspace/access', ['User & access management', 'Account and role administration will be introduced with the functional service desk.']],
  ['/workspace/settings', ['System settings', 'Operational settings will be introduced as their policies are implemented.']],
])
const errorRoutes = new Map<string, ErrorCode>([
  ['/error/401', 401], ['/error/403', 403], ['/error/404', 404], ['/error/500', 500], ['/error/503', 503],
])

function RoutedPage() {
  const requested = window.location.pathname.replace(/\/+$/, '') || '/'
  const path = requested === '/' ? '/login' : requested
  const persona = readPersona()
  const home = persona ? homeFor(persona.role) : '/login'
  const error = (code: ErrorCode) => <TopLayout path={path} persona={persona}><ErrorPage code={code} home={home} /></TopLayout>

  const status = errorRoutes.get(path)
  if (status) return error(status)
  if (path === '/login' || path === '/about' || path === '/help') {
    return <TopLayout path={path} persona={persona}>
      {path === '/login' ? <LoginPage /> : <InformationPage help={path === '/help'} />}
    </TopLayout>
  }

  const area = path.split('/')[1]
  if (area !== 'portal' && area !== 'workspace') return error(404)
  if (!persona) return error(401)
  if (!canEnter(persona.role, area)) return error(403)

  const tickets = readTickets()
  const visible = tickets.filter((ticket) => canViewTicket(ticket, persona))
  const ticketMatch = /^\/(?:portal|workspace)\/tickets\/([^/]+)$/.exec(path)
  const knowledgeMatch = /^\/(?:portal|workspace)\/knowledge\/([^/]+)$/.exec(path)
  const serviceMatch = /^\/portal\/requests\/new\/([^/]+)$/.exec(path)
  let page: ReactNode
  if (area === 'portal') {
    const planned = plannedPortal.get(path)
    if (path === '/portal') page = <PortalHome persona={persona} tickets={visible} />
    else if (path === '/portal/incidents/new') page = <IncidentForm persona={persona} />
    else if (path === '/portal/tickets') page = <TicketList tickets={visible} mode="employee" />
    else if (path === '/portal/catalog' || path === '/portal/requests/new') page = <ServiceCatalog />
    else if (path === '/portal/profile') page = <ProfilePage persona={persona} />
    else if (path === '/portal/notifications') page = <NotificationsPage persona={persona} tickets={visible} />
    else if (path === '/portal/knowledge') page = <KnowledgeList />
    else if (serviceMatch) {
      const service = services.find(({ id }) => id === serviceMatch[1])
      if (!service) return error(404)
      page = <RequestForm service={service} persona={persona} />
    } else if (knowledgeMatch) {
      const article = articles.find(({ id }) => id === knowledgeMatch[1])
      if (!article) return error(404)
      page = <KnowledgeArticle article={article} />
    }
    else if (planned) page = <PlannedPage title={planned[0]} description={planned[1]} back="/portal" />
    else if (ticketMatch) {
      const ticket = visible.find(({ id }) => id === ticketMatch[1])
      if (!ticket) return error(404)
      page = <TicketDetail ticket={ticket} persona={persona} />
    } else return error(404)

    return (
      <TopLayout path={path} persona={persona} employee>
        <Suspense fallback={loadingPage}>
          {path === '/portal' || planned || path === '/portal/incidents/new'
            ? page
            : <div className={`flex-1 ${path === '/portal/knowledge' || knowledgeMatch ? 'bg-card dark:bg-background' : 'bg-desk-surface'}`}>
              <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">{page}</div>
            </div>}
        </Suspense>
      </TopLayout>
    )
  }

  const planned = plannedAdmin.get(path)
  if (path === '/workspace') page = <WorkspaceDashboard tickets={persona.role === 'administrator' ? tickets : visible} persona={persona} />
  else if (path === '/workspace/profile') page = <ProfilePage persona={persona} />
  else if (path === '/workspace/notifications') page = <NotificationsPage persona={persona} tickets={visible} />
  else if (path === '/workspace/knowledge' || knowledgeMatch) {
    if (persona.role !== 'administrator') return error(403)
    if (!knowledgeMatch) page = <KnowledgeList manager={persona} />
    else {
      const article = articles.find(({ id }) => id === knowledgeMatch[1])
      if (!article) return error(404)
      page = <KnowledgeEditor article={article} persona={persona} />
    }
  }
  else if (planned) {
    if (persona.role !== 'administrator') return error(403)
    page = <PlannedPage title={planned[0]} description={planned[1]} back="/workspace" />
  } else if (path === '/workspace/queue' || path === '/workspace/tickets' || path === '/workspace/assignments' || ticketMatch) {
    if (!canEnter(persona.role, 'queue')) return error(403)
    if (ticketMatch) {
      const ticket = visible.find(({ id }) => id === ticketMatch[1])
      if (!ticket) return error(404)
      page = <TicketDetail ticket={ticket} persona={persona} />
    } else if (path === '/workspace/assignments') {
      page = <TicketList tickets={visible.filter(({ assigneeId, status }) => assigneeId === persona.id && status !== 'closed')} mode="assigned" />
    } else page = <TicketList tickets={visible} mode={path.endsWith('/queue') ? 'queue' : 'all'} />
  } else return error(404)

  return (
    <WorkspaceLayout path={path} persona={persona}>
      <Suspense fallback={loadingPage}>{page}</Suspense>
    </WorkspaceLayout>
  )
}

export default function App() {
  return <AppErrorBoundary><RoutedPage /></AppErrorBoundary>
}
