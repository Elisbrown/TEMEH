
"use client"

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { useNotifications } from './notification-context';
import { useAuth } from './auth-context';

export type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  image: string;
  isPersisted?: boolean;
  persistedQuantity?: number; // The original quantity from a persisted order (minimum allowed)
  unit_type?: string;
  max_stock?: number;
};

export type OrderStatus = "Pending" | "In Progress" | "Ready" | "Completed" | "Canceled";

export type Order = {
  id: string;
  table: string;
  items: OrderItem[];
  status: OrderStatus;
  timestamp: Date;
  subtotal?: number;
  discount?: number;
  discountName?: string;
  tax?: number;
  total?: number;
  cashier_id?: number;
  cashierName?: string;
  payment_method?: string;
  cancelled_by?: number;
  cancellation_reason?: string;
  cancelled_at?: Date;
};

type OrderContextType = {
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'timestamp'> & { id?: string; timestamp?: Date; cashier_id?: number; }) => Promise<boolean>;
  updateOrder: (order: Order) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus, cancellation?: { cancelled_by?: number, reason?: string }) => Promise<void>;
  splitOrder: (orderId: string, itemsToSplit: OrderItem[]) => Promise<void>;
  mergeOrders: (fromOrderId: string, toOrderId: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  fetchOrders: () => Promise<void>;
};

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider = ({ children }: { children: ReactNode }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const { toast } = useToast();
  const { t } = useTranslation();
  const { addNotification } = useNotifications();
  const { user } = useAuth();


  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/orders');
      const data = await response.json();
      if (response.ok) {
        const newOrders = data.map((o: any) => ({ ...o, timestamp: new Date(o.timestamp) }));
        setOrders(prev => {
          if (JSON.stringify(prev) === JSON.stringify(newOrders)) return prev;
          return newOrders;
        });
      } else {
        console.error("Failed to fetch orders:", data.message);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  }, []);

  // Initial fetch and polling for background auto-refresh
  useEffect(() => {
    fetchOrders(); // Initial fetch
    const interval = setInterval(fetchOrders, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const addOrder = useCallback(async (order: Omit<Order, 'id' | 'timestamp'> & { id?: string; timestamp?: Date; cashier_id?: number }) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...order, userEmail: user?.email })
      });

      if (response.ok) {
        addNotification({
          title: "New Order Placed",
          description: `A new order has been placed for table ${order.table}.`,
          type: 'info'
        });
        await fetchOrders();
        return true;
      } else {
        const error = await response.json();
        console.error("Failed to add order:", error.message);
        return false;
      }
    } catch (err) {
      console.error("Error adding order:", err);
      return false;
    }
  }, [fetchOrders, addNotification, user?.email]);

  const updateOrder = useCallback(async (updatedOrder: Order) => {
    const response = await fetch(`/api/orders?id=${updatedOrder.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updatedOrder, userEmail: user?.email })
    });

    if (response.ok) {
      await fetchOrders();
    } else {
      const error = await response.json();
      console.error("Failed to update order:", error);
      throw new Error(error.message || 'Failed to update order');
    }
  }, [fetchOrders, user?.email]);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, cancellation?: { cancelled_by?: number, reason?: string }) => {
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (orderToUpdate) {
      const updatedOrder = {
        ...orderToUpdate,
        status,
        timestamp: new Date(),
        ...(cancellation && {
          cancelled_by: cancellation.cancelled_by,
          cancellation_reason: cancellation.reason,
          cancelled_at: new Date()
        })
      };



      // Update the order in the database
      const response = await fetch(`/api/orders?id=${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orderId,
          status,
          timestamp: new Date(),
          userEmail: user?.email,
          ...(cancellation && {
            cancelled_by: cancellation.cancelled_by,
            cancellation_reason: cancellation.reason,
            cancelled_at: new Date()
          })
        })
      });

      // Send notification if status changed to Ready
      if (status === 'Ready' && orderToUpdate.status === 'In Progress') {
        addNotification({
          title: "Order Ready",
          description: `Order ${orderId} for table ${orderToUpdate.table} is ready for pickup.`,
          type: 'info'
        });
      }

      if (response.ok) {
        // Update local state immediately for better UX
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === orderId ? updatedOrder as Order : order
          )
        );
      } else {
        console.error("Failed to update order status");
        // Revert local state if database update failed
        await fetchOrders();
      }
    }
  }, [orders, fetchOrders, addNotification, user?.email]);

  const deleteOrder = useCallback(async (orderId: string) => {
    await fetch(`/api/orders?id=${orderId}&userEmail=${encodeURIComponent(user?.email || '')}`, {
      method: 'DELETE',
    });
    await fetchOrders();
  }, [fetchOrders, user?.email]);

  const splitOrder = useCallback(async (orderId: string, itemsToSplit: OrderItem[]) => {
    const response = await fetch('/api/orders/split', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, itemsToSplit, userEmail: user?.email })
    });
    if (response.ok) {
      await fetchOrders();
      const { newOrder } = await response.json();
      toast({ title: t('toasts.orderSplit'), description: t('toasts.orderSplitDesc', { newOrderId: newOrder.id }) });
    } else {
      const error = await response.json();
      toast({ variant: 'destructive', title: "Split Failed", description: error.message });
    }
  }, [fetchOrders, t, toast, user?.email]);

  const mergeOrders = useCallback(async (fromOrderId: string, toOrderId: string) => {
    await fetch('/api/orders/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromOrderId, toOrderId, userEmail: user?.email })
    });
    await fetchOrders();
    toast({ title: t('toasts.orderMerged'), description: t('toasts.orderMergedDesc', { fromId: fromOrderId, toId: toOrderId }) });
  }, [fetchOrders, t, toast, user?.email]);

  return (
    <OrderContext.Provider value={{ orders, addOrder, updateOrder, updateOrderStatus, splitOrder, mergeOrders, deleteOrder, fetchOrders }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};
