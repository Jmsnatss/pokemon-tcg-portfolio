import type { Metadata } from 'next'
import Link from 'next/link'
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

  const fieldClass =
    'rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Collection</h1>
        <p className="text-sm text-zinc-400 mt-1">
          {all.length === 0
            ? 'Your collection is empty.'
            : `${totalCards} card${totalCards === 1 ? '' : 's'} in ${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}` +
              (costs.length ? ` · cost basis ${costs.map(([c, v]) => `${v.toFixed(2)} ${c}`).join(' + ')}` : '')}
        </p>
      </div>

      <form method="get" className="flex flex-wrap gap-3">
        <input name="q" defaultValue={filters.q} placeholder="Search name or set" aria-label="Search collection" className={`${fieldClass} min-w-48 flex-1`} />
        <select name="type" defaultValue={filters.type} aria-label="Type" className={fieldClass}>
          <option value="all">All</option>
          <option value="raw">Raw</option>
          <option value="graded">Graded</option>
        </select>
        <select name="sort" defaultValue={filters.sort} aria-label="Sort" className={fieldClass}>
          <option value="newest">Newest</option>
          <option value="name">Name</option>
          <option value="quantity">Quantity</option>
        </select>
        <button type="submit" className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-700">Apply</button>
      </form>

      {all.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center space-y-3">
          <p className="text-zinc-400">Nothing here yet.</p>
          <Link href="/market" className="text-sm text-yellow-300 hover:underline">Find cards in the Market Explorer</Link>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-zinc-400">No entries match your filters.</p>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {rows.map((r) => (
            <CollectionItemCard key={r.id} item={r} />
          ))}
        </ul>
      )}
    </div>
  )
}
