import type { SupabaseClient } from '@supabase/supabase-js'
import { tcgdex } from '@/lib/tcgdex/client'
import { fetchGradedByTcgplayerId, isJustTcgConfigured, remainingDailyBudget } from '@/lib/pricing/justtcg'
import type { CollectionRow } from '@/features/collection/list'
import { mapPrintingFromDb, selectGradedQuote, type GradedQuote } from './graded'

const FRESH_MS = 24 * 60 * 60 * 1000
const GRADED_CONDITION = 'graded'

export type RefreshSummary = {
  configured: boolean
  updated: number
  skippedFresh: number
  remainingToCheck: number
  failures: { name: string; reason: string }[]
  budgetLeft: number
}

/** Cached graded quotes for the given card_variant ids (public-read table). */
export async function loadCachedGradedQuotes(
  supabase: SupabaseClient,
  variantIds: string[]
): Promise<{ quotes: Map<string, GradedQuote>; fetchedAt: Map<string, string> }> {
  const quotes = new Map<string, GradedQuote>()
  const fetchedAt = new Map<string, string>()
  if (variantIds.length === 0) return { quotes, fetchedAt }
  const { data, error } = await supabase
    .from('current_prices')
    .select('card_variant_id, currency, price, observed_at, fetched_at, price_sources!inner(name)')
    .in('card_variant_id', variantIds)
    .eq('price_sources.name', 'justtcg')
    .eq('condition', GRADED_CONDITION)
    .eq('price_type', 'market')
  if (error) throw new Error(`current_prices read failed: ${error.message}`)
  for (const r of (data ?? []) as unknown as {
    card_variant_id: string
    currency: string
    price: string
    observed_at: string
    fetched_at: string
  }[]) {
    quotes.set(r.card_variant_id, { price: Number(r.price), currency: r.currency, observedAt: r.observed_at })
    fetchedAt.set(r.card_variant_id, r.fetched_at)
  }
  return { quotes, fetchedAt }
}

/**
 * Refreshes cached graded prices for the user's slabs from JustTCG (free tier).
 * Only stale or missing entries are fetched, at most `max` per call.
 */
export async function refreshGradedPrices(
  userClient: SupabaseClient,
  admin: SupabaseClient,
  rows: CollectionRow[],
  max = 5
): Promise<RefreshSummary> {
  const summary: RefreshSummary = {
    configured: isJustTcgConfigured(),
    updated: 0,
    skippedFresh: 0,
    remainingToCheck: 0,
    failures: [],
    budgetLeft: remainingDailyBudget(),
  }
  if (!summary.configured) return summary

  const graded = new Map<string, CollectionRow>()
  for (const r of rows) if (r.is_graded && r.grading_company && r.grade !== null) graded.set(r.card_variant_id, r)

  const { fetchedAt } = await loadCachedGradedQuotes(userClient, [...graded.keys()])
  const now = Date.now()
  const todo = [...graded.values()].filter((r) => {
    const t = fetchedAt.get(r.card_variant_id)
    const fresh = t && now - new Date(t).getTime() < FRESH_MS
    if (fresh) summary.skippedFresh += 1
    return !fresh
  })

  const { data: source, error: srcErr } = await admin.from('price_sources').select('id').eq('name', 'justtcg').single()
  if (srcErr || !source) throw new Error('price_sources row "justtcg" is missing')

  const batch = todo.slice(0, max)
  summary.remainingToCheck = todo.length - batch.length

  for (const r of batch) {
    const card = r.card_variants?.cards
    const name = card?.name ?? 'Unknown card'
    if (!card) continue
    const full = await tcgdex.getCard(card.provider_id)
    const productId = full?.variants_detailed?.map((v) => v.thirdParty?.tcgplayer).find((id) => typeof id === 'number')
    if (!productId) {
      summary.failures.push({ name, reason: 'No TCGplayer product id in catalog' })
      continue
    }
    const res = await fetchGradedByTcgplayerId(String(productId), r.grading_company!)
    if (!res.ok) {
      summary.failures.push({ name, reason: res.reason })
      if (/budget|rate limit|rejected the API key/.test(res.reason)) break
      continue
    }
    const sel = selectGradedQuote(res.cards, {
      company: r.grading_company!,
      grade: Number(r.grade),
      printing: mapPrintingFromDb(r.card_variants?.printing_type),
    })
    if (!sel.ok) {
      summary.failures.push({ name: `${name} (${r.grading_company} ${r.grade})`, reason: sel.reason })
      continue
    }
    const { error } = await admin.from('current_prices').upsert(
      {
        card_variant_id: r.card_variant_id,
        price_source_id: source.id,
        currency: sel.quote.currency,
        price_type: 'market',
        condition: GRADED_CONDITION,
        price: sel.quote.price,
        observed_at: sel.quote.observedAt ?? new Date().toISOString(),
        fetched_at: new Date().toISOString(),
        is_stale: false,
      },
      { onConflict: 'card_variant_id,price_source_id,currency,price_type,condition' }
    )
    if (error) throw new Error(`current_prices upsert failed: ${error.message}`)
    summary.updated += 1
  }
  summary.budgetLeft = remainingDailyBudget()
  return summary
}
