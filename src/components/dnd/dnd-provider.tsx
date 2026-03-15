// New file: DndProvider to abstract away DND context setup
"use client"

import React from 'react';
import { DndContext, useSensors, useSensor, PointerSensor, KeyboardSensor, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';

interface DndProviderProps {
  children: React.ReactNode;
  onDragStart?: (event: DragStartEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
}

export function DndProvider({ children, onDragStart, onDragEnd }: DndProviderProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(KeyboardSensor)
    );

    return (
        <DndContext 
            sensors={sensors}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            {children}
        </DndContext>
    );
}
