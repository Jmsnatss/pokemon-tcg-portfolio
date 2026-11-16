'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RAW_CONDITION_LABELS, type RawCondition } from '@pokevault/shared'
import { CURRENCIES, PRINTING_LABELS, RAW_CONDITIONS, type SupportedPrintingType } from '@/types/catalog'
import type { CollectionRow } from './list'

const inputClass =
  'w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none'

export function CollectionItemCard({ item }: { item: CollectionRow }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const card = item.card_variants?.cards
  const printing = item.card_variants?.printing_type as SupportedPrintingType | undefined

  async function call(method: 'PATCH' | 'DELETE', body?: unknown): Promise<boolean> {
    setPending(true)
    setError(null)
    try {
      const res = await fetch(`/api/collection/${item.id}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        setError(json.error ?? 'Something went wrong')
        return false
      }
      router.refresh()
      return true
    } catch {
      setError('Network error. Please try again.')
      return false
    } finally {
      setPending(false)
    }
  }

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const ok = await call('PATCH', {
      quantity: fd.get('quantity'),
      condition: item.is_graded ? item.condition : fd.get('condition'),
      purchasePrice: fd.get('purchasePrice') ?? '',
      purchaseCurrency: fd.get('purchaseCurrency'),
      purchaseDate: fd.get('purchaseDate') ?? '',
      notes: fd.get('notes') ?? '',
    })
    if (ok) setEditing(false)
  }

  async function onDelete() {
    if (window.confirm(`Remove ${card?.name ?? 'this card'} from your collection?`)) await call('DELETE')
  }

  return (
    <li className="flex gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="w-24 shrink-0">
        {card?.image_url ? (
          <Image src={card.image_url} alt={card.name} width={245} height={342} className="h-auto w-full rounded-md" />
        ) : (
          <div className="flex aspect-[245/342] items-center justify-center rounded-md bg-zinc-800 text-xs text-zinc-500">
            No image
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {card ? (
              <Link href={`/card/${card.provider_id}`} className="block truncate font-semibold text-zinc-100 hover:underline">
                {card.name}
              </Link>
            ) : (
              <span className="text-zinc-400">Unknown card</span>
            )}
            <p className="truncate text-xs text-zinc-500">
              {card?.card_sets?.name ?? '—'} · #{card?.collector_number ?? '—'}
              {card?.rarity ? ` · ${card.rarity}` : ''}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">×{item.quantity}</span>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {printing && <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">{PRINTING_LABELS[printing] ?? printing}</span>}
          {item.is_graded ? (
            <span className="rounded bg-yellow-400/10 px-2 py-0.5 text-yellow-300">
              {item.grading_company} {item.grade}
              {item.cert_number ? ` · cert ${item.cert_number}` : ''}
            </span>
          ) : (
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">
              {RAW_CONDITION_LABELS[item.condition as RawCondition] ?? item.condition}
            </span>
          )}
          {item.purchase_price != null && (
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">
              Paid {item.purchase_price} {item.purchase_currency}
              {item.purchase_date ? ` on ${item.purchase_date}` : ''}
            </span>
          )}
        </div>
        {item.notes && !editing && <p className="text-xs text-zinc-400">{item.notes}</p>}

        {editing ? (
          <form onSubmit={onSave} className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <input name="quantity" type="number" min={1} max={9999} defaultValue={item.quantity} required aria-label="Quantity" className={inputClass} />
              {!item.is_graded && (
                <select name="condition" defaultValue={item.condition} aria-label="Condition" className={inputClass}>
                  {RAW_CONDITIONS.map((c) => (
                    <option key={c} value={c}>{RAW_CONDITION_LABELS[c]}</option>
                  ))}
                </select>
              )}
              <input name="purchasePrice" inputMode="decimal" placeholder="Price" defaultValue={item.purchase_price ?? ''} aria-label="Purchase price" className={inputClass} />
              <select name="purchaseCurrency" defaultValue={item.purchase_currency ?? 'USD'} aria-label="Currency" className={inputClass}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input name="purchaseDate" type="date" defaultValue={item.purchase_date ?? ''} aria-label="Purchase date" className={inputClass} />
            </div>
            <textarea name="notes" rows={2} maxLength={1000} defaultValue={item.notes ?? ''} aria-label="Notes" className={inputClass} />
            <div className="flex gap-2">
              <button type="submit" disabled={pending} className="rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-zinc-900 disabled:opacity-50">
                {pending ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex gap-3 pt-1 text-xs">
            <button type="button" onClick={() => setEditing(true)} className="text-zinc-300 hover:text-white">Edit</button>
            <button type="button" onClick={onDelete} disabled={pending} className="text-red-400 hover:text-red-300 disabled:opacity-50">
              Remove
            </button>
          </div>
        )}
        {error && <p className="text-xs text-red-400" role="alert">{error}</p>}
      </div>
    </li>
  )
}
