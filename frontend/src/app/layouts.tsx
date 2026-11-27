import { useState, type ReactNode } from 'react'
import {
  RiDashboardLine, RiInbox2Line, RiMenuLine, RiQuestionLine, RiUserLine,
} from '@remixicon/react'

import { errorMessage, homeForIdentity, roleLabels, signOut, type Identity } from '@/features/auth/client'
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

function Account({ identity }: { identity?: Identity }) {
  const [failure, setFailure] = useState('')
  const [busy, setBusy] = useState(false)
  if (!identity) return <ActionLink variant="outline" href="/login">Sign in</ActionLink>
  const base = homeForIdentity(identity)
  const initials = identity.display_name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('')

  async function logout() {
    if (busy) return
    setBusy(true)
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
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" aria-label="Account menu" />}>
        <Avatar className="size-7"><AvatarFallback className="bg-accent text-[10px] text-accent-foreground">{initials}</AvatarFallback></Avatar>
        <span className="hidden text-sm sm:inline">{identity.display_name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-45">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{identity.roles.map((role) => roleLabels[role]).join(', ') || 'Account'}</DropdownMenuLabel>
          <DropdownMenuItem render={<a href={`${base}/profile`} />}>Profile & preferences</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={busy} onClick={(event) => { event.preventBaseUIHandler(); void logout() }}>Sign out</DropdownMenuItem>
          {failure && <p role="alert" className="max-w-64 px-2 py-1 text-sm text-destructive">{failure}</p>}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function TopLayout({
  identity, employee = false, path, children,
}: { identity?: Identity; employee?: boolean; path: string; children: ReactNode }) {
  const links = employee ? employeeLinks : publicLinks
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-5 sm:px-8 lg:gap-8">
          <a href={identity ? homeForIdentity(identity) : '/login'} aria-label="Service Desk home"><Brand /></a>
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
            {(!identity && path === '/login') ? null : <Account identity={identity} />}
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
      <main id="main" className="flex flex-1 flex-col">{children}</main>
      <Footer />
    </div>
  )
}

const workspaceLinks = [
  { href: '/workspace', label: 'Overview', icon: RiDashboardLine },
  { href: '/workspace/queue', label: 'L1 intake queue', icon: RiInbox2Line },
  { href: '/workspace/profile', label: 'Profile & preferences', icon: RiUserLine },
]

export function WorkspaceLayout({ identity, path, children }: { identity: Identity; path: string; children: ReactNode }) {
  const agent = identity.roles.includes('agent')
  const links = workspaceLinks.filter(({ href }) => agent || href !== '/workspace/queue')
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
            <SidebarGroupLabel>{agent ? 'Support workspace' : 'Administration'}</SidebarGroupLabel>
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
            <Account identity={identity} />
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
          {children}
        </div>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}
