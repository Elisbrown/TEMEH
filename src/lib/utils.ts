import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Currency } from "@/context/settings-context"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as currency based on the provided currency settings
 * @param amount - The amount to format
 * @param currency - The currency settings to use
 * @param locale - The locale to use for formatting (defaults to 'en-US')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: Currency, locale: string = 'en-US'): string {
  const formattedAmount = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)

  if (currency.position === 'before') {
    return `${currency.symbol} ${formattedAmount}`
  } else {
    return `${formattedAmount} ${currency.symbol}`
  }
}

/**
 * Calculate tax amount based on subtotal and tax rate
 * @param subtotal - The subtotal amount
 * @param taxRate - The tax rate as a percentage (e.g., 19 for 19%)
 * @returns The tax amount
 */
export function calculateTax(subtotal: number, taxRate: number): number {
  return (subtotal * taxRate) / 100
}

/**
 * Calculate discount amount based on subtotal and discount rule
 * @param subtotal - The subtotal amount
 * @param discountType - The type of discount ('percentage' or 'fixed')
 * @param discountValue - The discount value
 * @returns The discount amount
 */
export function calculateDiscount(subtotal: number, discountType: 'percentage' | 'fixed', discountValue: number): number {
  if (discountType === 'percentage') {
    return (subtotal * discountValue) / 100
  } else {
    return Math.min(discountValue, subtotal) // Fixed amount, but cannot exceed subtotal
  }
}

/**
 * Calculate total amount including tax and discount
 * @param subtotal - The subtotal amount
 * @param taxRate - The tax rate as a percentage
 * @param discountType - The type of discount
 * @param discountValue - The discount value
 * @returns Object containing breakdown of amounts
 */
export function calculateTotal(
  subtotal: number, 
  taxRate: number = 0, 
  discountType: 'percentage' | 'fixed' = 'percentage', 
  discountValue: number = 0
): {
  subtotal: number
  discount: number
  tax: number
  total: number
} {
  const discount = calculateDiscount(subtotal, discountType, discountValue)
  const amountAfterDiscount = subtotal - discount
  const tax = calculateTax(amountAfterDiscount, taxRate)
  const total = amountAfterDiscount + tax

  return {
    subtotal,
    discount,
    tax,
    total
  }
}

export function hexToHsl(hex: string): string {
    if (!hex.startsWith("#")) {
        return hex; // Not a valid hex, return as is
    }
    
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }

    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return `${h} ${s}% ${l}%`;
}
