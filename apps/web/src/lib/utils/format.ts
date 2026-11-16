import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Format a numeric string or number as currency.
 * Uses Intl.NumberFormat — always uses the actual value, never fabricates it.
 */
export function formatCurrency(
  amount: string | number | null | undefined,
  currency: string = 'USD',
  options: Intl.NumberFormatOptions = {}
): string {
  if (amount === null || amount === undefined || amount === '') return '—'

  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '—'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(num)
}

/**
 * Format a date string in a readable format.
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Calculate gain/loss percentage.
 * Returns null if inputs are invalid or cost is zero.
 */
export function calculateGainPercent(
  currentValue: number,
  purchaseCost: number
): number | null {
  if (!purchaseCost || purchaseCost === 0) return null
  return ((currentValue - purchaseCost) / purchaseCost) * 100
}

/**
 * Truncate text to a maximum length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 1) + '…'
}

/**
 * Build a card image URL from the TCGdex image base path.
 */
export function buildCardImageUrl(
  imageBase: string | null | undefined,
  quality: 'high' | 'low' = 'high'
): string | null {
  if (!imageBase) return null
  return `${imageBase}/${quality}.webp`
}

/**
 * Generate a stable key for a collection item (for React list rendering).
 */
export function collectionItemKey(id: string): string {
  return `ci-${id}`
}
