import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchCollection, type CollectionRow } from '@/features/collection/list'
import { fetchPricingByCard } from '@/features/pricing/catalog-prices'
import { loadCachedGradedQuotes } from '@/features/pricing/sync-graded'
import { getMarketQuote, PRICE_SOURCE } from '@/features/pricing/tcgplayer'
import { getLatestRates } from '@/lib/currency/frankfurter'
import { mapPrintingFromDb } from '@/features/pricing/graded'
import { totalCost, valueCollection } from './valuation'

export type SyncSummary = {
  usersProcessed: number
  variantsPriced: number
  historyRows: number
  snapshots: number
  skippedNoPrice: number
}

const SOURCE_NAME = 'tcgplayer'
const NM = 'near_mint'

async function ensurePriceSource(admin: SupabaseClient): Promise<string> {
  const { data, error } = await admin
    .from('price_sources')
    .upsert({ name: SOURCE_NAME, display_name: PRICE_SOURCE, base_url: 'https://tcgdex.dev' }, { onConflict: 'name' })
    .select('id')
    .single()
  if (error || !data) throw new Error(`price_sources upsert failed: ${error?.message}`)
  return data.id
}

/**
 * Records current prices, price history and portfolio snapshots using the
 * service-role client. Pass `userId` to limit it to one user's collection.
 * Only observed values are stored: cards without an exact price are skipped.
 */
export async function syncPrices(admin: SupabaseClient, opts: { userId?: string } = {}): Promise<SyncSummary> {
  const summary: SyncSummary = { usersProcessed: 0, variantsPriced: 0, historyRows: 0, snapshots: 0, skippedNoPrice: 0 }

  const { data: job } = await admin
    .from('sync_jobs')
    .insert({ job_type: 'price_sync', status: 'running', started_at: new Date().toISOString() })
    .select('id')
    .single()

  try {
    const rows = await fetchCollection(admin, opts.userId)
    const sourceId = await ensurePriceSource(admin)
    const providerIds = rows.flatMap((r) => (r.card_variants?.cards ? [r.card_variants.cards.provider_id] : []))
    const pricing = await fetchPricingByCard(providerIds)

    const rawVariants = new Map<string, CollectionRow>()
    for (const r of rows) if (!r.is_graded && r.card_variants?.cards) rawVariants.set(r.card_variant_id, r)

    const prices: Record<string, unknown>[] = []
    const history: Record<string, unknown>[] = []
    const fetchedAt = new Date().toISOString()
    for (const [variantId, r] of rawVariants) {
      const q = getMarketQuote(pricing.get(r.card_variants!.cards!.provider_id), mapPrintingFromDb(r.card_variants!.printing_type))
      if (!q.available) {
        summary.skippedNoPrice += 1
        continue
      }
      const base = {
        card_variant_id: variantId,
        price_source_id: sourceId,
        currency: q.quote.currency,
        price_type: 'market',
        condition: NM,
        price: q.quote.price,
      }
      prices.push({ ...base, observed_at: q.quote.observedAt ?? fetchedAt, fetched_at: fetchedAt, is_stale: false })
      if (q.quote.observedAt) history.push({ ...base, observed_at: q.quote.observedAt, fetched_at: fetchedAt })
    }

    if (prices.length) {
      const { error } = await admin
        .from('current_prices')
        .upsert(prices, { onConflict: 'card_variant_id,price_source_id,currency,price_type,condition' })
      if (error) throw new Error(`current_prices upsert failed: ${error.message}`)
      summary.variantsPriced = prices.length
    }
    if (history.length) {
      const { error } = await admin
        .from('price_history')
        .upsert(history, { onConflict: 'card_variant_id,price_source_id,currency,price_type,condition,observed_at', ignoreDuplicates: true })
      if (error) throw new Error(`price_history upsert failed: ${error.message}`)
      summary.historyRows = history.length
    }

    const fx = await getLatestRates('USD')
    const today = new Date().toISOString().slice(0, 10)
    const byUser = new Map<string, CollectionRow[]>()
    for (const r of rows) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r])

    for (const [userId, userRows] of byUser) {
      summary.usersProcessed += 1
      const graded = await loadCachedGradedQuotes(admin, userRows.filter((r) => r.is_graded).map((r) => r.card_variant_id))
      const v = valueCollection(userRows, pricing, fx?.rates ?? null, 'USD', { quotes: graded.quotes, unavailableReason: 'No graded price cached' })
      if (v.totalValue === null) continue

      const cost = totalCost(userRows, fx?.rates ?? null, 'USD')
      const { error } = await admin.from('portfolio_snapshots').upsert(
        {
          user_id: userId,
          snapshot_date: today,
          currency: 'USD',
          total_value: v.totalValue,
          total_cost: cost,
          card_count: userRows.reduce((n, r) => n + r.quantity, 0),
          item_count: userRows.length,
          metadata: { pricedEntries: v.pricedEntries, totalEntries: v.totalEntries, source: PRICE_SOURCE },
        },
        { onConflict: 'user_id,snapshot_date,currency' }
      )
      if (error) throw new Error(`portfolio_snapshots upsert failed: ${error.message}`)
      summary.snapshots += 1
    }

    if (job) {
      await admin
        .from('sync_jobs')
        .update({ status: 'success', completed_at: new Date().toISOString(), items_processed: prices.length, items_failed: summary.skippedNoPrice, metadata: summary })
        .eq('id', job.id)
    }
    return summary
  } catch (err) {
    if (job) {
      await admin
        .from('sync_jobs')
        .update({ status: 'failed', completed_at: new Date().toISOString(), error_message: err instanceof Error ? err.message.slice(0, 200) : 'unknown error' })
        .eq('id', job.id)
    }
    throw err
  }
}
