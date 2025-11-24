'use client'

import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { Button } from './button'
import { useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)

  const themes = [
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'dark', label: 'Escuro', icon: Moon },
    { value: 'system', label: 'Sistema', icon: Monitor }
  ] as const

  const currentTheme = themes.find(t => t.value === theme) || themes[0]
  const CurrentIcon = currentTheme.icon

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        title="Alterar tema"
      >
        <CurrentIcon className="h-5 w-5" />
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-40 rounded-lg border bg-background shadow-lg z-50">
            <div className="p-2">
              {themes.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => {
                    setTheme(value)
                    setOpen(false)
                  }}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md
                    transition-colors
                    ${theme === value
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
