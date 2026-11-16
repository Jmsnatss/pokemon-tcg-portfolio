import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Market Explorer',
}

export default function MarketPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Market Explorer</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Search the Pokémon TCG catalog and view market prices
        </p>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 flex flex-col items-center justify-center gap-3 text-center">
        <p className="text-zinc-400">Catalog search — Milestone 1</p>
        <p className="text-sm text-zinc-500">
          Powered by TCGdex. Market prices via JustTCG — Milestone 3.
        </p>
      </div>
    </div>
  )
}

