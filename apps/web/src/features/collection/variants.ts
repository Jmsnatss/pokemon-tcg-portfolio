import type { TCGdexCard } from '@/lib/tcgdex/client'
import type { SupportedPrintingType } from '@/types/catalog'

const VARIANT_MAP: [keyof NonNullable<TCGdexCard['variants']>, SupportedPrintingType][] = [
  ['normal', 'standard'],
  ['reverse', 'reverse_holo'],
  ['holo', 'holo'],
  ['firstEdition', 'first_edition'],
  ['wPromo', 'promo'],
]

/**
 * Returns the printings TCGdex reports for a card. Never guesses: if the
 * catalog reports no variant data, the result is an empty list.
 */
export function getAvailablePrintings(card: Pick<TCGdexCard, 'variants'>): SupportedPrintingType[] {
  const v = card.variants
  if (!v) return []
  return VARIANT_MAP.filter(([key]) => v[key] === true).map(([, printing]) => printing)
}
