import type { JustTcgCard, JustTcgVariant } from '@/lib/pricing/justtcg'
import type { SupportedPrintingType } from '@/types/catalog'

export const GRADED_SOURCE = 'JustTCG (recent sale)'

export type GradedQuote = {
  price: number
  currency: string
  /** ISO timestamp of the sale the price is based on. */
  observedAt: string | null
}

export type GradedSelection = { ok: true; quote: GradedQuote } | { ok: false; reason: string }

const PRINTING_MAP: Record<string, SupportedPrintingType> = {
  normal: 'standard',
  holofoil: 'holo',
  'reverse holofoil': 'reverse_holo',
  '1st edition holofoil': 'first_edition',
  '1st edition normal': 'first_edition',
  '1st edition': 'first_edition',
}

export function mapJustTcgPrinting(printing: string | null): SupportedPrintingType | null {
  return printing ? PRINTING_MAP[printing.trim().toLowerCase()] ?? null : null
}

const iso = (s: number | null): string | null => (s ? new Date(s * 1000).toISOString() : null)

/**
 * Picks the one graded variant that exactly matches company + grade + printing.
 * Special tiers (Black Label, Pristine) and qualifiers (e.g. OC) are priced
 * separately by JustTCG and are never used for a plain grade. If a printing
 * can't be matched exactly, no price is returned.
 */
export function selectGradedQuote(
  cards: JustTcgCard[],
  want: { company: string; grade: number; printing: SupportedPrintingType }
): GradedSelection {
  if (cards.length !== 1) {
    return { ok: false, reason: cards.length === 0 ? 'Card not found at JustTCG' : 'Ambiguous card match' }
  }

  const graded = cards[0].variants.filter(
    (v: JustTcgVariant) =>
      v.type === 'graded' &&
      v.grading?.company === want.company &&
      v.grading.grade === want.grade &&
      !v.grading.qualifier &&
      !v.grading.grade_label
  )
  if (graded.length === 0) return { ok: false, reason: `No ${want.company} ${want.grade} listing at JustTCG` }

  const exact = graded.filter((v) => mapJustTcgPrinting(v.printing) === want.printing)
  const candidates = exact.length > 0 ? exact : graded.length === 1 && v0Unlabelled(graded[0]) ? graded : []
  if (candidates.length !== 1) return { ok: false, reason: 'No exact printing match' }

  const market = candidates[0].markets.find((m) => m.region === 'NA')
  if (!market) return { ok: false, reason: 'No North America market data' }
  if (market.price === null || market.price_status !== 'current') {
    return {
      ok: false,
      reason: market.price_status === 'expired' ? 'Last sale is older than 90 days' : 'This slab has no recorded sale yet',
    }
  }
  return {
    ok: true,
    quote: { price: market.price, currency: market.currency, observedAt: iso(market.last_sale_at ?? market.updated_at) },
  }
}

const v0Unlabelled = (v: JustTcgVariant): boolean => v.printing === null

const DB_PRINTINGS: SupportedPrintingType[] = ['standard', 'reverse_holo', 'holo', 'first_edition', 'promo']

/** Narrows a stored printing_type string to a supported printing (defaults to standard). */
export function mapPrintingFromDb(value: string | null | undefined): SupportedPrintingType {
  return DB_PRINTINGS.find((p) => p === value) ?? 'standard'
}
