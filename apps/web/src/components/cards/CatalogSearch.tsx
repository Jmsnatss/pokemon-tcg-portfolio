'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, Search, SlidersHorizontal, X } from 'lucide-react'
import { Pokeball } from '@/components/ui/Pokeball'
import { Field } from '@/components/ui/Field'
import { filterByPrice, sortByPrice } from '@/features/catalog/view'
import { formatCurrency } from '@/lib/utils/format'
import { CATALOG_CATEGORIES, PRINTING_LABELS, type CatalogSearchResult } from '@/types/catalog'

export type Facets = {
  rarities: string[]
  types: string[]
  sets: { id: string; name: string }[]
}

type Filters = {
  q: string
  category: string
  rarity: string
  type: string
  set: string
  owned: 'all' | 'owned' | 'missing'
  sort: 'name' | 'number'
}

const EMPTY: Filters = { q: '', category: '', rarity: '', type: '', set: '', owned: 'all', sort: 'name' }

type Status = 'idle' | 'loading' | 'more' | 'error' | 'done'

const CATEGORY_LABELS: Record<string, string> = { Pokemon: 'Pokémon', Trainer: 'Trainer', Energy: 'Energy' }

function isSearchable(f: Filters): boolean {
  return f.q.trim().length >= 2 || Boolean(f.rarity || f.type || f.set)
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition active:scale-95 ${
            o.value === value
              ? 'border-[var(--pv-yellow)] bg-[rgba(250,204,21,0.14)] text-[var(--pv-yellow)]'
              : 'text-[var(--pv-muted)] hover:border-[#3a4470] hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function CatalogSearch({ facets }: { facets: Facets }) {
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [priceSort, setPriceSort] = useState<'none' | 'asc' | 'desc'>('none')
  const [showFilters, setShowFilters] = useState(false)

  const [results, setResults] = useState<CatalogSearchResult[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const searchable = isSearchable(filters)

  const run = useCallback(async (f: Filters, nextPage: number, append: boolean) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setStatus(append ? 'more' : 'loading')
    setError(null)
    const params = new URLSearchParams({ owned: f.owned, sort: f.sort, page: String(nextPage) })
    if (f.q.trim()) params.set('q', f.q.trim())
    for (const k of ['category', 'rarity', 'type', 'set'] as const) if (f[k]) params.set(k, f[k])
    try {
      const res = await fetch(`/api/catalog/search?${params}`, { signal: controller.signal })
      const json = (await res.json()) as {
        data?: CatalogSearchResult[]
        total?: number
        hasMore?: boolean
        error?: string
      }
      if (!res.ok || !json.data) {
        setError(json.error ?? 'Search failed')
        setStatus('error')
        return
      }
      setResults((prev) => (append ? [...prev, ...json.data!] : json.data!))
      setTotal(json.total ?? json.data.length)
      setHasMore(Boolean(json.hasMore))
      setPage(nextPage)
      setStatus('done')
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError('Network error. Please try again.')
        setStatus('error')
      }
    }
  }, [])

  useEffect(() => {
    if (!isSearchable(filters)) return
    const timer = setTimeout(() => void run(filters, 1, false), 400)
    return () => clearTimeout(timer)
  }, [filters, run])

  useEffect(() => () => controllerRef.current?.abort(), [])

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((f) => ({ ...f, [key]: value }))

  const min = priceMin.trim() === '' ? null : Number(priceMin)
  const max = priceMax.trim() === '' ? null : Number(priceMax)
  const visible = useMemo(() => {
    const ranged = filterByPrice(results, Number.isFinite(min) ? min : null, Number.isFinite(max) ? max : null)
    return priceSort === 'none' ? ranged : sortByPrice(ranged, priceSort)
  }, [results, min, max, priceSort])

  const activeCount =
    [filters.category, filters.rarity, filters.type, filters.set].filter(Boolean).length +
    (filters.owned !== 'all' ? 1 : 0) +
    (priceMin || priceMax ? 1 : 0)

  const clearAll = () => {
    setFilters((f) => ({ ...EMPTY, q: f.q }))
    setPriceMin('')
    setPriceMax('')
    setPriceSort('none')
  }

  const display = searchable ? status : 'idle'

  return (
    <div className="grid gap-6 lg:grid-cols-[270px_1fr]">
      <aside className={`${showFilters ? 'block' : 'hidden'} pv-panel space-y-5 self-start p-4 lg:sticky lg:top-6 lg:block`}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Filters</h2>
          {activeCount > 0 && (
            <button type="button" onClick={clearAll} className="text-xs text-[var(--pv-yellow)] hover:underline">
              Clear {activeCount} filter{activeCount === 1 ? '' : 's'}
            </button>
          )}
        </div>

        <div>
          <span className="pv-label">Category</span>
          <Segmented
            label="Category"
            value={filters.category}
            onChange={(v) => set('category', v)}
            options={[{ value: '', label: 'All' }, ...CATALOG_CATEGORIES.map((c) => ({ value: c as string, label: CATEGORY_LABELS[c] }))]}
          />
        </div>

        <div>
          <span className="pv-label">In your portfolio</span>
          <Segmented
            label="Portfolio status"
            value={filters.owned}
            onChange={(v) => set('owned', v)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'owned', label: 'Owned' },
              { value: 'missing', label: 'Not owned' },
            ]}
          />
        </div>

        <Field label="Set">
          <select className="pv-control" value={filters.set} onChange={(e) => set('set', e.target.value)}>
            <option value="">All sets</option>
            {facets.sets.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Rarity">
          <select className="pv-control" value={filters.rarity} onChange={(e) => set('rarity', e.target.value)}>
            <option value="">All rarities</option>
            {facets.rarities.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </Field>

        <Field label="Energy type">
          <select className="pv-control" value={filters.type} onChange={(e) => set('type', e.target.value)}>
            <option value="">All types</option>
            {facets.types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>

        <div>
          <span className="pv-label">Market price (USD)</span>
          <div className="flex items-center gap-2">
            <input
              className="pv-control"
              inputMode="decimal"
              placeholder="Min"
              aria-label="Minimum price"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
            />
            <span className="text-[var(--pv-muted)]">to</span>
            <input
              className="pv-control"
              inputMode="decimal"
              placeholder="Max"
              aria-label="Maximum price"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
            />
          </div>
          <p className="pv-hint">Applies to the cards loaded so far. Cards without a price are hidden while a range is set.</p>
        </div>

        <Field label="Sort by">
          <select
            className="pv-control"
            value={priceSort === 'none' ? filters.sort : `price_${priceSort}`}
            onChange={(e) => {
              const v = e.target.value
              if (v === 'price_asc' || v === 'price_desc') setPriceSort(v === 'price_asc' ? 'asc' : 'desc')
              else {
                setPriceSort('none')
                set('sort', v as Filters['sort'])
              }
            }}
          >
            <option value="name">Name (A-Z)</option>
            <option value="number">Set and number</option>
            <option value="price_desc">Price: high to low (loaded cards)</option>
            <option value="price_asc">Price: low to high (loaded cards)</option>
          </select>
        </Field>
      </aside>

      <section className="min-w-0 space-y-5">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--pv-muted)]" />
            <input
              type="search"
              value={filters.q}
              onChange={(e) => set('q', e.target.value)}
              placeholder="Search cards by name, e.g. Charizard"
              aria-label="Search cards"
              className="pv-control !rounded-2xl !py-3.5 !pl-12 !text-base"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            className="pv-btn pv-btn-ghost !py-3 lg:hidden"
            aria-expanded={showFilters}
          >
            {showFilters ? <X className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
            Filters{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>
        </div>

        {display === 'idle' && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Pokeball className="h-14 w-14 opacity-80" />
            <p className="text-sm text-[var(--pv-muted)]">
              Type at least 2 characters, or pick a set, rarity or energy type to begin your hunt.
            </p>
          </div>
        )}
        {display === 'loading' && (
          <div className="flex items-center gap-3 py-10 text-sm text-[var(--pv-muted)]">
            <Pokeball className="pv-pokeball-spin h-6 w-6" /> Searching the catalog…
          </div>
        )}
        {display === 'error' && <p className="text-sm text-red-400" role="alert">{error}</p>}

        {(display === 'done' || display === 'more') && (
          <>
            <p className="text-xs text-[var(--pv-muted)]">
              {total} match{total === 1 ? '' : 'es'}
              {visible.length !== results.length && ` · ${visible.length} of ${results.length} loaded cards fit your price range`}
              {' '}· Prices: TCGplayer (via TCGdex), Near Mint market
            </p>

            {visible.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--pv-muted)]">
                {results.length === 0 ? 'No cards found. Try other filters.' : 'No loaded cards fit that price range. Load more or widen it.'}
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {visible.map((card, i) => (
                  <li key={card.id} className="pv-rise" style={{ ['--i' as string]: Math.min(i % 30, 14) }}>
                    <Link href={`/card/${card.id}`} className="pv-panel pv-interactive pv-tilt block p-2.5">
                      <div className="relative">
                        {card.imageUrl ? (
                          <div className="pv-card-art">
                            <Image src={card.imageUrl} alt={card.name} width={245} height={342} className="h-auto w-full" />
                          </div>
                        ) : (
                          <div className="flex aspect-[245/342] items-center justify-center rounded-lg bg-black/30 text-xs text-[var(--pv-muted)]">
                            No image
                          </div>
                        )}
                        {card.ownedQuantity ? (
                          <span className="pv-chip pv-chip-gold absolute left-2 top-2 !bg-black/70 backdrop-blur">
                            <Check className="h-3 w-3" /> Owned ×{card.ownedQuantity}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2.5 truncate text-sm font-semibold text-white">{card.name}</p>
                      <p className="truncate text-xs text-[var(--pv-muted)]">
                        {card.id} · #{card.localId}
                      </p>
                      <div className="mt-2 border-t pt-2">
                        {card.price ? (
                          <>
                            <p className="text-lg font-bold tabular-nums text-white">
                              {formatCurrency(card.price.amount, card.price.currency)}
                            </p>
                            <p className="text-[11px] text-[#5b6385]">{PRINTING_LABELS[card.price.printing]} · NM market</p>
                          </>
                        ) : (
                          <p className="text-xs text-[#5b6385]">Price unavailable</p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {hasMore && (
              <div className="flex justify-center">
                <button
                  type="button"
                  disabled={display === 'more'}
                  onClick={() => void run(filters, page + 1, true)}
                  className="pv-btn pv-btn-ghost"
                >
                  {display === 'more' ? 'Loading…' : `Load more (${results.length} of ${total})`}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
