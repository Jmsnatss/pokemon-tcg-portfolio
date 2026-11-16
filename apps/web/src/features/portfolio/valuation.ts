import type { CollectionRow } from '@/features/collection/list'
import { GRADED_SOURCE, type GradedQuote } from '@/features/pricing/graded'
import { priceItem, type ItemPriceResult } from '@/features/pricing/tcgplayer'
import type { TCGdexCard } from '@/lib/tcgdex/client'
import type { SupportedPrintingType } from '@/types/catalog'

type Pricing = TCGdexCard['pricing']

/** Rates quoted as units of each currency per 1 USD, e.g. { PHP: 58.2 }. */
export type UsdRates = Record<string, number>

export type ItemValuation = {
  result: ItemPriceResult
  /** Per-card market price in the display currency, if priced. */
  unit: number | null
  /** unit * quantity, only when the entry counts toward the total. */
  line: number | null
}

export type PortfolioValuation = {
  items: Map<string, ItemValuation>
  totalValue: number | null
  pricedEntries: number
  totalEntries: number
  /** Gain/loss over entries that have both a market value and a purchase price. */
  gain: number | null
  gainPercent: number | null
  costBasis: number | null
  latestObservedAt: string | null
}

export function convert(amount: number, from: string, to: string, usdRates: UsdRates | null): number | null {
  if (from === to) return amount
  const rate = (c: string): number | null => (c === 'USD' ? 1 : usdRates?.[c] ?? null)
  const f = rate(from)
  const t = rate(to)
  if (f === null || t === null || f === 0) return null
  return (amount / f) * t
}

export function valueCollection(
  rows: CollectionRow[],
  pricingByCard: Map<string, Pricing>,
  usdRates: UsdRates | null,
  displayCurrency: string,
  graded: { quotes: Map<string, GradedQuote>; unavailableReason: string } = { quotes: new Map(), unavailableReason: 'No graded price available' }
): PortfolioValuation {
  const items = new Map<string, ItemValuation>()
  let total = 0
  let priced = 0
  let pairedValue = 0
  let pairedCost = 0
  let paired = 0
  let latest: string | null = null

  for (const r of rows) {
    const card = r.card_variants?.cards
    const gradedQuote = r.is_graded ? graded.quotes.get(r.card_variant_id) : undefined
    const result: ItemPriceResult = r.is_graded
      ? gradedQuote
        ? {
            status: 'priced',
            quote: {
              price: gradedQuote.price,
              low: null,
              mid: null,
              high: null,
              currency: gradedQuote.currency,
              observedAt: gradedQuote.observedAt,
              matchedKey: 'graded',
              source: GRADED_SOURCE,
            },
          }
        : { status: 'unavailable', reason: graded.unavailableReason }
      : card
      ? priceItem(pricingByCard.get(card.provider_id), {
          printing: (r.card_variants?.printing_type ?? 'standard') as SupportedPrintingType,
          isGraded: r.is_graded,
          condition: r.condition,
        })
      : { status: 'unavailable', reason: 'Card data missing' }

    let unit: number | null = null
    let line: number | null = null
    if (result.status === 'priced' || result.status === 'reference') {
      unit = convert(result.quote.price, result.quote.currency, displayCurrency, usdRates)
    }
    if (result.status === 'priced' && unit !== null) {
      line = unit * r.quantity
      total += line
      priced += 1
      const obs = result.quote.observedAt
      if (obs && (!latest || obs > latest)) latest = obs
      if (r.purchase_price != null) {
        const cost = convert(Number(r.purchase_price) * r.quantity, r.purchase_currency ?? 'USD', displayCurrency, usdRates)
        if (cost !== null) {
          pairedValue += line
          pairedCost += cost
          paired += 1
        }
      }
    }
    items.set(r.id, { result, unit, line })
  }

  return {
    items,
    totalValue: priced > 0 ? total : null,
    pricedEntries: priced,
    totalEntries: rows.length,
    gain: paired > 0 ? pairedValue - pairedCost : null,
    gainPercent: paired > 0 && pairedCost > 0 ? ((pairedValue - pairedCost) / pairedCost) * 100 : null,
    costBasis: paired > 0 ? pairedCost : null,
    latestObservedAt: latest,
  }
}
