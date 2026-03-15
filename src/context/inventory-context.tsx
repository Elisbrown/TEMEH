
// src/context/inventory-context.tsx
"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { InventoryItem, InventoryMovement, InventoryCategory, InventorySupplier } from '@/lib/db/inventory';
export type { InventoryItem, InventoryMovement, InventoryCategory, InventorySupplier };
import { useAuth } from './auth-context';

type InventoryContextType = {
    // Items
    items: InventoryItem[];
    addItem: (itemData: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'status' | 'supplier'>) => Promise<void>;
    bulkAddItems: (itemsData: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'status' | 'supplier'>[]) => Promise<void>;
    updateItem: (id: number, itemData: Partial<InventoryItem>) => Promise<void>;
    deleteItem: (id: number) => Promise<void>;
    fetchItems: () => Promise<void>;
    
    // Movements
    movements: InventoryMovement[];
    addMovement: (movementData: Omit<InventoryMovement, 'id' | 'movement_date' | 'item' | 'user'>) => Promise<void>;
    addBulkMovements: (movementsData: Omit<InventoryMovement, 'id' | 'movement_date' | 'item' | 'user'>[]) => Promise<void>;
    fetchMovements: (itemId?: number) => Promise<void>;
    
    // Categories
    categories: InventoryCategory[];
    addCategory: (categoryData: Omit<InventoryCategory, 'id' | 'created_at'>) => Promise<void>;
    fetchCategories: () => Promise<void>;
    
    // Suppliers
    suppliers: InventorySupplier[];
    addSupplier: (supplierData: Omit<InventorySupplier, 'id' | 'created_at'>) => Promise<void>;
    updateSupplier: (supplierData: InventorySupplier) => Promise<void>;
    deleteSupplier: (supplierId: string) => Promise<void>;
    fetchSuppliers: () => Promise<void>;
    
    // Stats
    stats: {
        totalItems: number;
        lowStockItems: number;
        outOfStockItems: number;
        totalValue: number;
        recentMovements: number;
    } | null;
    fetchStats: () => Promise<void>;
    
    // Loading states
    loading: {
        items: boolean;
        movements: boolean;
        categories: boolean;
        suppliers: boolean;
        stats: boolean;
    };
};

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [movements, setMovements] = useState<InventoryMovement[]>([]);
    const [categories, setCategories] = useState<InventoryCategory[]>([]);
    const [suppliers, setSuppliers] = useState<InventorySupplier[]>([]);
    const [stats, setStats] = useState<InventoryContextType['stats']>(null);
    const { user } = useAuth();
    const [loading, setLoading] = useState({
        items: false,
        movements: false,
        categories: false,
        suppliers: false,
        stats: false
    });

    // Fetch items
    const fetchItems = useCallback(async () => {
        if (items.length === 0) setLoading(prev => ({ ...prev, items: true }));
        try {
            const response = await fetch('/api/inventory');
            if (response.ok) {
                const data = await response.json();
                setItems(prev => {
                    if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
                    return data;
                });
            }
        } catch (error) {
            console.error('Error fetching inventory items:', error);
        } finally {
            setLoading(prev => ({ ...prev, items: false }));
        }
    }, []);

    // Add item
    const addItem = async (itemData: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'status' | 'supplier'>) => {
        try {
            const response = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...itemData, userEmail: user?.email })
            });
            if (response.ok) {
                await fetchItems();
            } else {
                throw new Error('Failed to add item');
            }
        } catch (error) {
            console.error('Error adding inventory item:', error);
            throw error;
        }
    };

    // Add multiple items (Bulk)
    const bulkAddItems = async (itemsData: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'status' | 'supplier'>[]) => {
        try {
            const response = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: itemsData, userEmail: user?.email })
            });
            if (response.ok) {
                await fetchItems();
            } else {
                throw new Error('Failed to add bulk items');
            }
        } catch (error) {
            console.error('Error adding bulk inventory items:', error);
            throw error;
        }
    };

    // Update item
    const updateItem = async (id: number, itemData: Partial<InventoryItem>) => {
        try {
            const response = await fetch('/api/inventory', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...itemData, userEmail: user?.email })
            });
            if (response.ok) {
                await fetchItems();
            } else {
                throw new Error('Failed to update item');
            }
        } catch (error) {
            console.error('Error updating inventory item:', error);
            throw error;
        }
    };

    // Delete item
    const deleteItem = async (id: number) => {
        try {
            const response = await fetch(`/api/inventory?id=${id}&userEmail=${encodeURIComponent(user?.email || '')}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                await fetchItems();
            }
        } catch (error) {
            console.error('Error deleting inventory item:', error);
            throw error;
        }
    };

    // Fetch movements
    const fetchMovements = useCallback(async (itemId?: number) => {
        if (!itemId && movements.length === 0) setLoading(prev => ({ ...prev, movements: true }));
        try {
            const url = itemId ? `/api/inventory/movements?itemId=${itemId}` : '/api/inventory/movements';
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setMovements(data);
            }
        } catch (error) {
            console.error('Error fetching inventory movements:', error);
        } finally {
            setLoading(prev => ({ ...prev, movements: false }));
        }
    }, [movements.length]);

    // Add movement
    const addMovement = async (movementData: Omit<InventoryMovement, 'id' | 'movement_date' | 'item' | 'user'>) => {
        try {
            const response = await fetch('/api/inventory/movements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...movementData, userEmail: user?.email })
            });
            if (response.ok) {
                await fetchMovements();
                await fetchItems(); // Refresh items to update stock levels
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to add movement');
            }
        } catch (error) {
            console.error('Error adding inventory movement:', error);
            throw error;
        }
    };

    // Add bulk movements
    const addBulkMovements = async (movementsData: Omit<InventoryMovement, 'id' | 'movement_date' | 'item' | 'user'>[]) => {
        try {
            const response = await fetch('/api/inventory/movements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movements: movementsData, userEmail: user?.email })
            });
            if (response.ok) {
                await fetchMovements();
                await fetchItems(); // Refresh items to update stock levels
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to add bulk movements');
            }
        } catch (error) {
            console.error('Error adding bulk inventory movements:', error);
            throw error;
        }
    };

    // Fetch categories
    const fetchCategories = useCallback(async () => {
        if (categories.length === 0) setLoading(prev => ({ ...prev, categories: true }));
        try {
            const response = await fetch('/api/categories');
            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(prev => ({ ...prev, categories: false }));
        }
    }, [categories.length]);

    // Add category
    const addCategory = async (categoryData: Omit<InventoryCategory, 'id' | 'created_at'>) => {
        try {
            const response = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...categoryData, userEmail: user?.email })
            });
            if (response.ok) {
                await fetchCategories();
            }
        } catch (error) {
            console.error('Error adding category:', error);
            throw error;
        }
    };

    // Fetch suppliers
    const fetchSuppliers = useCallback(async () => {
        if (suppliers.length === 0) setLoading(prev => ({ ...prev, suppliers: true }));
        try {
            const response = await fetch('/api/suppliers');
            if (response.ok) {
                const data = await response.json();
                setSuppliers(data);
            }
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        } finally {
            setLoading(prev => ({ ...prev, suppliers: false }));
        }
    }, [suppliers.length]);

    // Add supplier
    const addSupplier = async (supplierData: Omit<InventorySupplier, 'id' | 'created_at'>) => {
        try {
            const response = await fetch('/api/suppliers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...supplierData, userEmail: user?.email })
            });
            if (response.ok) {
                await fetchSuppliers();
            }
        } catch (error) {
            console.error('Error adding supplier:', error);
            throw error;
        }
    };

    // Update supplier
    const updateSupplier = async (supplierData: InventorySupplier) => {
        try {
            const response = await fetch('/api/suppliers', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...supplierData, userEmail: user?.email })
            });
            if (response.ok) {
                await fetchSuppliers();
            }
        } catch (error) {
            console.error('Error updating supplier:', error);
            throw error;
        }
    };

    // Delete supplier
    const deleteSupplier = async (supplierId: string) => {
        try {
            const response = await fetch(`/api/suppliers?id=${supplierId}&userEmail=${encodeURIComponent(user?.email || '')}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                await fetchSuppliers();
            }
        } catch (error) {
            console.error('Error deleting supplier:', error);
            throw error;
        }
    };

    // Fetch stats
    const fetchStats = useCallback(async () => {
        // We cannot depend on `stats` here if we want a stable function, so we pass it or check inside.
        // But since we just do a fetch and update, it's safer to just fetch.
        try {
            const response = await fetch('/api/dashboard-stats');
            if (response.ok) {
                const data = await response.json();
                setStats(prev => {
                   if (JSON.stringify(prev) === JSON.stringify(data.inventory)) return prev;
                   return data.inventory;
                });
            }
        } catch (error) {
            console.error('Error fetching inventory stats:', error);
        } 
    }, []);

    // Initial data fetch and background polling
    useEffect(() => {
        const fetchAll = () => {
            fetchItems();
            fetchMovements();
            fetchCategories();
            fetchSuppliers();
            fetchStats();
        };

        fetchAll(); // Initial fetch
        const interval = setInterval(() => {
            fetchItems();
            fetchStats();
            // Categories and suppliers change less often, but we can refresh them too or just occasionally
            // For "silent refresh", items and stats are most important.
        }, 15000);

        return () => clearInterval(interval);
    }, [fetchItems, fetchMovements, fetchCategories, fetchSuppliers, fetchStats]);

    const value: InventoryContextType = {
        items,
        addItem,
        bulkAddItems,
        updateItem,
        deleteItem,
        fetchItems,
        movements,
        addMovement,
        addBulkMovements,
        fetchMovements,
        categories,
        addCategory,
        fetchCategories,
        suppliers,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        fetchSuppliers,
        stats,
        fetchStats,
        loading
    };

    return (
        <InventoryContext.Provider value={value}>
            {children}
        </InventoryContext.Provider>
    );
};

export const useInventory = () => {
    const context = useContext(InventoryContext);
    if (context === undefined) {
        throw new Error('useInventory must be used within an InventoryProvider');
    }
    return context;
};