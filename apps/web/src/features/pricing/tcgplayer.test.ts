import { describe, expect, it } from 'vitest'
import { getMarketQuote, priceItem } from './tcgplayer'

const pricing = {
  tcgplayer: {
    unit: 'USD',
    updated: '2026-11-16T15:30:00Z',
    normal: { lowPrice: 0.02, midPrice: 0.26, highPrice: 25, marketPrice: 0.26 },
    'reverse-holofoil': { lowPrice: 0.17, midPrice: 0.42, highPrice: 19, marketPrice: 0.4 },
  },
}

describe('getMarketQuote', () => {
  it('matches the exact printing', () => {
    const r = getMarketQuote(pricing, 'reverse_holo')
    expect(r).toMatchObject({ available: true, quote: { price: 0.4, matchedKey: 'reverse-holofoil', currency: 'USD' } })
  })

  it('never substitutes another printing', () => {
    expect(getMarketQuote(pricing, 'holo')).toMatchObject({ available: false })
  })

  it('is unavailable without pricing data', () => {
    expect(getMarketQuote(undefined, 'standard')).toMatchObject({ available: false })
  })

  it('refuses ambiguous promo matches', () => {
    const p = { tcgplayer: { normal: { marketPrice: 1 }, holofoil: { marketPrice: 2 } } }
    expect(getMarketQuote(p, 'promo')).toMatchObject({ available: false })
  })

  it('accepts a single unambiguous promo key', () => {
    const p = { tcgplayer: { holofoil: { marketPrice: 2 } } }
    expect(getMarketQuote(p, 'promo')).toMatchObject({ available: true, quote: { price: 2 } })
  })

  it('ignores null market prices', () => {
    const p = { tcgplayer: { normal: { marketPrice: null } } }
    expect(getMarketQuote(p, 'standard')).toMatchObject({ available: false })
  })
})

describe('priceItem', () => {
  it('prices Near Mint raw cards', () => {
    expect(priceItem(pricing, { printing: 'standard', isGraded: false, condition: 'near_mint' }).status).toBe('priced')
  })
  it('gives other conditions a reference only', () => {
    expect(priceItem(pricing, { printing: 'standard', isGraded: false, condition: 'lightly_played' }).status).toBe('reference')
  })
  it('never prices graded slabs from raw data', () => {
    expect(priceItem(pricing, { printing: 'standard', isGraded: true, condition: 'near_mint' }).status).toBe('unavailable')
  })
})
