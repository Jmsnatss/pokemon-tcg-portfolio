import type { Metadata } from 'next'
import { CatalogSearch } from '@/components/cards/CatalogSearch'
import { tcgdex } from '@/lib/tcgdex/client'

export const metadata: Metadata = {
  title: 'Market Explorer',
}

export default async function MarketPage() {
  const [rarities, types, sets] = await Promise.all([
    tcgdex.listFacet('rarities'),
    tcgdex.listFacet('types'),
    tcgdex.listSets(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Market Explorer</h1>
        <p className="text-sm text-[var(--pv-muted)] mt-1">
          Search the Pokémon TCG catalog, filter by set, rarity and type, and see what you already own.
        </p>
      </div>
      <CatalogSearch
        facets={{
          rarities: rarities.filter((r) => r !== 'None'),
          types,
          sets: sets.map((s) => ({ id: s.id, name: s.name })).sort((a, b) => a.name.localeCompare(b.name)),
        }}
      />
    </div>
  )
}
