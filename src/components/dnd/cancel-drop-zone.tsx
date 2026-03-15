// New component for the cancel/delete drop zone

"use client"

import { useDroppable } from '@dnd-kit/core';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CancelDropZone({ activeId }: { activeId: string | null }) {
    const { isOver, setNodeRef } = useDroppable({
        id: 'cancel',
    });

    return (
        <div 
            ref={setNodeRef}
            className={cn(
                "fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 rounded-full border-2 border-dashed border-destructive bg-destructive/10 px-8 py-4 text-destructive transition-all duration-300",
                activeId ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none",
                isOver && "bg-destructive/30 scale-110"
            )}
        >
            <Trash2 className="h-6 w-6" />
            <span className="font-semibold">Drag here to Cancel</span>
        </div>
    );
}
