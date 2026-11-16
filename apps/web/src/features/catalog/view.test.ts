import { describe, expect, it } from 'vitest'
import { applyCatalogView, filterByPrice, sortByPrice } from './view'

const c = (id: string, name: string, localId: string) => ({ id, name, localId, image: null })
const cards = [c('b-10', 'Bulbasaur', '10'), c('a-2', 'Pikachu', '2'), c('a-1', 'Charmander', '1')]

describe('applyCatalogView', () => {
  const owned = new Map([['a-2', 3]])

  it('filters by portfolio status', () => {
    expect(applyCatalogView(cards, owned, { owned: 'owned', sort: 'name', page: 1 }).items.map((x) => x.id)).toEqual(['a-2'])
    expect(applyCatalogView(cards, owned, { owned: 'missing', sort: 'name', page: 1 }).total).toBe(2)
  })

  it('sorts by name and by set/number', () => {
    expect(applyCatalogView(cards, owned, { owned: 'all', sort: 'name', page: 1 }).items.map((x) => x.name)).toEqual([
      'Bulbasaur',
      'Charmander',
      'Pikachu',
    ])
    expect(applyCatalogView(cards, owned, { owned: 'all', sort: 'number', page: 1 }).items.map((x) => x.id)).toEqual([
      'a-1',
      'a-2',
      'b-10',
    ])
  })

  it('pages cumulatively and reports hasMore', () => {
    const r = applyCatalogView(cards, owned, { owned: 'all', sort: 'name', page: 1 }, 2)
    expect(r.items).toHaveLength(2)
    expect(r.hasMore).toBe(true)
    expect(applyCatalogView(cards, owned, { owned: 'all', sort: 'name', page: 2 }, 2).hasMore).toBe(false)
  })
})

describe('price helpers', () => {
  const items = [{ id: 1, price: { amount: 5 } }, { id: 2, price: { amount: 50 } }, { id: 3, price: null }]

  it('filters by range and drops unpriced cards when a range is set', () => {
    expect(filterByPrice(items, 10, null).map((i) => i.id)).toEqual([2])
    expect(filterByPrice(items, null, 10).map((i) => i.id)).toEqual([1])
    expect(filterByPrice(items, null, null)).toHaveLength(3)
  })

  it('sorts with unpriced cards last', () => {
    expect(sortByPrice(items, 'desc').map((i) => i.id)).toEqual([2, 1, 3])
    expect(sortByPrice(items, 'asc').map((i) => i.id)).toEqual([1, 2, 3])
  })
})
