
"use client"

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useProducts } from './product-context'; 
import { useAuth } from './auth-context';

export type Category = {
  id: string
  name: string
  productCount: number
  isFood: boolean
}

type CategoryContextType = {
  categories: Category[];
  addCategory: (categoryData: Omit<Category, 'id' | 'productCount'>) => Promise<void>;
  updateCategory: (updatedCategory: Omit<Category, 'productCount'>) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
};

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export const CategoryProvider = ({ children }: { children: ReactNode }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const { meals } = useProducts()
  const { user } = useAuth();

  const fetchCategories = useCallback(async () => {
    const response = await fetch('/api/categories');
    if (!response.ok) {
      console.error("Failed to fetch categories");
      return;
    }
    const fetchedCategories: Category[] = await response.json();
    setCategories(prev => {
        if (JSON.stringify(prev) === JSON.stringify(fetchedCategories)) return prev;
        return fetchedCategories;
    });
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories, meals]); // Still refresh when meals change to be safe

  const addCategory = async (categoryData: Omit<Category, 'id' | 'productCount'>) => {
    await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...categoryData, userEmail: user?.email })
    });
    await fetchCategories();
  };

  const updateCategory = async (updatedCategory: Omit<Category, 'productCount'>) => {
    await fetch(`/api/categories?id=${updatedCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updatedCategory, userEmail: user?.email })
    });
    await fetchCategories();
  };

  const deleteCategory = async (categoryId: string) => {
    await fetch(`/api/categories?id=${categoryId}&userEmail=${encodeURIComponent(user?.email || '')}`, {
        method: 'DELETE'
    });
    await fetchCategories();
  };

  return (
    <CategoryContext.Provider value={{ categories, addCategory, updateCategory, deleteCategory, fetchCategories }}>
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategories = () => {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error('useCategories must be used within a CategoryProvider');
  }
  return context;
};
