import type { ReactNode } from 'react'
import {
  RiBookOpenLine, RiDashboardLine, RiFileList3Line, RiInbox2Line, RiMenuLine, RiNotification3Line, RiQuestionLine, RiUserLine,
  RiSettings3Line, RiUserSettingsLine,
} from '@remixicon/react'

import { homeFor, leavePreview, roleLabels, type Persona } from '@/features/auth/preview-personas'
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/shared/components/ui/sheet'
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInset,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from '@/shared/components/ui/sidebar'
import { ThemeControl } from './theme-control'
import { ActionLink, Brand, Footer } from './ui'

const publicLinks = [{ href: '/about', label: 'About' }, { href: '/help', label: 'Help' }]
const employeeLinks = [
  { href: '/portal', label: 'Home' }, { href: '/portal/tickets', label: 'My Tickets' },
  { href: '/portal/catalog', label: 'Service catalog' }, { href: '/portal/knowledge', label: 'Knowledge Base' },
]

function Account({ persona }: { persona?: Persona }) {
  if (!persona) return <ActionLink variant="outline" href="/login">Sign in</ActionLink>
  const base = homeFor(persona.role)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" aria-label="Account menu" />}>
        <Avatar className="size-7"><AvatarFallback className="bg-accent text-[10px] text-accent-foreground">{persona.initials}</AvatarFallback></Avatar>
        <span className="hidden text-sm sm:inline">{persona.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-45">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{roleLabels[persona.role]}</DropdownMenuLabel>
          <DropdownMenuItem render={<a href={`${base}/profile`} />}>Profile & preferences</DropdownMenuItem>
          <DropdownMenuItem render={<a href={`${base}/notifications`} />}><RiNotification3Line /> Notifications</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<a href="/login" />}>Switch preview role</DropdownMenuItem>
          <DropdownMenuItem onClick={leavePreview}>Sign out</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function PreviewNotice() {
  return (
    <div className="border-b border-border bg-muted px-5 py-2 text-center text-xs font-medium text-muted-foreground dark:bg-secondary dark:text-secondary-foreground">
      Local preview · Synthetic data · Changes stay in this tab
    </div>
  )
}

export function TopLayout({
  persona, employee = false, path, children,
}: { persona?: Persona; employee?: boolean; path: string; children: ReactNode }) {
  const links = employee ? employeeLinks : publicLinks
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-5 sm:px-8 lg:gap-8">
          <a href={persona ? homeFor(persona.role) : '/login'} aria-label="Service Desk home"><Brand /></a>
          <nav aria-label="Main navigation" className="hidden items-center gap-5 md:flex">
            {links.map((link) => (
              <a key={link.href} href={link.href} aria-current={path === link.href ? 'page' : undefined}
                className="text-sm font-medium text-muted-foreground hover:text-foreground aria-[current=page]:text-primary">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <ThemeControl />
            {(!persona && path === '/login') ? null : <Account persona={persona} />}
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Open navigation" />}>
                  <RiMenuLine />
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader><SheetTitle>Navigation</SheetTitle></SheetHeader>
                  <nav aria-label="Mobile navigation" className="grid gap-2 px-5 pb-5">
                    {links.map((link) => (
                      <ActionLink variant="ghost" className="justify-start" key={link.href} href={link.href}>
                        {link.label}
                      </ActionLink>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>
      {employee && <PreviewNotice />}
      <main id="main" className="flex flex-1 flex-col">{children}</main>
      <Footer />
    </div>
  )
}

const workspaceLinks = [
  { href: '/workspace', label: 'Overview', icon: RiDashboardLine },
  { href: '/workspace/queue', label: 'L1 intake queue', icon: RiInbox2Line },
  { href: '/workspace/tickets', label: 'All tickets', icon: RiFileList3Line },
  { href: '/workspace/assignments', label: 'My assignments', icon: RiUserLine },
]
const adminLinks = [
  { href: '/workspace', label: 'Overview', icon: RiDashboardLine },
  { href: '/workspace/knowledge', label: 'Manage knowledge', icon: RiBookOpenLine },
  { href: '/workspace/access', label: 'User & access management', icon: RiUserSettingsLine },
  { href: '/workspace/settings', label: 'System settings', icon: RiSettings3Line },
]

export function WorkspaceLayout({ persona, path, children }: { persona: Persona; path: string; children: ReactNode }) {
  const links = persona.role === 'administrator' ? adminLinks : workspaceLinks
  return (
    <SidebarProvider className="bg-background">
      <a href="#main" className="skip-link">Skip to content</a>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
          <a href="/workspace" className="group-data-[collapsible=icon]:hidden"><Brand /></a>
          <a href="/workspace" className="hidden group-data-[collapsible=icon]:inline-flex" aria-label="Service Desk overview"><Brand short /></a>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{persona.role === 'administrator' ? 'Administration' : 'Support workspace'}</SidebarGroupLabel>
            <SidebarMenu>
              {links.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton tooltip={label} isActive={path === href} aria-label={label}
                    render={<a href={href} aria-current={path === href ? 'page' : undefined} />}>
                    <Icon aria-hidden="true" /><span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset id="main" className="min-w-0 bg-desk-surface">
        <header className="flex h-16 items-center gap-3 border-b border-border bg-background px-4 sm:px-7">
          <SidebarTrigger />
          <span className="h-5 border-l border-border" />
          <span className="text-sm font-semibold">Management workspace</span>
          <div className="ml-auto flex items-center gap-1">
            <ActionLink href="/help" variant="ghost" aria-label="Help" className="hidden sm:inline-flex"><RiQuestionLine /></ActionLink>
            <ThemeControl />
            <Account persona={persona} />
          </div>
        </header>
        <PreviewNotice />
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
          {children}
        </div>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}
