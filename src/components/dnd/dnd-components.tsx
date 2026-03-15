
// New file with reusable components for drag-and-drop views

"use client"

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Clock } from "lucide-react"
import { useDroppable } from '@dnd-kit/core';
import type { Order, OrderStatus, OrderItem } from "@/context/order-context"
import { cn } from '@/lib/utils';

const getStatusVariant = (status: OrderStatus) => {
  switch (status) {
    case "Pending": return "destructive"
    case "In Progress": return "secondary"
    case "Ready": return "default"
    case "Completed": return "outline"
  }
}

const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - new Date(timestamp).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
}

// Draggable Order Card Component
export const OrderCard = React.forwardRef<HTMLDivElement, { order: Order; onUpdateStatus?: (id: string, status: OrderStatus) => void; t?: any, isDragging?: boolean, style?: React.CSSProperties, filterItems?: (item: OrderItem) => boolean, [key: string]: any }>(
  ({ order, onUpdateStatus, t, isDragging, style, filterItems, ...props }, ref) => {
    
  const visibleItems = filterItems ? order.items.filter(filterItems) : order.items;

  if (visibleItems.length === 0) return null; // Don't show card if no items match filter

  return (
    <Card ref={ref} style={style} className={cn("flex flex-col mb-4 touch-none cursor-grab active:cursor-grabbing", isDragging && "opacity-50 z-50")} {...props}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">{order.table}</CardTitle>
          <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
        </div>
        <div className="flex items-center text-xs text-muted-foreground pt-1">
          <Clock className="mr-1 h-3 w-3" />
          <span>{getTimeAgo(order.timestamp)}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-2">
        <Separator />
        <ul className="space-y-1 pt-2">
          {visibleItems.map((item: OrderItem, index: number) => (
            <li key={index} className="flex justify-between">
              <span>{item.name}</span>
              <span className="font-bold">x{item.quantity}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      {onUpdateStatus && t &&
        <CardFooter className="flex gap-2">
          {order.status === 'Pending' && (
            <Button className="w-full" onClick={() => onUpdateStatus(order.id, 'In Progress')}>
              {t('kitchen.startCooking')}
            </Button>
          )}
          {order.status === 'In Progress' && (
            <Button className="w-full" onClick={() => onUpdateStatus(order.id, 'Ready')}>
              {t('kitchen.markAsReady')}
            </Button>
          )}
          {order.status === 'Ready' && (
            <Button className="w-full" variant="outline" disabled>
              {t('kitchen.awaitingPayment')}
            </Button>
          )}
        </CardFooter>
      }
    </Card>
  );
});

OrderCard.displayName = "OrderCard";


export function SortableOrderCard({ order, onUpdateStatus, t, filterItems }: { order: Order; onUpdateStatus: (id: string, status: OrderStatus) => void; t: any, filterItems?: (item: OrderItem) => boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <OrderCard 
        ref={setNodeRef}
        order={order}
        onUpdateStatus={onUpdateStatus}
        t={t}
        isDragging={isDragging}
        style={style}
        filterItems={filterItems}
        {...attributes} 
        {...listeners}
    />
  );
}


// Droppable Column Component
export function DroppableColumn({ id, title, orders, onUpdateStatus, t, filterItems }: { id: string, title: string, orders: Order[], onUpdateStatus: (id: string, status: OrderStatus) => void; t: any, filterItems?: (item: OrderItem) => boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  // Filter orders to only show those that have at least one visible item
  // This prevents empty cards from taking up space in the sortable context if we didn't handle it in OrderCard (but we do return null there)
  // However, for SortableContext items prop, we should ideally only pass IDs of visible cards.
  const visibleOrders = filterItems 
    ? orders.filter(o => o.items.some(filterItems))
    : orders;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold font-headline">{title} ({visibleOrders.length})</h2>
      <SortableContext id={id} items={visibleOrders.map(o => o.id)}>
        <div 
          ref={setNodeRef} 
          className={cn(
            "space-y-4 rounded-lg border bg-card p-4 h-[calc(100vh-16rem)] overflow-y-auto transition-colors", 
            isOver && "bg-accent/50 border-primary"
          )}
        >
          {visibleOrders.length > 0 ? visibleOrders.map((order) => (
            <SortableOrderCard key={order.id} order={order} onUpdateStatus={onUpdateStatus} t={t} filterItems={filterItems} />
          )) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground text-center">{t('kitchen.noPending')}</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
