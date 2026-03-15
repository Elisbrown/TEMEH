
// New file: Custom hook to encapsulate DND logic for kitchen/bar views

"use client"

import { useState, useCallback } from 'react';
import { useDndContext, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import type { Order, OrderStatus } from '@/context/order-context';

export function useDnd(
    orders: Order[],
    onStatusChange: (orderId: string, status: OrderStatus) => void,
    setOrderToCancel: (order: Order | null) => void
) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const { active } = useDndContext();

    const activeOrder = activeId ? orders.find(o => o.id === activeId) : null;

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        
        setActiveId(null);
        if (!over) {
            return;
        }

        if (over.id === 'cancel' && activeOrder) {
            setOrderToCancel(activeOrder);
            return;
        }
        
        if (active.id !== over.id) {
            const overContainerId = over.data.current?.sortable?.containerId || over.id;
            const validStatuses: OrderStatus[] = ['Pending', 'In Progress', 'Ready'];
            if (validStatuses.includes(overContainerId as OrderStatus)) {
                onStatusChange(active.id as string, overContainerId as OrderStatus);
            }
        }
    }, [activeOrder, onStatusChange, setOrderToCancel]);
    
    return {
        activeId,
        activeOrder,
        handleDragStart,
        handleDragEnd
    }
}
