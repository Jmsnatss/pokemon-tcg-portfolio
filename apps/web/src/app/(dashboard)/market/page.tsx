import type { Metadata } from 'next'
import { CatalogSearch } from '@/components/cards/CatalogSearch'

export const metadata: Metadata = {
  title: 'Market Explorer',
}

export default function MarketPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Market Explorer</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Search the Pokémon TCG catalog. Market prices arrive in Milestone 3.
        </p>
      </div>
      <CatalogSearch />
    </div>
  )
}
