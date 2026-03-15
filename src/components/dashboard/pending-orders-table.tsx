"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, CheckCircle, XCircle, Eye, ArrowRight, PlayCircle, Trash2, PauseCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useTranslation } from '@/hooks/use-translation'
import { useLanguage } from '@/context/language-context'
import { formatCurrency } from '@/lib/utils'
import { useSettings } from '@/context/settings-context'
import { useRouter } from 'next/navigation'

type PendingOrder = {
  id: string;
  table: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  status: 'Pending' | 'In Progress' | 'Ready' | 'Completed' | 'Canceled';
  timestamp: string;
  total_amount: number;
  item_count: number;
}

type HeldCart = {
  id: number;
  cart_name?: string;
  customer_name?: string;
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  created_at: string;
  notes?: string;
}

export function PendingOrdersTable() {
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { settings } = useSettings();
  const router = useRouter();

  const locale = language === 'fr' ? 'fr-FR' : 'en-US';

  const fetchPendingOrders = async () => {
    try {
      const response = await fetch('/api/orders?status=pending');
      if (response.ok) {
        const data = await response.json();
        setPendingOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch pending orders:', error);
    }
  };

  const fetchHeldCarts = async () => {
    try {
      const response = await fetch('/api/held-carts');
      if (response.ok) {
        const data = await response.json();
        setHeldCarts(data);
      }
    } catch (error) {
      console.error('Failed to fetch held carts:', error);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchPendingOrders(), fetchHeldCarts()]);
    setLoading(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders?id=${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: orderId,
          status: newStatus,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        await fetchPendingOrders();
        toast({
          title: t('common.success') || "Success",
          description: t('dashboard.orderUpdated', { status: t(`pos.${newStatus.toLowerCase().replace(' ', '')}`) || newStatus })
        });
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update order status"
      });
    }
  };

  const handleResumeCart = (cartId: number) => {
    // Navigate to POS — the POS page's HeldCartsDialog handles the actual resume
    router.push('/dashboard/pos');
    toast({
      title: t('pos.suspendedSales') || "Suspended Sales",
      description: t('pos.openSuspendedToResume') || "Open the Suspended Sales dialog in POS to resume this cart."
    });
  };

  const handleDeleteCart = async (cartId: number) => {
    try {
      const res = await fetch(`/api/held-carts/${cartId}`, { method: 'DELETE' });
      if (res.ok) {
        setHeldCarts(prev => prev.filter(c => c.id !== cartId));
        toast({ title: t('common.success') || "Success", description: t('pos.cartDeleted') || "Suspended sale deleted permanently." });
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete suspended sale." });
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Pending': return 'secondary';
      case 'In Progress': return 'default';
      case 'Ready': return 'default';
      case 'Completed': return 'default';
      case 'Canceled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <Clock className="h-3 w-3" />;
      case 'In Progress': return <ArrowRight className="h-3 w-3" />;
      case 'Ready': return <CheckCircle className="h-3 w-3" />;
      case 'Completed': return <CheckCircle className="h-3 w-3" />;
      case 'Canceled': return <XCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return t('periods.justNow') || 'Just now';
    if (diffInMinutes < 60) return t('periods.minutesAgo', { count: diffInMinutes }) || `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return t('periods.hoursAgo', { count: Math.floor(diffInMinutes / 60) }) || `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString(locale);
  };

  const totalCount = pendingOrders.length + heldCarts.length;

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (totalCount === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">{t('dashboard.noPendingOrders') || 'No Pending Orders'}</h3>
        <p className="text-sm text-muted-foreground">{t('dashboard.allOrdersUpToDate') || 'All orders are up to date!'}</p>
      </div>
    );
  }

  const displayedOrders = pendingOrders.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {pendingOrders.length > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {pendingOrders.length} {t('dashboard.pending') || 'Pending'}
            </Badge>
          )}
          {heldCarts.length > 0 && (
            <Badge variant="outline" className="flex items-center gap-1 border-amber-500/50 text-amber-600">
              <PauseCircle className="h-3 w-3" />
              {heldCarts.length} {t('pos.suspended') || 'Suspended'}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
            {pendingOrders.length > 5 && (
                <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/orders')}>
                    {t('dashboard.viewAll') || 'View All'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            )}
            <Button variant="outline" size="sm" onClick={fetchAll}>
                {t('dashboard.refresh') || 'Refresh'}
            </Button>
        </div>
      </div>

      {/* Suspended Sales (Held Carts) */}
      {heldCarts.length > 0 && (
        <div className="space-y-2">
          {heldCarts.map(cart => (
            <Card key={`held-${cart.id}`} className="hover:shadow-md transition-shadow border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="flex items-center gap-1 border-amber-500/50 text-amber-600 bg-amber-100/50 dark:bg-amber-900/30">
                      <PauseCircle className="h-3 w-3" />
                      {t('pos.suspended') || 'Suspended'}
                    </Badge>
                    <div>
                      <h4 className="font-medium">
                        {cart.cart_name || cart.customer_name || `${t('pos.suspendedSale') || 'Suspended Sale'} #${cart.id}`}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(cart.created_at)} • {cart.items.length} {t('dashboard.items') || 'items'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {formatCurrency(cart.total, settings.defaultCurrency)}
                    </div>
                  </div>
                </div>

                <div className="space-y-1 mb-3">
                  {cart.items.slice(0, 3).map((item, idx) => (
                    <div key={`held-${cart.id}-${item.id}-${idx}`} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{item.quantity}x</span>
                        <span>{item.name}</span>
                      </span>
                      <span className="text-muted-foreground">
                        {formatCurrency(item.price * item.quantity, settings.defaultCurrency)}
                      </span>
                    </div>
                  ))}
                  {cart.items.length > 3 && (
                    <div className="text-sm text-muted-foreground">
                      +{cart.items.length - 3} {t('dashboard.moreItems2') || 'more items'}
                    </div>
                  )}
                </div>

                {cart.notes && (
                  <p className="text-xs text-muted-foreground/80 italic mb-3">"{cart.notes}"</p>
                )}

                <div className="flex items-center justify-between pt-3 border-t">
                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={() => handleResumeCart(cart.id)}
                  >
                    <PlayCircle className="h-3 w-3" />
                    {t('pos.resume') || 'Resume'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteCart(cart.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    {t('common.delete') || 'Delete'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Regular Pending Orders */}
      <div className="space-y-2">
        {displayedOrders.map(order => (
          <Card key={order.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(order.status)} className="flex items-center gap-1">
                      {getStatusIcon(order.status)}
                      {t(`pos.${order.status.toLowerCase().replace(' ', '')}`) || order.status}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium">{t('pos.table')} {order.table}</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(order.timestamp)} • {order.item_count} {t('dashboard.items')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {formatCurrency(
                      order.total_amount || order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0), 
                      settings.defaultCurrency
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('pos.order')} #{order.id.slice(-6)}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                {order.items.slice(0, 3).map((item, idx) => (
                  <div key={`${order.id}-${item.id}-${idx}`} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{item.quantity}x</span>
                      <span>{item.name}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {formatCurrency(item.price * item.quantity, settings.defaultCurrency)}
                    </span>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <div className="text-sm text-muted-foreground">
                    {t('dashboard.moreItems', { count: order.items.length - 3 }) || `+${order.items.length - 3} more items`}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateOrderStatus(order.id, 'In Progress')}
                    disabled={order.status !== 'Pending'}
                  >
                    {t('common.start') || 'Start'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateOrderStatus(order.id, 'Ready')}
                    disabled={order.status === 'Pending'}
                  >
                    {t('pos.ready') || 'Ready'}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateOrderStatus(order.id, 'Canceled')}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    {t('common.cancel') || 'Cancel'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => router.push(`/dashboard/orders?id=${order.id}`)}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {pendingOrders.length > 5 && (
        <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => router.push('/dashboard/orders')}
        >
            {t('dashboard.viewAllOrders') || 'View All Pending Orders'}
            <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}