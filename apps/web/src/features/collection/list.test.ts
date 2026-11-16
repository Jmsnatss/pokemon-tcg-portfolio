import { describe, expect, it } from 'vitest'
import { filterCollection, totalCostByCurrency, type CollectionRow } from './list'
import { addToCollectionSchema, updateCollectionItemSchema } from '@/types/catalog'

const row = (over: Partial<CollectionRow> & { name?: string; set?: string }): CollectionRow => ({
  id: over.id ?? 'x',
  card_variant_id: 'v-' + (over.id ?? 'x'),
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
    printing_type: 'standard',
    cards: {
      provider_id: 'a-1',
      name: over.name ?? 'Pikachu',
      collector_number: '1',
      rarity: null,
      image_url: null,
      card_sets: { name: over.set ?? 'Base' },
    },
  },
  ...over,
})

describe('filterCollection', () => {
  const rows = [
    row({ id: '1', name: 'Pikachu', quantity: 2 }),
    row({ id: '2', name: 'Charizard', is_graded: true, quantity: 5, set: 'Obsidian Flames' }),
  ]

  it('filters by name and set, case-insensitively', () => {
    expect(filterCollection(rows, { q: 'CHAR' }).map((r) => r.id)).toEqual(['2'])
    expect(filterCollection(rows, { q: 'obsidian' }).map((r) => r.id)).toEqual(['2'])
  })

  it('filters raw vs graded', () => {
    expect(filterCollection(rows, { type: 'raw' }).map((r) => r.id)).toEqual(['1'])
    expect(filterCollection(rows, { type: 'graded' }).map((r) => r.id)).toEqual(['2'])
  })

  it('sorts by quantity and name', () => {
    expect(filterCollection(rows, { sort: 'quantity' }).map((r) => r.id)).toEqual(['2', '1'])
    expect(filterCollection(rows, { sort: 'name' }).map((r) => r.id)).toEqual(['2', '1'])
  })
})

describe('totalCostByCurrency', () => {
  it('multiplies by quantity and keeps currencies separate', () => {
    const totals = totalCostByCurrency([
      row({ purchase_price: '10.50', purchase_currency: 'USD', quantity: 2 }),
      row({ purchase_price: '100', purchase_currency: 'PHP' }),
      row({ purchase_price: null }),
    ])
    expect(totals).toEqual({ USD: 21, PHP: 100 })
  })
})

describe('graded schema', () => {
  const base = { providerId: 'swsh3-136', printingType: 'standard', quantity: 1, condition: 'near_mint' }

  it('accepts a valid graded slab', () => {
    const r = addToCollectionSchema.parse({ ...base, gradingCompany: 'PSA', grade: '10', certNumber: '123' })
    expect(r.grade).toBe(10)
  })

  it.each([
    { gradingCompany: 'PSA', grade: '9.5' },
    { gradingCompany: 'PSA' },
    { grade: '9' },
    { gradingCompany: 'XYZ', grade: '9' },
  ])('rejects %o', (o) => {
    expect(addToCollectionSchema.safeParse({ ...base, ...o }).success).toBe(false)
  })

  it('treats blank grading fields as raw', () => {
    expect(addToCollectionSchema.safeParse({ ...base, gradingCompany: '', grade: '' }).success).toBe(true)
  })
})

describe('updateCollectionItemSchema', () => {
  it('allows clearing optional fields with empty strings', () => {
    const r = updateCollectionItemSchema.parse({ quantity: '3', purchasePrice: '', purchaseDate: '' })
    expect(r.quantity).toBe(3)
    expect(r.purchasePrice).toBeUndefined()
  })
  it('rejects bad quantity', () => {
    expect(updateCollectionItemSchema.safeParse({ quantity: 0 }).success).toBe(false)
  })
})
