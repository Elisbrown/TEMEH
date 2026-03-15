
// New context for managing global application settings
"use client"

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { hexToHsl } from '@/lib/utils';
import { useTheme } from 'next-themes';

export type ThemeColor = {
    primary: string; // HEX
    background: string; // HEX
    accent: string; // HEX
}

export type Theme = {
    name: string;
    colors: ThemeColor;
}

export type ReceiptField = {
    label: string;
    value: string;
}

export type Currency = {
    code: string;
    name: string;
    symbol: string;
    position: 'before' | 'after';
}

export type TaxRate = {
    id: string;
    name: string;
    rate: number; // percentage
    isDefault: boolean;
}

export type DiscountType = 'percentage' | 'fixed';

export type DiscountRule = {
    id: string;
    name: string;
    type: DiscountType;
    value: number;
    isActive: boolean;
}

export type Settings = {
    platformName: string;
    platformLogo: string;
    organizationName: string;
    contactAddress: string;
    contactPhone: string;
    activeTheme: string;
    themes: Theme[];
    receiptHeader: string;
    receiptFooter: string;
    receiptShowWaiter: boolean;
    receiptCustomFields: ReceiptField[];
    receiptLineSpacing: number;
    receiptFont: 'mono' | 'sans' | 'serif';
    loginCarouselImages?: string[];
    // Currency & Financial Settings
    defaultCurrency: Currency;
    availableCurrencies: Currency[];
    // Tax Management
    taxEnabled: boolean;
    taxRates: TaxRate[];
    // Discount Management
    discountEnabled: boolean;
    discountRules: DiscountRule[];
};

type SettingsContextType = {
    settings: Settings;
    setSettings: (settings: Settings) => void;
    updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
    addTheme: (theme: Theme) => void;
    deleteTheme: (themeName: string) => void;
    applyTheme: (themeName: string) => void;
    // Currency Management
    updateDefaultCurrency: (currency: Currency) => void;
    addCurrency: (currency: Currency) => void;
    removeCurrency: (currencyCode: string) => void;
    // Tax Management
    toggleTax: (enabled: boolean) => void;
    addTaxRate: (taxRate: Omit<TaxRate, 'id'>) => void;
    updateTaxRate: (id: string, taxRate: Partial<TaxRate>) => void;
    deleteTaxRate: (id: string) => void;
    setDefaultTaxRate: (id: string) => void;
    // Discount Management
    toggleDiscount: (enabled: boolean) => void;
    addDiscountRule: (discountRule: Omit<DiscountRule, 'id'>) => void;
    updateDiscountRule: (id: string, discountRule: Partial<DiscountRule>) => void;
    deleteDiscountRule: (id: string) => void;
    toggleDiscountRule: (id: string, isActive: boolean) => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettingsState] = useState<Settings>(() => {
        // Initialize with default settings, will be updated from API
        return {
            platformName: 'TEMEH',
            platformLogo: '',
            organizationName: 'TEMEH Inc.',
            contactAddress: '123 Tech Street, Silicon Valley',
            contactPhone: '+1 234 567 890',
            activeTheme: 'Navy',
            themes: [
                {
                    name: "Navy",
                    colors: {
                        primary: "#1E3A8A", // Navy Blue
                        background: "#0F172A", // Dark Slate
                        accent: "#1E293B", // Darker Slate
                    }
                },
                {
                    name: "Light",
                    colors: {
                        primary: "#1E3A8A",
                        background: "#FFFFFF",
                        accent: "#F1F5F9",
                    }
                },
                {
                    name: "Default",
                    colors: {
                        primary: "#0F172A",
                        background: "#F8FAFC",
                        accent: "#F1F5F9",
                    }
                }
            ],
            receiptHeader: "Welcome to our establishment!",
            receiptFooter: "Thank you for your visit! Come again!",
            receiptShowWaiter: true,
            receiptCustomFields: [
                { label: 'NIU', value: 'P123456789012' },
            ],
            receiptLineSpacing: 1.5,
            receiptFont: 'mono',
            loginCarouselImages: [
                'https://placehold.co/1920x1080.png'
            ],
            // Currency & Financial Settings
            defaultCurrency: { code: 'XAF', name: 'Central African Franc', symbol: 'FCFA', position: 'before' },
            availableCurrencies: [
                { code: 'XAF', name: 'Central African Franc', symbol: 'FCFA', position: 'before' },
                { code: 'USD', name: 'United States Dollar', symbol: '$', position: 'before' },
                { code: 'EUR', name: 'Euro', symbol: '€', position: 'before' },
            ],
            // Tax Management
            taxEnabled: true,
            taxRates: [
                { id: 'VAT', name: 'Value Added Tax (VAT)', rate: 19, isDefault: false },
                { id: 'GST', name: 'Goods and Services Tax (GST)', rate: 10, isDefault: false },
                { id: 'PST', name: 'Property Tax (PST)', rate: 5, isDefault: false },
            ],
            // Discount Management
            discountEnabled: true,
            discountRules: [
                { id: '1', name: 'No Discount', type: 'percentage', value: 0, isActive: true },
                { id: '2', name: '10% Discount', type: 'percentage', value: 10, isActive: true },
                { id: '3', name: '20% Discount', type: 'percentage', value: 20, isActive: true },
            ],
        };
    });

    const fetchSettings = useCallback(async () => {
        try {
            const response = await fetch('/api/settings');
            if (response.ok) {
                const data = await response.json();
                // Normalize logo and carousel paths
                if (data.platformLogo && data.platformLogo.startsWith('/uploads/')) {
                    data.platformLogo = data.platformLogo.replace('/uploads/', '/api/files/');
                }
                if (data.loginCarouselImages) {
                    data.loginCarouselImages = data.loginCarouselImages.map((img: string) => 
                        img.startsWith('/uploads/') ? img.replace('/uploads/', '/api/files/') : img
                    );
                }
                setSettingsState(data);
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        }
    }, []); // Empty dependency array - only fetch on mount

    const handleSetSettings = useCallback(async (newSettings: Settings) => {
        // Normalize paths before saving and setting state
        const normalized = { ...newSettings };
        if (normalized.platformLogo && normalized.platformLogo.startsWith('/uploads/')) {
            normalized.platformLogo = normalized.platformLogo.replace('/uploads/', '/api/files/');
        }
        if (normalized.loginCarouselImages) {
            normalized.loginCarouselImages = normalized.loginCarouselImages.map((img: string) => 
                img.startsWith('/uploads/') ? img.replace('/uploads/', '/api/files/') : img
            );
        }

        setSettingsState(normalized);
        try {
            // Get current user email from localStorage or context
            const storedUser = typeof window !== 'undefined' ? sessionStorage.getItem('temeh-user') : null;
            const currentUser = storedUser ? JSON.parse(storedUser) : {};
            const userEmail = currentUser.email || 'system';
            
            await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    settings: normalized,
                    userEmail: userEmail
                })
            });
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }, []);

    const updateSetting = useCallback(async <K extends keyof Settings,>(key: K, value: Settings[K]) => {
        let normalizedValue = value;
        if (key === 'platformLogo' && typeof value === 'string' && value.startsWith('/uploads/')) {
            normalizedValue = value.replace('/uploads/', '/api/files/') as Settings[K];
        }
        if (key === 'loginCarouselImages' && Array.isArray(value)) {
            normalizedValue = value.map(img => 
                typeof img === 'string' && img.startsWith('/uploads/') ? img.replace('/uploads/', '/api/files/') : img
            ) as Settings[K];
        }

        const newSettings = { ...settings, [key]: normalizedValue };
        setSettingsState(newSettings);
        try {
            // Get current user email from localStorage or context
            const storedUser = typeof window !== 'undefined' ? sessionStorage.getItem('temeh-user') : null;
            const currentUser = storedUser ? JSON.parse(storedUser) : {};
            const userEmail = currentUser.email || 'system';
            
            await fetch(`/api/settings?key=${key}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    value: normalizedValue,
                    userEmail: userEmail
                })
            });
        } catch (error) {
            console.error('Failed to update setting:', error);
        }
    }, [settings]);
    
    const addTheme = useCallback(async (theme: Theme) => {
        const newSettings = { ...settings, themes: [...settings.themes, theme] };
        setSettingsState(newSettings);
        try {
            // Get current user email from localStorage or context
            const storedUser = typeof window !== 'undefined' ? sessionStorage.getItem('temeh-user') : null;
            const currentUser = storedUser ? JSON.parse(storedUser) : {};
            const userEmail = currentUser.email || 'system';
            
            await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    settings: newSettings,
                    userEmail: userEmail
                })
            });
        } catch (error) {
            console.error('Failed to add theme:', error);
        }
    }, [settings]);

    const deleteTheme = useCallback(async (themeName: string) => {
        if (themeName === "Default") return; // Cannot delete default theme
        const newSettings = {
            ...settings,
            themes: settings.themes.filter(t => t.name !== themeName),
            activeTheme: settings.activeTheme === themeName ? "Default" : settings.activeTheme
        };
        setSettingsState(newSettings);
        try {
            // Get current user email from localStorage or context
            const storedUser = typeof window !== 'undefined' ? sessionStorage.getItem('temeh-user') : null;
            const currentUser = storedUser ? JSON.parse(storedUser) : {};
            const userEmail = currentUser.email || 'system';
            
            await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    settings: newSettings,
                    userEmail: userEmail
                })
            });
        } catch (error) {
            console.error('Failed to delete theme:', error);
        }
    }, [settings]);
    
    const applyTheme = useCallback((themeName: string) => {
        updateSetting('activeTheme', themeName);
    }, [updateSetting]);

    // Currency Management Methods
    const updateDefaultCurrency = useCallback(async (currency: Currency) => {
        const newSettings = { ...settings, defaultCurrency: currency };
        setSettingsState(newSettings);
        try {
            const storedUser = typeof window !== 'undefined' ? sessionStorage.getItem('temeh-user') : null;
            const currentUser = storedUser ? JSON.parse(storedUser) : {};
            const userEmail = currentUser.email || 'system';
            
            await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    settings: newSettings,
                    userEmail: userEmail
                })
            });
        } catch (error) {
            console.error('Failed to update default currency:', error);
        }
    }, [settings]);

    const addCurrency = useCallback(async (currency: Currency) => {
        const newSettings = { 
            ...settings, 
            availableCurrencies: [...settings.availableCurrencies, currency] 
        };
        setSettingsState(newSettings);
        try {
            const storedUser = typeof window !== 'undefined' ? sessionStorage.getItem('temeh-user') : null;
            const currentUser = storedUser ? JSON.parse(storedUser) : {};
            const userEmail = currentUser.email || 'system';
            
            await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    settings: newSettings,
                    userEmail: userEmail
                })
            });
        } catch (error) {
            console.error('Failed to add currency:', error);
        }
    }, [settings]);

    const removeCurrency = useCallback(async (currencyCode: string) => {
        if (currencyCode === 'XAF') return; // Cannot remove default XAF currency
        const newSettings = {
            ...settings,
            availableCurrencies: settings.availableCurrencies.filter(c => c.code !== currencyCode),
            defaultCurrency: settings.defaultCurrency.code === currencyCode 
                ? { code: 'XAF', name: 'Central African Franc', symbol: 'FCFA', position: 'before' as const }
                : settings.defaultCurrency
        };
        setSettingsState(newSettings);
        try {
            const storedUser = typeof window !== 'undefined' ? sessionStorage.getItem('temeh-user') : null;
            const currentUser = storedUser ? JSON.parse(storedUser) : {};
            const userEmail = currentUser.email || 'system';
            
            await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    settings: newSettings,
                    userEmail: userEmail
                })
            });
        } catch (error) {
            console.error('Failed to remove currency:', error);
        }
    }, [settings]);

    // Tax Management Methods
    const toggleTax = useCallback(async (enabled: boolean) => {
        const newSettings = { ...settings, taxEnabled: enabled };
        setSettingsState(newSettings);
        try {
            const storedUser = typeof window !== 'undefined' ? sessionStorage.getItem('temeh-user') : null;
            const currentUser = storedUser ? JSON.parse(storedUser) : {};
            const userEmail = currentUser.email || 'system';
            
            await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    settings: newSettings,
                    userEmail: userEmail
                })
            });
        } catch (error) {
            console.error('Failed to toggle tax:', error);
        }
    }, [settings]);

    const addTaxRate = useCallback(async (taxRate: Omit<TaxRate, 'id'>) => {
        const newTaxRate = { ...taxRate, id: Date.now().toString() };
        const newSettings = { 
            ...settings, 
            taxRates: [...settings.taxRates, newTaxRate] 
        };
        setSettingsState(newSettings);
        try {
            const storedUser = typeof window !== 'undefined' ? sessionStorage.getItem('temeh-user') : null;
            const currentUser = storedUser ? JSON.parse(storedUser) : {};
            const userEmail = currentUser.email || 'system';
            
            await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    settings: newSettings,
                    userEmail: userEmail
                })
            });
        } catch (error) {
            console.error('Failed to add tax rate:', error);
        }
    }, [settings]);

    const updateTaxRate = useCallback(async (id: string, taxRate: Partial<TaxRate>) => {
        const newSettings = {
            ...settings,
            taxRates: settings.taxRates.map(rate => 
                rate.id === id ? { ...rate, ...taxRate } : rate
            )
        };
        setSettingsState(newSettings);
        try {
            const storedUser = typeof window !== 'undefined' ? sessionStorage.getItem('temeh-user') : null;
            const currentUser = storedUser ? JSON.parse(storedUser) : {};
            const userEmail = currentUser.email || 'system';
            
            await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    settings: newSettings,
                    userEmail: userEmail
                })
            });
        } catch (error) {
            console.error('Failed to update tax rate:', error);
        }
    }, [settings]);

    const deleteTaxRate = useCallback(async (id: string) => {
        const newSettings = {
            ...settings,
            taxRates: settings.taxRates.filter(rate => rate.id !== id)
        };
        setSettingsState(newSettings);
        try {
            const storedUser = typeof window !== 'undefined' ? sessionStorage.getItem('temeh-user') : null;
            const currentUser = storedUser ? JSON.parse(storedUser) : {};
            const userEmail = currentUser.email || 'system';
            
            await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    settings: newSettings,
                    userEmail: userEmail
                })
            });
        } catch (error) {
            console.error('Failed to delete tax rate:', error);
        }
    }, [settings]);

    const setDefaultTaxRate = useCallback(async (id: string) => {
        const newSettings = {
            ...settings,
            taxRates: settings.taxRates.map(rate => ({
                ...rate,
                isDefault: rate.id === id
            }))
        };
        setSettingsState(newSettings);
        try {
            const storedUser = typeof window !== 'undefined' ? sessionStorage.getItem('temeh-user') : null;
            const currentUser = storedUser ? JSON.parse(storedUser) : {};
            const userEmail = currentUser.email || 'system';
            
            await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    settings: newSettings,
                    userEmail: userEmail
                })
            });
        } catch (error) {
            console.error('Failed to set default tax rate:', error);
        }
    }, [settings]);

    // Discount Management Methods
    const toggleDiscount = useCallback(async (enabled: boolean) => {
        const newSettings = { ...settings, discountEnabled: enabled };
        setSettingsState(newSettings);
        try {
            const storedUser = typeof window !== 'undefined' ? sessionStorage.getItem('temeh-user') : null;
            const currentUser = storedUser ? JSON.parse(storedUser) : {};
            const userEmail = currentUser.email || 'system';
            
            await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    settings: newSettings,
                    userEmail: userEmail
                })
            });
        } catch (error) {
            console.error('Failed to toggle discount:', error);
        }
    }, [settings]);

    const addDiscountRule = useCallback(async (discountRule: Omit<DiscountRule, 'id'>) => {
        const newDiscountRule = { ...discountRule, id: Date.now().toString() };
        const newSettings = { 
            ...settings, 
            discountRules: [...settings.discountRules, newDiscountRule] 
        };
        setSettingsState(newSettings);
        try {
            const storedUser = typeof window !== 'undefined' ? sessionStorage.getItem('temeh-user') : null;
            const currentUser = storedUser ? JSON.parse(storedUser) : {};
            const userEmail = currentUser.email || 'system';
            
            await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    settings: newSettings,
                    userEmail: userEmail
                })
            });
        } catch (error) {
            console.error('Failed to add discount rule:', error);
        }
    }, [settings]);

    const updateDiscountRule = useCallback(async (id: string, discountRule: Partial<DiscountRule>) => {
        const newSettings = {
            ...settings,
            discountRules: settings.discountRules.map(rule => 
                rule.id === id ? { ...rule, ...discountRule } : rule
            )
        };
        setSettingsState(newSettings);
        try {
            const storedUser = typeof window !== 'undefined' ? sessionStorage.getItem('temeh-user') : null;
            const currentUser = storedUser ? JSON.parse(storedUser) : {};
            const userEmail = currentUser.email || 'system';
            
            await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    settings: newSettings,
                    userEmail: userEmail
                })
            });
        } catch (error) {
            console.error('Failed to update discount rule:', error);
        }
    }, [settings]);

    const deleteDiscountRule = useCallback(async (id: string) => {
        const newSettings = {
            ...settings,
            discountRules: settings.discountRules.filter(rule => rule.id !== id)
        };
        setSettingsState(newSettings);
        try {
            const storedUser = typeof window !== 'undefined' ? sessionStorage.getItem('temeh-user') : null;
            const currentUser = storedUser ? JSON.parse(storedUser) : {};
            const userEmail = currentUser.email || 'system';
            
            await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    settings: newSettings,
                    userEmail: userEmail
                })
            });
        } catch (error) {
            console.error('Failed to delete discount rule:', error);
        }
    }, [settings]);

    const toggleDiscountRule = useCallback(async (id: string, isActive: boolean) => {
        const newSettings = {
            ...settings,
            discountRules: settings.discountRules.map(rule => 
                rule.id === id ? { ...rule, isActive } : rule
            )
        };
        setSettingsState(newSettings);
        try {
            const storedUser = typeof window !== 'undefined' ? sessionStorage.getItem('temeh-user') : null;
            const currentUser = storedUser ? JSON.parse(storedUser) : {};
            const userEmail = currentUser.email || 'system';
            
            await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    settings: newSettings,
                    userEmail: userEmail
                })
            });
        } catch (error) {
            console.error('Failed to toggle discount rule:', error);
        }
    }, [settings]);

    useEffect(() => {
        // Fetch settings from API on mount
        fetchSettings();
    }, [fetchSettings]);

    return (
        <SettingsContext.Provider value={{ 
            settings, 
            setSettings: handleSetSettings, 
            updateSetting, 
            addTheme, 
            deleteTheme, 
            applyTheme,
            // Currency Management
            updateDefaultCurrency,
            addCurrency,
            removeCurrency,
            // Tax Management
            toggleTax,
            addTaxRate,
            updateTaxRate,
            deleteTaxRate,
            setDefaultTaxRate,
            // Discount Management
            toggleDiscount,
            addDiscountRule,
            updateDiscountRule,
            deleteDiscountRule,
            toggleDiscountRule
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

// This component ensures the theme is applied on the client side after hydration
export function SettingsInitializer() {
    const { settings } = useSettings();
    const { theme, resolvedTheme } = useTheme();
    
    useEffect(() => {
        const activeTheme = settings.themes.find(t => t.name === settings.activeTheme);
        if (activeTheme) {
            const root = document.documentElement;
            // Always apply the primary brand color
            root.style.setProperty('--primary', hexToHsl(activeTheme.colors.primary));
            root.style.setProperty('--sidebar-primary', hexToHsl(activeTheme.colors.primary));
            root.style.setProperty('--ring', hexToHsl(activeTheme.colors.primary));

            // Only override background/accent if it's a "Custom" theme or explicitly chosen.
            // For standard presets, we let globals.css handle the luminosity based on Light/Dark mode.
            const isStandardPreset = ["Navy", "Light", "Default"].includes(activeTheme.name);
            
            if (!isStandardPreset) {
                root.style.setProperty('--background', hexToHsl(activeTheme.colors.background));
                root.style.setProperty('--accent', hexToHsl(activeTheme.colors.accent));
            } else {
                // Remove inline overrides to let CSS classes take over
                root.style.removeProperty('--background');
                root.style.removeProperty('--accent');
            }
        }
    }, [settings.activeTheme, settings.themes, theme, resolvedTheme]);

    return null;
}
