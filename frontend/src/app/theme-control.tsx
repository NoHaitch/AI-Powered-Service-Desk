import { createContext, useContext, useLayoutEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { RiMoonLine, RiSunLine } from '@remixicon/react'

import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'

type Theme = 'light' | 'dark'

const themeKey = 'service-desk.theme'
const darkPreference = '(prefers-color-scheme: dark)'
const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void } | null>(null)

function readTheme(): Theme | null {
  try {
    const value = localStorage.getItem(themeKey)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function subscribeToSystemTheme(onChange: () => void) {
  const preference = window.matchMedia(darkPreference)
  preference.addEventListener('change', onChange)
  return () => preference.removeEventListener('change', onChange)
}

function systemTheme(): Theme {
  return window.matchMedia(darkPreference).matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState(readTheme)
  const preferred = useSyncExternalStore(subscribeToSystemTheme, systemTheme)
  const theme = override ?? preferred

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
  }, [theme])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setOverride(next)
    try {
      localStorage.setItem(themeKey, next)
    } catch {
      // Keep the choice in memory when browser storage is unavailable.
    }
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function ThemeControl() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('ThemeControl requires ThemeProvider.')

  const { theme, toggleTheme } = context
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  const Icon = theme === 'dark' ? RiSunLine : RiMoonLine

  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label={label} onClick={toggleTheme} />}>
        <Icon aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}
