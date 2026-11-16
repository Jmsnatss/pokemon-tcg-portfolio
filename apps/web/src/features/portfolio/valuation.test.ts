import { describe, expect, it } from 'vitest'
import type { CollectionRow } from '@/features/collection/list'
import { convert, totalCost, valueCollection } from './valuation'

const row = (id: string, over: Partial<CollectionRow> = {}, printing = 'standard', providerId = 'a-1'): CollectionRow => ({
  id,
  user_id: 'u1',
  card_variant_id: 'v-' + id,
  quantity: 1,
  condition: 'near_mint',
  is_graded: false,
  grading_company: null,
  grade: null,
  cert_number: null,
  purchase_price: null,
  purchase_currency: null,
  purchase_date: null,
  notes: null,
  created_at: '',
  card_variants: {
    printing_type: printing,
    cards: { provider_id: providerId, name: 'X', collector_number: '1', rarity: null, image_url: null, card_sets: null },
  },
  ...over,
})

const pricing = new Map([
  ['a-1', { tcgplayer: { unit: 'USD', updated: '2026-11-16T00:00:00Z', normal: { marketPrice: 10 } } }],
])

describe('convert', () => {
  const rates = { PHP: 50, EUR: 0.5 }
  it('handles same currency, USD base and cross rates', () => {
    expect(convert(5, 'USD', 'USD', rates)).toBe(5)
    expect(convert(2, 'USD', 'PHP', rates)).toBe(100)
    expect(convert(100, 'PHP', 'EUR', rates)).toBe(1)
  })
  it('returns null when a rate is missing', () => {
    expect(convert(1, 'USD', 'JPY', rates)).toBeNull()
    expect(convert(1, 'USD', 'PHP', null)).toBeNull()
  })
})

describe('valueCollection', () => {
  it('totals NM raw entries and multiplies by quantity', () => {
    const v = valueCollection([row('1', { quantity: 3 })], pricing, null, 'USD')
    expect(v.totalValue).toBe(30)
    expect(v.pricedEntries).toBe(1)
    expect(v.latestObservedAt).toBe('2026-11-16T00:00:00Z')
  })

  it('excludes graded, non-NM and unknown printings from the total', () => {
    const v = valueCollection(
      [
        row('g', { is_graded: true }),
        row('lp', { condition: 'lightly_played' }),
        row('h', {}, 'holo'),
      ],
      pricing,
      null,
      'USD'
    )
    expect(v.totalValue).toBeNull()
    expect(v.items.get('lp')?.result.status).toBe('reference')
    expect(v.items.get('lp')?.line).toBeNull()
    expect(v.items.get('g')?.result.status).toBe('unavailable')
  })

  it('converts to the display currency and computes gain on paired entries', () => {
    const v = valueCollection(
      [row('1', { purchase_price: '250', purchase_currency: 'PHP' }), row('2', { quantity: 2 })],
      pricing,
      { PHP: 50 },
      'USD'
    )
    expect(v.totalValue).toBe(30)
    expect(v.costBasis).toBe(5)
    expect(v.gain).toBe(5)
    expect(v.gainPercent).toBe(100)
  })

  it('yields null totals when FX rate is missing for the display currency', () => {
    const v = valueCollection([row('1')], pricing, null, 'PHP')
    expect(v.totalValue).toBeNull()
  })
})

describe('valueCollection graded slabs', () => {
  const slab = row('s', { is_graded: true, grading_company: 'PSA', grade: 10, quantity: 2 })

  it('values slabs from cached recent-sale quotes', () => {
    const quotes = new Map([['v-s', { price: 100, currency: 'USD', observedAt: '2026-11-10T00:00:00Z' }]])
    const v = valueCollection([slab], pricing, null, 'USD', { quotes, unavailableReason: 'x' })
    expect(v.totalValue).toBe(200)
    const r = v.items.get('s')?.result
    expect(r?.status === 'priced' && r.quote.source).toContain('JustTCG')
  })

  it('shows the reason when no cached quote exists', () => {
    const v = valueCollection([slab], pricing, null, 'USD', { quotes: new Map(), unavailableReason: 'Not fetched yet' })
    expect(v.totalValue).toBeNull()
    expect(v.items.get('s')?.result).toEqual({ status: 'unavailable', reason: 'Not fetched yet' })
  })
})

describe('totalCost', () => {
  it('sums purchase costs across currencies, skipping unpriced entries', () => {
    const rows = [
      row('1', { purchase_price: '10', purchase_currency: 'USD', quantity: 2 }),
      row('2', { purchase_price: '100', purchase_currency: 'PHP' }),
      row('3'),
    ]
    expect(totalCost(rows, { PHP: 50 }, 'USD')).toBe(22)
  })
  it('is null when nothing has a cost or the rate is missing', () => {
    expect(totalCost([row('1')], null, 'USD')).toBeNull()
    expect(totalCost([row('1', { purchase_price: '5', purchase_currency: 'PHP' })], null, 'USD')).toBeNull()
  })
})
