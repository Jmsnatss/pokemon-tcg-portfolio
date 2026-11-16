/**
 * Frankfurter exchange rate client
 * Documentation: https://frankfurter.dev/
 * Free, no API key required. Data from European Central Bank.
 */

import type { SupportedCurrency } from '@/types'

const BASE_URL = process.env.FRANKFURTER_BASE_URL ?? 'https://api.frankfurter.dev'

export type ExchangeRateResponse = {
  amount: number
  base: string
  date: string
  rates: Record<string, number>
}

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = ['USD', 'PHP', 'EUR', 'JPY']

export async function getLatestRates(
  baseCurrency: SupportedCurrency = 'USD',
  targets: SupportedCurrency[] = SUPPORTED_CURRENCIES
): Promise<ExchangeRateResponse | null> {
  const targetParam = targets.filter((c) => c !== baseCurrency).join(',')
  const url = `${BASE_URL}/latest?from=${baseCurrency}&to=${targetParam}`

  try {
    const res = await fetch(url, {
      next: { revalidate: 86400 },  // Cache for 24 hours
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      console.error(`[Frankfurter] ${res.status} ${res.statusText}`)
      return null
    }

    return res.json()
  } catch (err) {
    console.error('[Frankfurter] Network error:', err)
    return null
  }
}

/**
 * Convert an amount from one currency to another using provided rates.
 * Returns null if the conversion is not possible.
 */
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, Record<string, number>>
): number | null {
  if (fromCurrency === toCurrency) return amount

  // Try direct rate
  const direct = rates[fromCurrency]?.[toCurrency]
  if (direct !== undefined) return amount * direct

  // Try inverse
  const inverse = rates[toCurrency]?.[fromCurrency]
  if (inverse !== undefined) return amount / inverse

  return null
}
