"use client"

import React from "react"
import { useNotifications } from "@/context/notification-context"
import { formatDistanceToNow } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { useTranslation } from "@/hooks/use-translation"
import { useLanguage } from "@/context/language-context"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Info, Bell, CheckCheck, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

import { Header } from '@/components/dashboard/header'

export default function NotificationsPage() {
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications()
    const { t } = useTranslation()
    const { language } = useLanguage()
    const dateLocale = language === 'fr' ? fr : enUS

    return (
        <div className="flex min-h-screen w-full flex-col">
            <Header title={t('notifications.title') || 'Notifications'} />
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight font-headline">{t('notifications.title') || 'Notifications'}</h2>
                        <p className="text-muted-foreground">
                            {t('notifications.description') || 'View and manage all your notifications'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <Badge variant="destructive">{unreadCount} {t('notifications.unread') || 'unread'}</Badge>
                        )}
                        {unreadCount > 0 && (
                            <Button variant="outline" size="sm" onClick={markAllAsRead}>
                                <CheckCheck className="h-4 w-4 mr-2" />
                                {t('header.markAllAsRead') || 'Mark all as read'}
                            </Button>
                        )}
                        {notifications.length > 0 && (
                            <Button variant="outline" size="sm" onClick={clearNotifications}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('notifications.clearAll') || 'Clear all'}
                            </Button>
                        )}
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('notifications.allNotifications') || 'All Notifications'}</CardTitle>
                        <CardDescription>
                            {notifications.length === 0
                                ? (t('notifications.noNotifications') || 'You have no notifications')
                                : `${notifications.length} ${t('notifications.total') || 'total notifications'}`
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {notifications.length > 0 ? (
                            <div className="space-y-3">
                                {notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        className={cn(
                                            "flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors",
                                            !notification.read ? "bg-muted/50 hover:bg-muted" : "hover:bg-muted/30"
                                        )}
                                        onClick={() => !notification.read && markAsRead(notification.id)}
                                    >
                                        {notification.type === 'alert'
                                            ? <AlertCircle className="h-6 w-6 text-destructive mt-1 shrink-0" />
                                            : <Info className="h-6 w-6 text-primary mt-1 shrink-0" />
                                        }
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <p className={cn("text-base font-medium", !notification.read && "font-bold")}>
                                                    {notification.title}
                                                </p>
                                                {!notification.read && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        {t('notifications.new') || 'New'}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">{notification.description}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true, locale: dateLocale })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <Bell className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                                <p className="text-lg text-muted-foreground">{t('notifications.empty') || 'No notifications yet'}</p>
                                <p className="text-sm text-muted-foreground/70">
                                    {t('notifications.emptyHint') || 'Notifications about your orders, inventory, and more will appear here'}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
