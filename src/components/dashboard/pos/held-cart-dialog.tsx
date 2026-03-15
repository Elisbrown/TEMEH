
"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatCurrency } from "@/lib/utils"
import { Trash2, PlayCircle, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSettings } from "@/context/settings-context"

type HeldCartItem = {
    id: number;
    name: string;
    price: number;
    quantity: number;
    unit_type?: string;
};

type HeldCart = {
    id: number;
    cart_name?: string;
    customer_name?: string;
    items: HeldCartItem[];
    total: number;
    created_at: string;
    notes?: string;
};

type HeldCartsDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onResumeCart: (cart: HeldCart) => void;
};

export function HeldCartsDialog({ open, onOpenChange, onResumeCart }: HeldCartsDialogProps) {
    const [carts, setCarts] = useState<HeldCart[]>([]);
    const { toast } = useToast();
    const { settings } = useSettings();

    const fetchCarts = async () => {
        try {
            const res = await fetch('/api/held-carts');
            if (res.ok) {
                const data = await res.json();
                setCarts(data);
            }
        } catch (error) {
            console.error("Failed to fetch held carts", error);
        }
    };

    useEffect(() => {
        if (open) {
            fetchCarts();
        }
    }, [open]);

    const handleDelete = async (id: number) => {
        try {
            const res = await fetch(`/api/held-carts/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setCarts(prev => prev.filter(c => c.id !== id));
                toast({ title: "Cart deleted" });
            } else {
                toast({ title: "Failed to delete", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error deleting cart", variant: "destructive" });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Suspended Sales</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[300px] pr-4">
                    {carts.length === 0 ? (
                        <div className="text-center text-muted-foreground py-10">
                            No suspended sales found.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {carts.map(cart => (
                                <div key={cart.id} className="border rounded-lg p-3 flex justify-between items-center bg-card">
                                    <div className="space-y-1">
                                        <div className="font-bold flex items-center gap-2">
                                            {cart.cart_name || cart.customer_name || `Order #${cart.id}`}
                                        </div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {new Date(cart.created_at).toLocaleString()}
                                        </div>
                                        <div className="text-xs font-medium">
                                            {cart.items.length} items • {formatCurrency(cart.total, settings.defaultCurrency)}
                                        </div>
                                        {cart.notes && <p className="text-xs text-muted-foreground/80 italic">"{cart.notes}"</p>}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(cart.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        <Button type="button" size="sm" className="h-8 gap-1" onClick={() => onResumeCart(cart)}>
                                            <PlayCircle className="h-4 w-4" />
                                            Resume
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
