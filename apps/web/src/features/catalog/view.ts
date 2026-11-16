import type { TCGdexCardSummary } from '@/lib/tcgdex/client'

export const PAGE_SIZE = 30

export type CatalogView = {
  owned: 'all' | 'owned' | 'missing'
  sort: 'name' | 'number'
  page: number
}

export type PagedCards = {
  items: TCGdexCardSummary[]
  total: number
  hasMore: boolean
}

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

/**
 * Applies the portfolio-status filter, sorting and paging to a catalog match list.
 * `ownedQty` maps card provider ids to the quantity the user owns.
 */
export function applyCatalogView(
  cards: TCGdexCardSummary[],
  ownedQty: Map<string, number>,
  view: CatalogView,
  pageSize = PAGE_SIZE
): PagedCards {
  const filtered = cards.filter((c) => {
    if (view.owned === 'owned') return ownedQty.has(c.id)
    if (view.owned === 'missing') return !ownedQty.has(c.id)
    return true
  })
  const sorted = [...filtered].sort((a, b) =>
    view.sort === 'number' ? collator.compare(a.id.split('-')[0], b.id.split('-')[0]) || collator.compare(a.localId, b.localId) : collator.compare(a.name, b.name) || collator.compare(a.id, b.id)
  )
  const end = view.page * pageSize
  return { items: sorted.slice(0, end), total: sorted.length, hasMore: sorted.length > end }
}

/** Client-side filters over already loaded results (price data is only known for loaded cards). */
export function filterByPrice<T extends { price?: { amount: number } | null }>(
  items: T[],
  min: number | null,
  max: number | null
): T[] {
  if (min === null && max === null) return items
  return items.filter((i) => {
    if (!i.price) return false
    return (min === null || i.price.amount >= min) && (max === null || i.price.amount <= max)
  })
}

export function sortByPrice<T extends { price?: { amount: number } | null }>(items: T[], dir: 'asc' | 'desc'): T[] {
  const factor = dir === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    if (!a.price && !b.price) return 0
    if (!a.price) return 1
    if (!b.price) return -1
    return (a.price.amount - b.price.amount) * factor
  })
}
