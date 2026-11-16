import type { TCGdexCard } from '@/lib/tcgdex/client'
import type { SupportedPrintingType } from '@/types/catalog'

export const PRICE_SOURCE = 'TCGplayer (via TCGdex)'

export type MarketQuote = {
  price: number
  low: number | null
  mid: number | null
  high: number | null
  currency: string
  observedAt: string | null
  /** The TCGplayer printing key that was matched, e.g. "reverse-holofoil". */
  matchedKey: string
}

export type QuoteResult =
  | { available: true; quote: MarketQuote }
  | { available: false; reason: string }

type Pricing = NonNullable<TCGdexCard['pricing']>

type TcgPlayerEntry = { lowPrice?: number | null; midPrice?: number | null; highPrice?: number | null; marketPrice?: number | null }

const KEY_CANDIDATES: Record<SupportedPrintingType, string[]> = {
  standard: ['normal'],
  reverse_holo: ['reverse-holofoil'],
  holo: ['holofoil'],
  first_edition: ['1st-edition-holofoil', '1st-edition-normal'],
  promo: ['normal', 'holofoil'],
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/**
 * Resolves the TCGplayer NM market price for an exact printing.
 * Never substitutes a different printing: when several keys could match
 * (1st edition, promo) the result is only used if exactly one exists.
 */
export function getMarketQuote(pricing: Pricing | undefined, printing: SupportedPrintingType): QuoteResult {
  const tcg = pricing?.tcgplayer
  if (!tcg) return { available: false, reason: 'No TCGplayer price data for this card' }

  const present = KEY_CANDIDATES[printing].filter((k) => {
    const e = tcg[k] as TcgPlayerEntry | undefined
    return e && typeof e === 'object' && num(e.marketPrice) !== null
  })
  if (present.length === 0) return { available: false, reason: 'No market price for this printing' }
  if (present.length > 1) return { available: false, reason: 'Ambiguous printing match; not guessing' }

  const key = present[0]
  const e = tcg[key] as TcgPlayerEntry
  return {
    available: true,
    quote: {
      price: e.marketPrice as number,
      low: num(e.lowPrice),
      mid: num(e.midPrice),
      high: num(e.highPrice),
      currency: tcg.unit ?? 'USD',
      observedAt: tcg.updated ?? null,
      matchedKey: key,
    },
  }
}

export type ItemPriceInput = {
  printing: SupportedPrintingType
  isGraded: boolean
  condition: string
}

export type ItemPriceResult =
  | { status: 'priced'; quote: MarketQuote }
  | { status: 'reference'; quote: MarketQuote; note: string }
  | { status: 'unavailable'; reason: string }

/**
 * Prices one collection entry. TCGplayer market price is a Near Mint price, so
 * other conditions get a labelled reference only and graded slabs get none.
 */
export function priceItem(pricing: Pricing | undefined, item: ItemPriceInput): ItemPriceResult {
  if (item.isGraded) {
    return { status: 'unavailable', reason: 'Graded prices are not provided by this source' }
  }
  const q = getMarketQuote(pricing, item.printing)
  if (!q.available) return { status: 'unavailable', reason: q.reason }
  if (item.condition !== 'near_mint') {
    return { status: 'reference', quote: q.quote, note: 'Near Mint reference; not counted in total' }
  }
  return { status: 'priced', quote: q.quote }
}

const PRINTING_ORDER: SupportedPrintingType[] = ['standard', 'reverse_holo', 'holo', 'first_edition', 'promo']

/** First printing (in a fixed order) that has an exact market quote; used for grid headlines. */
export function getHeadlineQuote(
  pricing: Pricing | undefined
): { printing: SupportedPrintingType; quote: MarketQuote } | null {
  for (const printing of PRINTING_ORDER) {
    const r = getMarketQuote(pricing, printing)
    if (r.available) return { printing, quote: r.quote }
  }
  return null
}
