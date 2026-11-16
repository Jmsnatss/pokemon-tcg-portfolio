import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getAvailablePrintings } from '@/features/collection/variants'
import { AddToCollectionForm } from '@/features/collection/AddToCollectionForm'
import { tcgdex } from '@/lib/tcgdex/client'
import { cardProviderIdSchema } from '@/types/catalog'

interface CardDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: CardDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const parsed = cardProviderIdSchema.safeParse(id)
  const card = parsed.success ? await tcgdex.getCard(parsed.data) : null
  return { title: card?.name ?? 'Card not found' }
}

export default async function CardDetailPage({ params }: CardDetailPageProps) {
  const { id } = await params
  const parsed = cardProviderIdSchema.safeParse(id)
  if (!parsed.success) notFound()

  const card = await tcgdex.getCard(parsed.data)
  if (!card) notFound()

  const imageUrl = tcgdex.getCardImageUrl(card.image, 'high')
  const printings = getAvailablePrintings(card)
  const facts: [string, string | null][] = [
    ['Set', card.set?.name ?? null],
    ['Number', card.localId],
    ['Rarity', card.rarity],
    ['Category', card.category],
    ['HP', card.hp != null ? String(card.hp) : null],
    ['Types', card.types?.join(', ') ?? null],
    ['Illustrator', card.illustrator],
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href="/market"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Market Explorer
      </Link>

      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        <div>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={card.name}
              width={600}
              height={825}
              priority
              className="h-auto w-full rounded-xl"
            />
          ) : (
            <div className="flex aspect-[245/342] items-center justify-center rounded-xl bg-zinc-800 text-sm text-zinc-500">
              No image available
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">{card.id}</span>
            <h1 className="text-2xl font-bold text-zinc-100 mt-1">{card.name}</h1>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {facts
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-zinc-500">{k}</dt>
                  <dd className="text-zinc-200">{v}</dd>
                </div>
              ))}
          </dl>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-100">Add to collection</h2>
            <AddToCollectionForm providerId={card.id} printings={printings} />
          </div>

          <p className="text-xs text-zinc-500">Price: unavailable until a pricing provider is connected (Milestone 3).</p>
        </div>
      </div>
    </div>
  )
}
