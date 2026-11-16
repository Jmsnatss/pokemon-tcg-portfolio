'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { CatalogSearchResult } from '@/types/catalog'

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
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search cards by name, e.g. Charizard"
        aria-label="Search cards"
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
      />

      {state.status === 'idle' && <p className="text-sm text-zinc-500">Type at least 2 characters to search.</p>}
      {state.status === 'loading' && <p className="text-sm text-zinc-400">Searching…</p>}
      {state.status === 'error' && <p className="text-sm text-red-400">{state.message}</p>}
      {state.status === 'done' && state.results.length === 0 && (
        <p className="text-sm text-zinc-400">No cards found.</p>
      )}
      {state.status === 'done' && state.results.length > 0 && (
        <>
          {state.total > state.results.length && (
            <p className="text-xs text-zinc-500">
              Showing {state.results.length} of {state.total} matches. Refine your search to narrow results.
            </p>
          )}
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {state.results.map((card) => (
              <li key={card.id}>
                <Link
                  href={`/card/${card.id}`}
                  className="block rounded-xl border border-zinc-800 bg-zinc-900 p-2 transition hover:border-zinc-600"
                >
                  {card.imageUrl ? (
                    <Image
                      src={card.imageUrl}
                      alt={card.name}
                      width={245}
                      height={342}
                      className="h-auto w-full rounded-lg"
                    />
                  ) : (
                    <div className="flex aspect-[245/342] items-center justify-center rounded-lg bg-zinc-800 text-xs text-zinc-500">
                      No image
                    </div>
                  )}
                  <p className="mt-2 truncate text-sm font-medium text-zinc-100">{card.name}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {card.id} · #{card.localId}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
