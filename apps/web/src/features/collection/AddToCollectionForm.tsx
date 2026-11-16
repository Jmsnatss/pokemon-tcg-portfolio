'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RAW_CONDITION_LABELS } from '@pokevault/shared'
import { GRADING_COMPANIES } from '@/lib/utils/grading'
import {
  CURRENCIES,
  PRINTING_LABELS,
  RAW_CONDITIONS,
  type SupportedPrintingType,
} from '@/types/catalog'

const inputClass =
  'w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none'

type Props = { providerId: string; printings: SupportedPrintingType[] }

export function AddToCollectionForm({ providerId, printings }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [graded, setGraded] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  if (printings.length === 0) {
    return (
      <p className="text-sm text-zinc-400">
        The catalog reports no printing data for this card, so it can&apos;t be added yet.
      </p>
    )
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    setPending(true)
    setMessage(null)
    try {
      const res = await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          printingType: fd.get('printingType'),
          quantity: fd.get('quantity'),
          condition: graded ? 'near_mint' : fd.get('condition'),
          gradingCompany: graded ? fd.get('gradingCompany') : '',
          grade: graded ? fd.get('grade') : '',
          certNumber: graded ? fd.get('certNumber') ?? '' : '',
          purchasePrice: fd.get('purchasePrice') ?? '',
          purchaseCurrency: fd.get('purchaseCurrency'),
          purchaseDate: fd.get('purchaseDate') ?? '',
          notes: fd.get('notes') ?? '',
        }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        setMessage({ type: 'error', text: json.error ?? 'Something went wrong' })
        return
      }
      setMessage({ type: 'ok', text: 'Added to your collection.' })
      form.reset()
      setGraded(false)
      router.refresh()
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-xs text-zinc-400">
          Printing
          <select name="printingType" className={inputClass} defaultValue={printings[0]}>
            {printings.map((p) => (
              <option key={p} value={p}>{PRINTING_LABELS[p]}</option>
            ))}
          </select>
        </label>
        {!graded && (
          <label className="space-y-1 text-xs text-zinc-400">
            Condition
            <select name="condition" className={inputClass} defaultValue="near_mint">
              {RAW_CONDITIONS.map((c) => (
                <option key={c} value={c}>{RAW_CONDITION_LABELS[c]}</option>
              ))}
            </select>
          </label>
        )}
        <label className="space-y-1 text-xs text-zinc-400">
          Quantity
          <input name="quantity" type="number" min={1} max={9999} defaultValue={1} required className={inputClass} />
        </label>
        <label className="space-y-1 text-xs text-zinc-400">
          Purchase date (optional)
          <input name="purchaseDate" type="date" className={inputClass} />
        </label>
        <label className="space-y-1 text-xs text-zinc-400">
          Purchase price per card (optional)
          <input name="purchasePrice" inputMode="decimal" placeholder="0.00" className={inputClass} />
        </label>
        <label className="space-y-1 text-xs text-zinc-400">
          Currency
          <select name="purchaseCurrency" className={inputClass} defaultValue="USD">
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" checked={graded} onChange={(e) => setGraded(e.target.checked)} />
        This is a graded slab
      </label>
      {graded && (
        <div className="grid grid-cols-3 gap-3">
          <label className="space-y-1 text-xs text-zinc-400">
            Company
            <select name="gradingCompany" className={inputClass} defaultValue="PSA">
              {GRADING_COMPANIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs text-zinc-400">
            Grade
            <input name="grade" inputMode="decimal" placeholder="10" required className={inputClass} />
          </label>
          <label className="space-y-1 text-xs text-zinc-400">
            Cert number (optional)
            <input name="certNumber" maxLength={40} className={inputClass} />
          </label>
        </div>
      )}
      <label className="block space-y-1 text-xs text-zinc-400">
        Notes (optional)
        <textarea name="notes" rows={2} maxLength={1000} className={inputClass} />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-yellow-300 disabled:opacity-50"
        >
          {pending ? 'Adding…' : 'Add to collection'}
        </button>
        {message && (
          <span className={message.type === 'ok' ? 'text-sm text-green-400' : 'text-sm text-red-400'} role="status">
            {message.text}
          </span>
        )}
      </div>
    </form>
  )
}
