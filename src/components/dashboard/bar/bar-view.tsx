
"use client"

import { useState } from 'react'
import { useOrders } from '@/context/order-context'
import { useCategories } from '@/context/category-context'
import { useToast } from '@/hooks/use-toast'
import { useTranslation } from '@/hooks/use-translation'
import { useNotifications } from '@/context/notification-context'
import { DroppableColumn } from '@/components/dnd/dnd-components'
import { CancelDropZone } from '@/components/dnd/cancel-drop-zone'
import { CancelOrderDialog } from '@/components/dashboard/cancel-order-dialog'
import { useActivityLog } from '@/context/activity-log-context'
import { useStaff } from '@/context/staff-context'
import { useAuth } from '@/context/auth-context'
import type { Order, OrderStatus } from '@/context/order-context'

export function BarView({ orderToCancel, setOrderToCancel, activeId }: { 
  orderToCancel: Order | null; 
  setOrderToCancel: (order: Order | null) => void;
  activeId: string | null;
}) {
  const { orders, updateOrderStatus } = useOrders()
  const { categories } = useCategories()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { addNotification } = useNotifications()

  const getDrinkOrders = (status: OrderStatus) => {
    return orders
      .filter(order => order.status === status && order.items.some(item => {
        const category = categories.find(c => c.name === item.category);
        return category && !category.isFood;
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const orderData = {
    'Pending': getDrinkOrders('Pending'),
    'In Progress': getDrinkOrders('In Progress'),
    'Ready': getDrinkOrders('Ready'),
  };
  
  const allDrinkOrders = [...orderData['Pending'], ...orderData['In Progress'], ...orderData['Ready']];

  const handleUpdateStatus = (orderId: string, newStatus: OrderStatus) => {
    updateOrderStatus(orderId, newStatus)
    const order = orders.find(o => o.id === orderId)
    if (newStatus === 'Ready' && order) {
      toast({
        title: t('toasts.orderReady'),
        description: t('toasts.drinksReadyDesc', { table: order.table }),
      })
      addNotification({
        title: t('toasts.orderReady'),
        description: t('toasts.drinksReadyDesc', { table: order.table }),
        type: 'info'
      });
    }
  }
  
  const { logActivity } = useActivityLog()
  const { user } = useAuth()
  const { staff } = useStaff()

  const handleCancelConfirm = async (reason: string) => {
    if (orderToCancel) {
        // Find user ID
        const currentStaff = staff.find(s => s.email === user?.email);
        const userId = currentStaff ? parseInt(currentStaff.id) : undefined;

        await updateOrderStatus(orderToCancel.id, 'Canceled', {
            cancelled_by: userId,
            reason: reason
        });
        
        await logActivity('cancel_order', `Order ${orderToCancel.id} canceled by ${user?.name}. Reason: ${reason}`);
        
        toast({
            title: t('toasts.orderCanceled'),
            description: t('toasts.orderCanceledDesc', { orderId: orderToCancel.id }),
            variant: "destructive"
        });
        setOrderToCancel(null);
    }
  };

  const isDrinkItem = (item: any) => {
    const category = categories.find(c => c.name === item.category);
    return !!(category && !category.isFood);
  };

  return (
    <>
      <div className="flex-1 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DroppableColumn 
            id="Pending" 
            title={t('bar.pending')} 
            orders={orderData['Pending']} 
            onUpdateStatus={handleUpdateStatus} 
            t={t} 
            filterItems={isDrinkItem}
          />
          <DroppableColumn 
            id="In Progress" 
            title={t('bar.inProgress')} 
            orders={orderData['In Progress']} 
            onUpdateStatus={handleUpdateStatus} 
            t={t} 
            filterItems={isDrinkItem}
          />
          <DroppableColumn 
            id="Ready" 
            title={t('bar.ready')} 
            orders={orderData['Ready']} 
            onUpdateStatus={handleUpdateStatus} 
            t={t} 
            filterItems={isDrinkItem}
          />
        </div>
        <CancelDropZone activeId={activeId} />
      </div>

      <CancelOrderDialog 
        open={!!orderToCancel} 
        onOpenChange={(open) => !open && setOrderToCancel(null)}
        onConfirm={handleCancelConfirm}
        orderId={orderToCancel?.id || ''}
      />
    </>
  )
}
