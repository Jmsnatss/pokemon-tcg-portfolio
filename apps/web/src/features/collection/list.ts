import type { SupabaseClient } from '@supabase/supabase-js'

export type CollectionRow = {
  id: string
  quantity: number
  condition: string
  is_graded: boolean
  grading_company: string | null
  grade: number | null
  cert_number: string | null
  purchase_price: string | null
  purchase_currency: string | null
  purchase_date: string | null
  notes: string | null
  created_at: string
  card_variants: {
    printing_type: string
    cards: {
      provider_id: string
      name: string
      collector_number: string
      rarity: string | null
      image_url: string | null
      card_sets: { name: string } | null
    } | null
  } | null
}

export type CollectionFilters = {
  q?: string
  type?: 'all' | 'raw' | 'graded'
  sort?: 'newest' | 'name' | 'quantity'
}

const SELECT = `
  id, quantity, condition, is_graded, grading_company, grade, cert_number,
  purchase_price, purchase_currency, purchase_date, notes, created_at,
  card_variants (
    printing_type,
    cards ( provider_id, name, collector_number, rarity, image_url, card_sets ( name ) )
  )
`

/** Fetches the signed-in user's items. RLS restricts rows to the owner. */
export async function fetchCollection(supabase: SupabaseClient): Promise<CollectionRow[]> {
  const { data, error } = await supabase
    .from('collection_items')
    .select(SELECT)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`collection fetch failed: ${error.message}`)
  return (data ?? []) as unknown as CollectionRow[]
}

const cardName = (r: CollectionRow): string => r.card_variants?.cards?.name ?? ''

/** Pure filter/sort used by the Collection page. */
export function filterCollection(rows: CollectionRow[], f: CollectionFilters): CollectionRow[] {
  const q = f.q?.trim().toLowerCase()
  const out = rows.filter((r) => {
    if (f.type === 'raw' && r.is_graded) return false
    if (f.type === 'graded' && !r.is_graded) return false
    if (!q) return true
    const c = r.card_variants?.cards
    return [c?.name, c?.provider_id, c?.card_sets?.name].some((s) => s?.toLowerCase().includes(q))
  })
  if (f.sort === 'name') out.sort((a, b) => cardName(a).localeCompare(cardName(b)))
  else if (f.sort === 'quantity') out.sort((a, b) => b.quantity - a.quantity)
  return out
}

/** Sums purchase cost per currency; never mixes currencies. */
export function totalCostByCurrency(rows: CollectionRow[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const r of rows) {
    if (r.purchase_price == null) continue
    const cur = r.purchase_currency ?? 'USD'
    totals[cur] = (totals[cur] ?? 0) + Number(r.purchase_price) * r.quantity
  }
  return totals
}
