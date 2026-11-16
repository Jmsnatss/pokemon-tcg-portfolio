'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { RAW_CONDITION_LABELS, type RawCondition } from '@pokevault/shared'
import { Field } from '@/components/ui/Field'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { rarityTier } from '@/lib/utils/progress'
import { CURRENCIES, PRINTING_LABELS, RAW_CONDITIONS, type SupportedPrintingType } from '@/types/catalog'
import type { CollectionRow } from './list'

export type TilePrice = {
  status: 'priced' | 'reference' | 'unavailable'
  unit: number | null
  line: number | null
  currency: string
  source: string
  observedAt: string | null
  note: string | null
}

export function CollectionItemCard({ item, price, index = 0 }: { item: CollectionRow; price: TilePrice; index?: number }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const card = item.card_variants?.cards
  const printing = item.card_variants?.printing_type as SupportedPrintingType | undefined
  const tier = rarityTier(card?.rarity)

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

  return (
    <li
      className={`pv-panel pv-rise pv-tilt pv-tier-${tier} flex flex-col gap-3 p-3 ${editing ? 'sm:col-span-2 sm:flex-row' : ''}`}
      style={{ ['--i' as string]: Math.min(index, 14) }}
    >
      <div className={`relative ${editing ? 'sm:w-44 sm:shrink-0' : ''}`}>
        {card?.image_url ? (
          <div className="pv-card-art">
            <Image src={card.image_url} alt={card.name} width={245} height={342} className="h-auto w-full" />
          </div>
        ) : (
          <div className="flex aspect-[245/342] items-center justify-center rounded-lg bg-black/30 text-xs text-[var(--pv-muted)]">
            No image
          </div>
        )}
        <span className="pv-chip pv-chip-gold absolute right-2 top-2 !bg-black/70 backdrop-blur" title="Quantity owned">
          ×{item.quantity}
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="min-w-0">
          {card ? (
            <Link href={`/card/${card.provider_id}`} className="block truncate text-sm font-bold text-white transition-colors hover:text-[var(--pv-yellow)]">
              {card.name}
            </Link>
          ) : (
            <span className="text-[var(--pv-muted)]">Unknown card</span>
          )}
          <p className="truncate text-xs text-[var(--pv-muted)] underline decoration-[var(--pv-border)] underline-offset-2">
            {card?.card_sets?.name ?? '—'}
          </p>
          <p className="truncate text-xs text-[var(--pv-muted)]">
            #{card?.collector_number ?? '—'}
            {card?.rarity ? ` · ${card.rarity}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {printing && <span className="pv-chip">{PRINTING_LABELS[printing] ?? printing}</span>}
          {item.is_graded ? (
            <span className="pv-chip pv-chip-gold">
              {item.grading_company} {item.grade}
              {item.cert_number ? ` · ${item.cert_number}` : ''}
            </span>
          ) : (
            <span className="pv-chip">{RAW_CONDITION_LABELS[item.condition as RawCondition] ?? item.condition}</span>
          )}
        </div>

        <div className="space-y-0.5 border-t pt-2.5">
          {price.unit !== null ? (
            <>
              <p className={`text-xl font-bold tabular-nums ${price.status === 'priced' ? 'text-white' : 'text-[var(--pv-muted)]'}`}>
                {formatCurrency(price.unit, price.currency)}
              </p>
              {price.status === 'priced' && item.quantity > 1 && price.line !== null && (
                <p className="text-xs text-[var(--pv-muted)] tabular-nums">
                  {item.quantity} × = {formatCurrency(price.line, price.currency)}
                </p>
              )}
              <p className="text-[11px] text-[#5b6385]">
                {price.note ?? `Market · ${price.source}`}
                {price.observedAt ? ` · ${formatDate(price.observedAt)}` : ''}
              </p>
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-[var(--pv-muted)]">Price unavailable</p>
              <p className="text-[11px] text-[#5b6385]">{price.note}</p>
            </>
          )}
          {item.purchase_price != null && (
            <p className="text-[11px] text-[var(--pv-muted)] tabular-nums">
              Paid {formatCurrency(item.purchase_price, item.purchase_currency ?? 'USD')} each
              {item.purchase_date ? ` · ${item.purchase_date}` : ''}
            </p>
          )}
        </div>
        {item.notes && !editing && <p className="text-xs text-[var(--pv-muted)]">{item.notes}</p>}

        {editing ? (
          <form onSubmit={onSave} className="pv-rise space-y-3 rounded-xl bg-black/20 p-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantity" hint="How many copies you own">
                <input name="quantity" type="number" min={1} max={9999} defaultValue={item.quantity} required className="pv-control" />
              </Field>
              {!item.is_graded && (
                <Field label="Condition">
                  <select name="condition" defaultValue={item.condition} className="pv-control">
                    {RAW_CONDITIONS.map((c) => (
                      <option key={c} value={c}>{RAW_CONDITION_LABELS[c]}</option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Price paid per card" optional>
                <input name="purchasePrice" inputMode="decimal" placeholder="e.g. 4.50" defaultValue={item.purchase_price ?? ''} className="pv-control" />
              </Field>
              <Field label="Currency">
                <select name="purchaseCurrency" defaultValue={item.purchase_currency ?? 'USD'} className="pv-control">
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Date purchased" optional className="col-span-2">
                <input name="purchaseDate" type="date" defaultValue={item.purchase_date ?? ''} className="pv-control" />
              </Field>
            </div>
            <Field label="Notes" optional>
              <textarea name="notes" rows={2} maxLength={1000} defaultValue={item.notes ?? ''} placeholder="Where you got it, centering, etc." className="pv-control" />
            </Field>
            <div className="flex gap-2">
              <button type="submit" disabled={pending} className="pv-btn pv-btn-gold">
                {pending ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="pv-btn pv-btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        ) : confirming ? (
          <div className="pv-pop space-y-2 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5">
            <span className="block text-xs text-red-200">Remove this from your collection?</span>
            <div className="flex gap-2">
              <button type="button" disabled={pending} onClick={() => call('DELETE')} className="pv-btn pv-btn-primary !py-1">
                {pending ? 'Removing…' : 'Yes, remove'}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="pv-btn pv-btn-ghost !py-1">
                Keep
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(true)} className="pv-btn pv-btn-ghost !py-1" aria-label="Edit entry">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button type="button" onClick={() => setConfirming(true)} className="pv-btn pv-btn-danger !py-1" aria-label="Remove entry">
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        )}
        {error && <p className="text-xs text-red-400" role="alert">{error}</p>}
      </div>
    </li>
  )
}
