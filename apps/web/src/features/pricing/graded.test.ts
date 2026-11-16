import { describe, expect, it } from 'vitest'
import type { JustTcgCard, JustTcgVariant } from '@/lib/pricing/justtcg'
import { mapJustTcgPrinting, selectGradedQuote } from './graded'

const variant = (over: Partial<JustTcgVariant> & { grade?: number; company?: string; label?: string | null; qualifier?: string | null; price?: number | null; status?: string }): JustTcgVariant => ({
  id: 'v',
  type: 'graded',
  condition: null,
  printing: over.printing === undefined ? 'Holofoil' : over.printing,
  grading: {
    company: over.company ?? 'PSA',
    grade: over.grade ?? 10,
    grade_label: over.label ?? null,
    qualifier: over.qualifier ?? null,
    canonical: 'PSA 10',
  },
  markets: [
    {
      region: 'NA',
      currency: 'USD',
      price: over.price === undefined ? 4570 : over.price,
      price_status: over.status ?? 'current',
      last_price: null,
      updated_at: 1765630000,
      last_sale_at: 1765630000,
      price_expires_at: null,
    },
  ],
})

const card = (variants: JustTcgVariant[]): JustTcgCard => ({ id: 'c', name: 'Charizard', variants })
const want = { company: 'PSA', grade: 10, printing: 'holo' as const }

describe('mapJustTcgPrinting', () => {
  it('maps known labels and rejects unknown ones', () => {
    expect(mapJustTcgPrinting('Reverse Holofoil')).toBe('reverse_holo')
    expect(mapJustTcgPrinting('Normal')).toBe('standard')
    expect(mapJustTcgPrinting('Cosmos Holo')).toBeNull()
    expect(mapJustTcgPrinting(null)).toBeNull()
  })
})

describe('selectGradedQuote', () => {
  it('returns the exact company, grade and printing', () => {
    const r = selectGradedQuote([card([variant({}), variant({ grade: 9, price: 100 })])], want)
    expect(r).toMatchObject({ ok: true, quote: { price: 4570, currency: 'USD' } })
    expect(r.ok && r.quote.observedAt).toBe(new Date(1765630000 * 1000).toISOString())
  })

  it('never uses a different grade', () => {
    expect(selectGradedQuote([card([variant({ grade: 9 })])], want).ok).toBe(false)
  })

  it('ignores Black Label / Pristine and qualified slabs for a plain grade', () => {
    expect(selectGradedQuote([card([variant({ label: 'Black Label' })])], want).ok).toBe(false)
    expect(selectGradedQuote([card([variant({ qualifier: 'OC' })])], want).ok).toBe(false)
  })

  it('does not substitute another printing', () => {
    expect(selectGradedQuote([card([variant({ printing: 'Normal' })])], want).ok).toBe(false)
  })

  it('accepts an unlabelled printing only when it is the single graded candidate', () => {
    expect(selectGradedQuote([card([variant({ printing: null })])], want).ok).toBe(true)
    expect(selectGradedQuote([card([variant({ printing: null }), variant({ printing: null })])], want).ok).toBe(false)
  })

  it('reports unpriced and expired slabs honestly', () => {
    const unpriced = selectGradedQuote([card([variant({ price: null, status: 'unpriced' })])], want)
    const expired = selectGradedQuote([card([variant({ price: null, status: 'expired' })])], want)
    expect(unpriced).toMatchObject({ ok: false, reason: expect.stringContaining('no recorded sale') })
    expect(expired).toMatchObject({ ok: false, reason: expect.stringContaining('90 days') })
  })

  it('fails on zero or multiple cards', () => {
    expect(selectGradedQuote([], want).ok).toBe(false)
    expect(selectGradedQuote([card([variant({})]), card([variant({})])], want).ok).toBe(false)
  })
})
