'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Plus } from 'lucide-react'
import { RAW_CONDITION_LABELS } from '@pokevault/shared'
import { Field } from '@/components/ui/Field'
import { GRADING_COMPANIES } from '@/lib/utils/grading'
import {
  CURRENCIES,
  PRINTING_LABELS,
  RAW_CONDITIONS,
  type SupportedPrintingType,
} from '@/types/catalog'

type Props = { providerId: string; printings: SupportedPrintingType[] }

export function AddToCollectionForm({ providerId, printings }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [graded, setGraded] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  if (printings.length === 0) {
    return (
      <p className="text-sm text-[var(--pv-muted)]">
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
      setMessage({ type: 'ok', text: 'Added to your collection!' })
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
        <Field label="Printing" hint="Versions TCGdex lists for this card">
          <select name="printingType" className="pv-control" defaultValue={printings[0]}>
            {printings.map((p) => (
              <option key={p} value={p}>{PRINTING_LABELS[p]}</option>
            ))}
          </select>
        </Field>
        <Field label="Quantity" hint="Copies you own">
          <input name="quantity" type="number" min={1} max={9999} defaultValue={1} required className="pv-control" />
        </Field>
        {!graded && (
          <Field label="Condition" className="col-span-2">
            <select name="condition" className="pv-control" defaultValue="near_mint">
              {RAW_CONDITIONS.map((c) => (
                <option key={c} value={c}>{RAW_CONDITION_LABELS[c]}</option>
              ))}
            </select>
          </Field>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border bg-black/20 px-3 py-2.5 text-sm text-[#cdd2e6] transition hover:border-[#3a4470]">
        <input type="checkbox" checked={graded} onChange={(e) => setGraded(e.target.checked)} className="h-4 w-4 accent-[var(--pv-yellow)]" />
        This is a graded slab (PSA / BGS / CGC)
      </label>

      {graded && (
        <div className="pv-pop grid grid-cols-3 gap-3 rounded-xl border border-[rgba(250,204,21,0.25)] bg-[rgba(250,204,21,0.04)] p-3">
          <Field label="Grading company">
            <select name="gradingCompany" className="pv-control" defaultValue="PSA">
              {GRADING_COMPANIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Grade" hint="e.g. 10 or 9.5">
            <input name="grade" inputMode="decimal" placeholder="10" required className="pv-control" />
          </Field>
          <Field label="Cert number" optional>
            <input name="certNumber" maxLength={40} className="pv-control" />
          </Field>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Field label="Price paid per card" optional className="col-span-2">
          <input name="purchasePrice" inputMode="decimal" placeholder="e.g. 4.50" className="pv-control" />
        </Field>
        <Field label="Currency">
          <select name="purchaseCurrency" className="pv-control" defaultValue="USD">
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Date purchased" optional className="col-span-3">
          <input name="purchaseDate" type="date" className="pv-control" />
        </Field>
      </div>

      <Field label="Notes" optional>
        <textarea name="notes" rows={2} maxLength={1000} placeholder="Where you got it, centering, etc." className="pv-control" />
      </Field>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="pv-btn pv-btn-primary">
          <Plus className="w-4 h-4" />
          {pending ? 'Adding…' : 'Add to collection'}
        </button>
        {message && (
          <span
            key={message.text}
            className={`pv-pop inline-flex items-center gap-1 text-sm ${message.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}
            role="status"
          >
            {message.type === 'ok' && <Check className="w-4 h-4" />}
            {message.text}
          </span>
        )}
      </div>
    </form>
  )
}
