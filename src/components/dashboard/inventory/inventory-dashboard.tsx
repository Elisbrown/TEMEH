// src/components/dashboard/inventory/inventory-dashboard.tsx
"use client"

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useInventory } from '@/context/inventory-context';
import { useSettings } from '@/context/settings-context';
import { useTranslation } from '@/hooks/use-translation';
import { formatCurrency } from '@/lib/utils';
import { 
    Package, 
    TrendingUp, 
    TrendingDown, 
    AlertTriangle, 
    DollarSign,
    Plus,
    ArrowUpRight,
    ArrowDownRight,
    Clock
} from 'lucide-react';
import { format } from 'date-fns';

export function InventoryDashboard() {
    const { stats, movements, loading } = useInventory();
    const { settings } = useSettings();
    const { t } = useTranslation();

    if (loading.stats) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 bg-gray-200 rounded animate-pulse w-16"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (!stats) return null;

    const recentMovements = movements.slice(0, 5);

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('inventory.totalItems')}
                        </CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalItems}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('inventory.itemsInStock')}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('inventory.lowStock')}
                        </CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{stats.lowStockItems}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('inventory.needsRestocking')}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('inventory.outOfStock')}
                        </CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.outOfStockItems}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('inventory.urgentRestock')}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('inventory.totalValue')}
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(stats.totalValue, settings.defaultCurrency)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('inventory.inventoryValue')}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Movements */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>{t('inventory.recentMovements')}</CardTitle>
                            <CardDescription>
                                {t('inventory.recentMovementsDesc', { count: stats.recentMovements })}
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm">
                            <Clock className="mr-2 h-4 w-4" />
                            {t('inventory.viewAll')}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {recentMovements.length > 0 ? (
                        <div className="space-y-4">
                            {recentMovements.map((movement) => (
                                <div key={movement.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-full ${
                                            movement.movement_type === 'IN' 
                                                ? 'bg-green-100 text-green-600' 
                                                : 'bg-red-100 text-red-600'
                                        }`}>
                                            {movement.movement_type === 'IN' ? (
                                                <ArrowUpRight className="h-4 w-4" />
                                            ) : (
                                                <ArrowDownRight className="h-4 w-4" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium">{movement.item?.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {movement.item?.sku}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center space-x-2">
                                            <Badge variant={
                                                movement.movement_type === 'IN' ? 'default' : 'secondary'
                                            }>
                                                {movement.movement_type === 'IN' 
                                                    ? t('inventory.stockIn') 
                                                    : t('inventory.stockOut')
                                                }
                                            </Badge>
                                            <span className="font-medium">
                                                {movement.movement_type === 'IN' ? '+' : '-'}{movement.quantity}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {format(new Date(movement.movement_date), 'MMM dd, yyyy HH:mm')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                            <p className="mt-2 text-sm text-muted-foreground">
                                {t('inventory.noRecentMovements')}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('inventory.quickActions')}</CardTitle>
                    <CardDescription>
                        {t('inventory.quickActionsDesc')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Button variant="outline" className="h-20 flex-col">
                            <Plus className="h-6 w-6 mb-2" />
                            {t('inventory.addItem')}
                        </Button>
                        <Button variant="outline" className="h-20 flex-col">
                            <TrendingUp className="h-6 w-6 mb-2" />
                            {t('inventory.stockIn')}
                        </Button>
                        <Button variant="outline" className="h-20 flex-col">
                            <TrendingDown className="h-6 w-6 mb-2" />
                            {t('inventory.stockOut')}
                        </Button>
                        <Button variant="outline" className="h-20 flex-col">
                            <AlertTriangle className="h-6 w-6 mb-2" />
                            {t('inventory.lowStockReport')}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 