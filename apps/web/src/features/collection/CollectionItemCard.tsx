'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { RAW_CONDITION_LABELS, type RawCondition } from '@pokevault/shared'
import { Field } from '@/components/ui/Field'
import { rarityTier } from '@/lib/utils/progress'
import { CURRENCIES, PRINTING_LABELS, RAW_CONDITIONS, type SupportedPrintingType } from '@/types/catalog'
import type { CollectionRow } from './list'

export function CollectionItemCard({ item, index = 0 }: { item: CollectionRow; index?: number }) {
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
    <li className={`pv-panel pv-rise pv-tilt pv-tier-${tier} flex gap-4 p-4`} style={{ ['--i' as string]: index }}>
      <div className="w-28 shrink-0">
        {card?.image_url ? (
          <div className="pv-card-art">
            <Image src={card.image_url} alt={card.name} width={245} height={342} className="h-auto w-full" />
          </div>
        ) : (
          <div className="flex aspect-[245/342] items-center justify-center rounded-lg bg-[var(--pv-surface-2)] text-xs text-[var(--pv-muted)]">
            No image
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {card ? (
              <Link href={`/card/${card.provider_id}`} className="block truncate text-base font-bold text-white hover:text-[var(--pv-yellow)] transition-colors">
                {card.name}
              </Link>
            ) : (
              <span className="text-[var(--pv-muted)]">Unknown card</span>
            )}
            <p className="truncate text-xs text-[var(--pv-muted)]">
              {card?.card_sets?.name ?? '—'} · #{card?.collector_number ?? '—'}
              {card?.rarity ? ` · ${card.rarity}` : ''}
            </p>
          </div>
          <span className="pv-chip pv-chip-gold shrink-0" title="Quantity owned">×{item.quantity}</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {printing && <span className="pv-chip">{PRINTING_LABELS[printing] ?? printing}</span>}
          {item.is_graded ? (
            <span className="pv-chip pv-chip-gold">
              {item.grading_company} {item.grade}
              {item.cert_number ? ` · cert ${item.cert_number}` : ''}
            </span>
          ) : (
            <span className="pv-chip">{RAW_CONDITION_LABELS[item.condition as RawCondition] ?? item.condition}</span>
          )}
          {item.purchase_price != null && (
            <span className="pv-chip">
              Paid {item.purchase_price} {item.purchase_currency} each
              {item.purchase_date ? ` · ${item.purchase_date}` : ''}
            </span>
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
          <div className="pv-pop flex flex-wrap items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5">
            <span className="text-xs text-red-200">Remove this from your collection?</span>
            <button type="button" disabled={pending} onClick={() => call('DELETE')} className="pv-btn pv-btn-primary !py-1">
              {pending ? 'Removing…' : 'Yes, remove'}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="pv-btn pv-btn-ghost !py-1">
              Keep
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(true)} className="pv-btn pv-btn-ghost !py-1">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button type="button" onClick={() => setConfirming(true)} className="pv-btn pv-btn-danger !py-1">
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
        )}
        {error && <p className="text-xs text-red-400" role="alert">{error}</p>}
      </div>
    </li>
  )
}
