import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Collection',
}

export default function CollectionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Collection</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Manage your Pokémon card inventory
        </p>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 flex flex-col items-center justify-center gap-3 text-center">
        <p className="text-zinc-400">Collection management — Milestone 2</p>
        <p className="text-sm text-zinc-500">
          Search, filter, and manage your raw cards, graded slabs, and sealed products.
        </p>
      </div>
    </div>
  )
}

