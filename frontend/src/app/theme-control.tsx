import { useEffect, useState } from 'react'
import { RiComputerLine, RiMoonLine, RiSunLine } from '@remixicon/react'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'

type Theme = 'light' | 'dark' | 'system'
const modes = [
  { value: 'light', label: 'Light', icon: RiSunLine },
  { value: 'dark', label: 'Dark', icon: RiMoonLine },
  { value: 'system', label: 'System', icon: RiComputerLine },
] as const

function readTheme(): Theme {
  try {
    const value = localStorage.getItem('service-desk.theme')
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

export function ThemeControl() {
  const [theme, setTheme] = useState(readTheme)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && preference.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    }
    apply()
    preference.addEventListener('change', apply)
    return () => preference.removeEventListener('change', apply)
  }, [theme])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Color theme" />}>
        {theme === 'dark' ? <RiMoonLine /> : theme === 'light' ? <RiSunLine /> : <RiComputerLine />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {modes.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem key={value} onClick={() => {
            setTheme(value)
            try { localStorage.setItem('service-desk.theme', value) } catch { /* Apply for this page. */ }
          }}>
            <Icon aria-hidden="true" /> {label}
            {theme === value && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
