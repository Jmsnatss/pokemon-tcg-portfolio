import type { Metadata } from 'next'
import Link from 'next/link'
import { Field } from '@/components/ui/Field'
import { Pokeball } from '@/components/ui/Pokeball'
import { CollectionItemCard } from '@/features/collection/CollectionItemCard'
import {
  fetchCollection,
  filterCollection,
  totalCostByCurrency,
  type CollectionFilters,
} from '@/features/collection/list'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Collection',
}

type SearchParams = Promise<{ q?: string; type?: string; sort?: string }>

const pick = <T extends string>(v: string | undefined, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback

export default async function CollectionPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const filters: CollectionFilters = {
    q: sp.q?.slice(0, 60),
    type: pick(sp.type, ['all', 'raw', 'graded'] as const, 'all'),
    sort: pick(sp.sort, ['newest', 'name', 'quantity'] as const, 'newest'),
  }

  const supabase = await createServerSupabaseClient()
  const all = await fetchCollection(supabase)
  const rows = filterCollection(all, filters)
  const totalCards = rows.reduce((n, r) => n + r.quantity, 0)
  const costs = Object.entries(totalCostByCurrency(rows))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Collection</h1>
        <p className="text-sm text-[var(--pv-muted)] mt-1">
          {all.length === 0
            ? 'Your collection is empty.'
            : `${totalCards} card${totalCards === 1 ? '' : 's'} in ${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}` +
              (costs.length ? ` · cost basis ${costs.map(([c, v]) => `${v.toFixed(2)} ${c}`).join(' + ')}` : '')}
        </p>
      </div>

      <form method="get" className="pv-panel grid gap-3 p-4 sm:grid-cols-[1fr_150px_150px_auto] sm:items-end">
        <Field label="Search">
          <input name="q" defaultValue={filters.q} placeholder="Card name or set" className="pv-control" />
        </Field>
        <Field label="Show">
          <select name="type" defaultValue={filters.type} className="pv-control">
            <option value="all">All cards</option>
            <option value="raw">Raw only</option>
            <option value="graded">Graded only</option>
          </select>
        </Field>
        <Field label="Sort by">
          <select name="sort" defaultValue={filters.sort} className="pv-control">
            <option value="newest">Newest first</option>
            <option value="name">Name (A-Z)</option>
            <option value="quantity">Most copies</option>
          </select>
        </Field>
        <button type="submit" className="pv-btn pv-btn-gold h-[38px]">Apply</button>
      </form>

      {all.length === 0 ? (
        <div className="pv-panel flex flex-col items-center gap-4 p-12 text-center">
          <Pokeball className="h-14 w-14" />
          <p className="text-[var(--pv-muted)]">Your Pokédex of cards is empty. Time to start your journey!</p>
          <Link href="/market" className="pv-btn pv-btn-primary">Find cards in the Market</Link>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[var(--pv-muted)]">No entries match your filters.</p>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {rows.map((r, i) => (
            <CollectionItemCard key={r.id} item={r} index={i} />
          ))}
        </ul>
      )}
    </div>
  )
}
