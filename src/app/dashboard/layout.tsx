
"use client"

import React from 'react'
import { SidebarProvider, Sidebar, SidebarInset, useSidebar } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/sidebar"
import { OrderProvider } from '@/context/order-context'
import { ProductProvider } from '@/context/product-context'
import { StaffProvider } from '@/context/staff-context'
import { TicketProvider } from '@/context/ticket-context'
import { NotificationProvider, useNotifications } from '@/context/notification-context'
import { ActivityLogProvider } from '@/context/activity-log-context'
import { CategoryProvider } from '@/context/category-context'
import { InventoryProvider } from '@/context/inventory-context'
import { OnboardingProvider } from '@/context/onboarding-context'
import { useOutsideClick } from '@/hooks/use-outside-click'
import { useIsMobile } from '@/hooks/use-mobile'
import { BackupSchedulerProvider } from '@/context/backup-scheduler-context'
import { FullscreenToggle } from '@/components/fullscreen-toggle'

function DashboardContent({ children }: { children: React.ReactNode }) {
    const { isMobile, setOpenMobile } = useSidebar();

    const handleLinkClick = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    }

    return (
        <>
            <Sidebar collapsible="icon">
                <AppSidebar onLinkClick={handleLinkClick} />
            </Sidebar>
            <SidebarInset>
                {children}
            </SidebarInset>
            <FullscreenToggle />
        </>
    )
}


export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [open, setOpen] = React.useState(false)
    const isMobile = useIsMobile();

    return (
        <StaffProvider>
            <ActivityLogProvider>
                <NotificationProvider>
                    <ProductProvider>
                        <CategoryProvider>
                            <InventoryProvider>
                                <OrderProvider>
                                    <TicketProvider>
                                        <OnboardingProvider>
                                            <BackupSchedulerProvider>
                                                <SidebarProvider defaultOpen={isMobile ? false : true} open={open} onOpenChange={setOpen}>
                                                    <DashboardContent>
                                                        {children}
                                                    </DashboardContent>
                                                </SidebarProvider>
                                            </BackupSchedulerProvider>
                                        </OnboardingProvider>
                                    </TicketProvider>
                                </OrderProvider>
                            </InventoryProvider>
                        </CategoryProvider>
                    </ProductProvider>
                </NotificationProvider>
            </ActivityLogProvider>
        </StaffProvider>
    )
}
