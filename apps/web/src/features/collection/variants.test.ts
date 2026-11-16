import { describe, expect, it } from 'vitest'
import { getAvailablePrintings } from './variants'
import { addToCollectionSchema } from '@/types/catalog'

describe('getAvailablePrintings', () => {
  it('maps TCGdex variant flags to printings', () => {
    expect(
      getAvailablePrintings({ variants: { normal: true, reverse: true, holo: false, firstEdition: false, wPromo: false } })
    ).toEqual(['standard', 'reverse_holo'])
  })

  it('returns an empty list when variant data is missing', () => {
    expect(getAvailablePrintings({})).toEqual([])
  })
})

describe('addToCollectionSchema', () => {
  const base = { providerId: 'swsh3-136', printingType: 'standard', quantity: '2', condition: 'near_mint' }

  it('accepts valid input and coerces quantity', () => {
    const r = addToCollectionSchema.parse(base)
    expect(r.quantity).toBe(2)
    expect(r.purchaseCurrency).toBe('USD')
  })

  it('treats empty optional strings as undefined', () => {
    const r = addToCollectionSchema.parse({ ...base, purchasePrice: '', purchaseDate: '' })
    expect(r.purchasePrice).toBeUndefined()
    expect(r.purchaseDate).toBeUndefined()
  })

  it.each([
    { quantity: '0' },
    { printingType: 'psa10' },
    { providerId: '../etc' },
    { purchasePrice: '-5' },
    { condition: 'mint' },
  ])('rejects invalid input %o', (override) => {
    expect(addToCollectionSchema.safeParse({ ...base, ...override }).success).toBe(false)
  })
})
