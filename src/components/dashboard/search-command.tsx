
"use client"

import React from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useTranslation } from "@/hooks/use-translation"
import { useProducts } from "@/context/product-context"
import { Laptop, ChefHat, GlassWater, Table, Building2, Utensils, Boxes, Truck, Folder, Users2, BarChart3, Settings, LifeBuoy, BookOpen, GraduationCap, ShoppingCart, ShieldCheck, Wrench, History, Banknote } from 'lucide-react'

const allMenuItems = [
  { href: '/dashboard', labelKey: 'sidebar.dashboard', icon: Laptop },
  { href: '/dashboard/pos', labelKey: 'sidebar.pos', icon: Laptop },
  { href: '/dashboard/orders', labelKey: 'sidebar.orders', icon: ShoppingCart },
  { href: '/dashboard/kitchen', labelKey: 'sidebar.kitchen', icon: ChefHat },
  { href: '/dashboard/bar', labelKey: 'sidebar.bar', icon: GlassWater },
  { href: '/dashboard/tables', labelKey: 'sidebar.tables', icon: Table },
  { href: '/dashboard/floors', labelKey: 'sidebar.floorPlan', icon: Building2 },
  { href: '/dashboard/accounting', labelKey: 'sidebar.accounting', icon: Banknote },
  { href: '/dashboard/meals', labelKey: 'sidebar.meals', icon: Utensils },
  { href: '/dashboard/inventory', labelKey: 'sidebar.inventory', icon: Boxes },
  { href: '/dashboard/suppliers', labelKey: 'sidebar.suppliers', icon: Truck },
  { href: '/dashboard/categories', labelKey: 'sidebar.categories', icon: Folder },
  { href: '/dashboard/staff', labelKey: 'sidebar.staff', icon: Users2 },
  { href: '/dashboard/reports', labelKey: 'sidebar.reports', icon: BarChart3 },
  { href: '/dashboard/configuration', labelKey: 'sidebar.configuration', icon: Wrench },
  { href: '/dashboard/backup', labelKey: 'sidebar.backup', icon: ShieldCheck },
  { href: '/dashboard/settings', labelKey: 'sidebar.settings', icon: Settings },
  { href: '/dashboard/knowledge-base', labelKey: 'sidebar.knowledgeBase', icon: BookOpen },
  { href: '/dashboard/support', labelKey: 'sidebar.support', icon: LifeBuoy },
  { href: '/dashboard/credits', labelKey: 'sidebar.credits', icon: GraduationCap },
]

export function SearchCommandDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const { t } = useTranslation()
  const { meals } = useProducts()

  const runCommand = React.useCallback((command: () => unknown) => {
    onOpenChange(false)
    command()
  }, [onOpenChange])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t('search.searchPlaceholder')} />
      <CommandList>
        <CommandEmpty>{t('search.noResults')}</CommandEmpty>
        
        <CommandGroup heading={t('search.pages')}>
          {allMenuItems.map(({ href, labelKey, icon: Icon }) => (
            <CommandItem
              key={href}
              value={t(labelKey)}
              onSelect={() => runCommand(() => router.push(href))}
            >
              <Icon className="mr-2 h-4 w-4" />
              <span>{t(labelKey)}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading={t('search.products')}>
          {meals.map((meal) => (
            <CommandItem
              key={meal.id}
              value={meal.name}
              onSelect={() => runCommand(() => router.push('/dashboard/meals'))}
            >
              <Utensils className="mr-2 h-4 w-4" />
              <span>{meal.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
