import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface CardDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: CardDetailPageProps): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Card ${id}`,
  }
}

export default async function CardDetailPage({ params }: CardDetailPageProps) {
  const { id } = await params

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href="/market"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Market Explorer
      </Link>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 space-y-4">
        <div>
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
            Card Reference: {id}
          </span>
          <h1 className="text-2xl font-bold text-zinc-100 mt-1">Card Details</h1>
        </div>

        <div className="rounded-lg bg-zinc-800/50 border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-400">
          Card detail view with live TCGdex metadata, high-resolution artwork, variant selector, and market valuation will be fully wired in Milestone 1 & 3.
        </div>
      </div>
    </div>
  )
}

