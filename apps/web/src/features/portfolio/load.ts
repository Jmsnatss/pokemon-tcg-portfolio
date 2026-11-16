import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchCollection, type CollectionRow } from '@/features/collection/list'
import { fetchPricingByCard } from '@/features/pricing/catalog-prices'
import { loadCachedGradedQuotes } from '@/features/pricing/sync-graded'
import { getLatestRates, type ExchangeRateResponse } from '@/lib/currency/frankfurter'
import { isJustTcgConfigured } from '@/lib/pricing/justtcg'
import { totalCost, valueCollection, type PortfolioValuation } from './valuation'

export type LoadedPortfolio = {
  rows: CollectionRow[]
  currency: string
  fx: ExchangeRateResponse | null
  fxMissing: boolean
  valuation: PortfolioValuation
  cost: number | null
  justTcg: boolean
  hasGraded: boolean
}

/** Loads the signed-in user's collection and values it in the requested display currency. */
export async function loadPortfolio(supabase: SupabaseClient, currency: string): Promise<LoadedPortfolio> {
  const rows = await fetchCollection(supabase)
  const providerIds = rows.flatMap((r) => (r.card_variants?.cards ? [r.card_variants.cards.provider_id] : []))
  const [pricing, fx] = await Promise.all([
    fetchPricingByCard(providerIds),
    currency === 'USD' ? Promise.resolve(null) : getLatestRates('USD'),
  ])
  const usdRates = fx?.rates ?? null
  const justTcg = isJustTcgConfigured()
  const graded = await loadCachedGradedQuotes(supabase, rows.filter((r) => r.is_graded).map((r) => r.card_variant_id))
  const valuation = valueCollection(rows, pricing, usdRates, currency, {
    quotes: graded.quotes,
    unavailableReason: justTcg ? 'Not fetched yet: use "Refresh graded prices"' : 'Graded prices need a free JustTCG API key',
  })
  return {
    rows,
    currency,
    fx,
    fxMissing: currency !== 'USD' && !usdRates,
    valuation,
    cost: totalCost(rows, usdRates, currency),
    justTcg,
    hasGraded: rows.some((r) => r.is_graded),
  }
}
