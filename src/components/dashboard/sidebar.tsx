
"use client"

import Link from 'next/link'
import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Users2,
  Boxes,
  Folder,
  Laptop,
  BarChart3,
  Settings,
  LifeBuoy,
  Truck,
  GraduationCap,
  BookOpen,
  ShoppingCart,
  ShieldCheck,
  Wrench,
  History,
  Banknote,
  ChevronDown,
  ChevronRight,
  Package,
  Wallet,
  Receipt
} from 'lucide-react'
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useTranslation } from '@/hooks/use-translation'
import { useSettings } from '@/context/settings-context'
import Image from 'next/image'
import { Skeleton } from '@/components/ui/skeleton'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'



const allMenuItems = [
  { href: '/dashboard', labelKey: 'sidebar.dashboard', icon: LayoutDashboard, roles: ["Manager", "Super Admin", "Accountant"] },
  { href: '/dashboard/pos', labelKey: 'sidebar.pos', icon: Laptop, roles: ["Cashier", "Manager", "Super Admin"] },
  { href: '/dashboard/orders', labelKey: 'sidebar.orders', icon: ShoppingCart, roles: ["Cashier", "Manager", "Super Admin", "Accountant"] },
  {
    labelKey: 'sidebar.accounting', icon: Banknote, roles: ["Manager", "Super Admin", "Accountant"],
    subItems: [
      { href: '/dashboard/accounting', labelKey: 'sidebar.accountingDashboard', icon: LayoutDashboard },
      { href: '/dashboard/accounting/journals', labelKey: 'sidebar.journals', icon: BookOpen },
      { href: '/dashboard/accounting/expenses', labelKey: 'sidebar.expenses', icon: Receipt },
      { href: '/dashboard/payroll', labelKey: 'sidebar.payroll', icon: Wallet },
      { href: '/dashboard/accounting/reports', labelKey: 'sidebar.financialReports', icon: BarChart3 },
    ]
  },
  {
    labelKey: 'sidebar.inventory', icon: Boxes, roles: ["Manager", "Super Admin"],
    subItems: [
      { href: '/dashboard/inventory', labelKey: 'sidebar.inventoryDashboard', icon: LayoutDashboard },
      { href: '/dashboard/inventory/items', labelKey: 'sidebar.inventoryItems', icon: Package },
      { href: '/dashboard/inventory/suppliers', labelKey: 'sidebar.inventorySuppliers', icon: Truck },
    ]
  },
  { href: '/dashboard/categories', labelKey: 'sidebar.categories', icon: Folder, roles: ["Manager", "Super Admin"] },
  { href: '/dashboard/staff', labelKey: 'sidebar.staff', icon: Users2, roles: ["Manager", "Super Admin"] },
  { href: '/dashboard/reports', labelKey: 'sidebar.reports', icon: BarChart3, roles: ["Manager", "Super Admin", "Accountant"] },
  { href: '/dashboard/activity', labelKey: 'sidebar.activity', icon: History, roles: ["Manager", "Super Admin", "Accountant"] },
  { href: '/dashboard/backup', labelKey: 'sidebar.backup', icon: ShieldCheck, roles: ["Super Admin"] },
  { href: '/dashboard/configuration', labelKey: 'sidebar.configuration', icon: Wrench, roles: ["Super Admin"] },
]

type AppSidebarProps = {
  onLinkClick: () => void;
}

export function AppSidebar({ onLinkClick }: AppSidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const { t } = useTranslation()
  const { settings } = useSettings()
  const { state: sidebarState, isMobile, setOpen } = useSidebar() // Use the sidebar state
  const [isClient, setIsClient] = useState(false)
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    'sidebar.accounting': pathname.startsWith('/dashboard/accounting'),
    'sidebar.inventory': pathname.startsWith('/dashboard/inventory')
  });

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    setOpenMenus(prev => ({
      ...prev,
      'sidebar.accounting': pathname.startsWith('/dashboard/accounting'),
      'sidebar.inventory': pathname.startsWith('/dashboard/inventory')
    }))
  }, [pathname]);

  // Close all dropdowns when sidebar collapses
  useEffect(() => {
    if (sidebarState === 'collapsed' && !isMobile) {
      setOpenMenus({
        'sidebar.accounting': false,
        'sidebar.inventory': false
      })
    }
  }, [sidebarState, isMobile])

  const toggleMenu = (labelKey: string) => {
    if (sidebarState === 'collapsed' && !isMobile) {
      setOpen(true)
      // Small delay to allow expansion animation before opening menu
      setTimeout(() => {
        // Close all other menus and toggle the clicked one
        setOpenMenus({
          'sidebar.accounting': labelKey === 'sidebar.accounting',
          'sidebar.inventory': labelKey === 'sidebar.inventory'
        })
      }, 150)
    } else {
      // Close all other menus and toggle the clicked one
      setOpenMenus(prev => ({
        'sidebar.accounting': labelKey === 'sidebar.accounting' ? !prev['sidebar.accounting'] : false,
        'sidebar.inventory': labelKey === 'sidebar.inventory' ? !prev['sidebar.inventory'] : false
      }))
    }
  }

  const handleItemClick = () => {
    if (sidebarState === 'collapsed' && !isMobile) {
      setOpen(true)
    }
    onLinkClick && onLinkClick()
  }


  const menuItems = allMenuItems.filter(item => {
    if (!user) return false
    if (item.roles.includes(user.role)) return true
    return false
  });

  return (
    <>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2 px-2 py-3" onClick={onLinkClick}>
          {isClient ? (
            <>
              {settings.platformLogo ? (
                sidebarState === 'collapsed' ? (
                  // Collapsed: Show only icon
                  <div className="w-full flex justify-center">
                    <Image
                      src={settings.platformLogo}
                      alt="Logo"
                      width={37}
                      height={37}
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                ) : (
                  // Expanded: Show icon + name
                  <>
                    <Image
                      src={settings.platformLogo}
                      alt="Logo"
                      width={32}
                      height={32}
                      className="object-contain shrink-0"
                      unoptimized
                    />
                    <div>
                      <h2 className="text-lg font-bold font-headline">{settings.platformName || 'TEMEH'}</h2>
                    </div>
                  </>
                )
              ) : (
                sidebarState === 'collapsed' ? (
                  // Collapsed: Show only icon placeholder
                  <div className="w-full flex justify-center">
                    <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold">
                      {(settings.platformName || 'TEMEH').charAt(0)}
                    </div>
                  </div>
                ) : (
                  // Expanded: Show icon + name
                  <>
                    <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
                      {(settings.platformName || 'TEMEH').charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold font-headline">{settings.platformName || 'TEMEH'}</h2>
                    </div>
                  </>
                )
              )}
            </>
          ) : (
            <Skeleton className="h-8 w-full" />
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            item.subItems ? (
              <Collapsible key={item.labelKey} open={openMenus[item.labelKey]} onOpenChange={() => toggleMenu(item.labelKey)}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={pathname.startsWith('/dashboard/accounting') || pathname.startsWith('/dashboard/inventory')}
                      tooltip={t(item.labelKey)}
                      className="w-full justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <item.icon />
                        {(sidebarState === 'expanded' || isMobile) && <span>{t(item.labelKey)}</span>}
                      </div>
                      {(sidebarState === 'expanded' || isMobile) && (openMenus[item.labelKey] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                </SidebarMenuItem>
                <CollapsibleContent className="space-y-1 ml-6 border-l-2 border-muted-foreground/20 pl-2 mt-1">
                  {item.subItems.map(subItem => (
                    <SidebarMenuItem key={subItem.href} onClick={handleItemClick}>
                      <Link href={subItem.href} className="w-full">
                        <SidebarMenuButton
                          isActive={pathname === subItem.href}
                          tooltip={t(subItem.labelKey)}
                        >
                          <subItem.icon />
                          {(sidebarState === 'expanded' || isMobile) && <span>{t(subItem.labelKey)}</span>}
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <SidebarMenuItem key={item.href} onClick={handleItemClick}>
                <Link href={item.href!} className="w-full">
                  <SidebarMenuButton
                    isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href!))}
                    tooltip={t(item.labelKey)}
                  >
                    <item.icon />
                    {(sidebarState === 'expanded' || isMobile) && <span>{t(item.labelKey)}</span>}
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            )
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem onClick={handleItemClick}>
            <Link href="/dashboard/knowledge-base" className="w-full">
              <SidebarMenuButton isActive={pathname.startsWith('/dashboard/knowledge-base')} tooltip={t('sidebar.knowledgeBase')}>
                <BookOpen />
                {(sidebarState === 'expanded' || isMobile) && <span>{t('sidebar.knowledgeBase')}</span>}
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem onClick={handleItemClick}>
            <Link href="/dashboard/support" className="w-full">
              <SidebarMenuButton isActive={pathname.startsWith('/dashboard/support')} tooltip={t('sidebar.support')}>
                <LifeBuoy />
                {(sidebarState === 'expanded' || isMobile) && <span>{t('sidebar.support')}</span>}
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarSeparator />
          <SidebarMenuItem onClick={handleItemClick}>
            <Link href="/dashboard/settings" className="w-full">
              <SidebarMenuButton isActive={pathname.startsWith('/dashboard/settings')} tooltip={t('sidebar.settings')}>
                <Settings />
                {(sidebarState === 'expanded' || isMobile) && <span>{t('sidebar.settings')}</span>}
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  )
}
