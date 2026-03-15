'use client'

import React from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '../ui/sidebar'
import { UserNav } from './user-nav'
import { LanguageSwitcher } from '../language-switcher'
import { ModeToggle } from '../mode-toggle'
import { SearchCommandDialog } from './search-command'
import { NotificationsPanel } from './notifications-panel'
import { useTranslation } from '@/hooks/use-translation'

type HeaderProps = {
  title: string
  children?: React.ReactNode
}

export function Header({ title, children }: HeaderProps) {
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return (
    <header className="sticky top-0 z-50 flex h-auto items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 py-3 sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <SidebarTrigger className="h-9 w-auto px-3 gap-2" />
      <div className="relative ml-auto flex-1 md:grow-0" suppressHydrationWarning>
        <h1 className="text-xl md:text-2xl font-semibold font-headline whitespace-nowrap">{title}</h1>
      </div>
      {children && (
        <div className="flex items-center gap-2" suppressHydrationWarning>
          {children}
        </div>
      )}
      <div className="relative ml-auto flex-1 md:grow-0" suppressHydrationWarning>
        <Button
          variant="outline"
          className="w-full justify-start text-sm text-muted-foreground md:w-[200px] lg:w-[336px]"
          onClick={() => setOpen(true)}
        >
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <span className="pl-6">{t('header.searchPlaceholder')}</span>
          <kbd className="pointer-events-none absolute right-2 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-xs font-medium opacity-100 md:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </div>
      <SearchCommandDialog open={open} onOpenChange={setOpen} />
      <NotificationsPanel />
      <ModeToggle />
      <LanguageSwitcher />
      <UserNav />
    </header>
  )
}
