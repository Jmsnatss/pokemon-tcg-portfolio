'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { Pokeball } from '@/components/ui/Pokeball'
import { formatCurrency } from '@/lib/utils/format'
import { PRINTING_LABELS, type CatalogSearchResult } from '@/types/catalog'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; results: CatalogSearchResult[]; total: number }

export function CatalogSearch() {
  const [query, setQuery] = useState('')
  const [fetched, setState] = useState<State>({ status: 'idle' })
  const state: State = query.trim().length < 2 ? { status: 'idle' } : fetched

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setState({ status: 'loading' })
      try {
        const res = await fetch(`/api/catalog/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        })
        const json = (await res.json()) as { data?: CatalogSearchResult[]; total?: number; error?: string }
        if (!res.ok || !json.data) {
          setState({ status: 'error', message: json.error ?? 'Search failed' })
          return
        }
        setState({ status: 'done', results: json.data, total: json.total ?? json.data.length })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setState({ status: 'error', message: 'Network error. Please try again.' })
        }
      }
    }, 400)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--pv-muted)]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cards by name, e.g. Charizard"
          aria-label="Search cards"
          className="pv-control !rounded-2xl !py-3.5 !pl-12 !text-base"
        />
      </div>

      {state.status === 'idle' && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Pokeball className="h-14 w-14 opacity-80" />
          <p className="text-sm text-[var(--pv-muted)]">Type at least 2 characters to begin your hunt.</p>
        </div>
      )}
      {state.status === 'loading' && (
        <div className="flex items-center gap-3 py-10 text-sm text-[var(--pv-muted)]">
          <Pokeball className="pv-pokeball-spin h-6 w-6" /> Searching the catalog…
        </div>
      )}
      {state.status === 'error' && <p className="text-sm text-red-400" role="alert">{state.message}</p>}
      {state.status === 'done' && state.results.length === 0 && (
        <p className="py-10 text-center text-sm text-[var(--pv-muted)]">No cards found. Try another name.</p>
      )}
      {state.status === 'done' && state.results.length > 0 && (
        <>
          <p className="text-xs text-[var(--pv-muted)]">
            {state.total > state.results.length
              ? `Showing ${state.results.length} of ${state.total} matches. Refine your search to narrow results.`
              : `${state.total} match${state.total === 1 ? '' : 'es'}`}
            {' '}· Prices: TCGplayer (via TCGdex), Near Mint market
          </p>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {state.results.map((card, i) => (
              <li key={card.id} className="pv-rise" style={{ ['--i' as string]: Math.min(i, 14) }}>
                <Link href={`/card/${card.id}`} className="pv-panel pv-interactive pv-tilt block p-2.5">
                  {card.imageUrl ? (
                    <div className="pv-card-art">
                      <Image src={card.imageUrl} alt={card.name} width={245} height={342} className="h-auto w-full" />
                    </div>
                  ) : (
                    <div className="flex aspect-[245/342] items-center justify-center rounded-lg bg-black/30 text-xs text-[var(--pv-muted)]">
                      No image
                    </div>
                  )}
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
        </>
      )}
    </div>
  )
}
