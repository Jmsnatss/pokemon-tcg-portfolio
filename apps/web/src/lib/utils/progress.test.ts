import { describe, expect, it } from 'vitest'
import { getTrainerRank, rarityTier } from './progress'

describe('getTrainerRank', () => {
  it('starts as Rookie Trainer at 0 cards', () => {
    expect(getTrainerRank(0)).toEqual({ title: 'Rookie Trainer', level: 1, nextAt: 10, progress: 0 })
  })
  it('advances at thresholds and reports progress', () => {
    expect(getTrainerRank(10).title).toBe('Trainer')
    expect(getTrainerRank(30)).toMatchObject({ title: 'Trainer', progress: 50 })
  })
  it('caps at Champion', () => {
    expect(getTrainerRank(5000)).toEqual({ title: 'Champion', level: 6, nextAt: null, progress: 100 })
  })
  it('clamps invalid input', () => {
    expect(getTrainerRank(-5).level).toBe(1)
  })
})

describe('rarityTier', () => {
  it.each([
    ['Common', 'common'],
    ['Uncommon', 'common'],
    [null, 'common'],
    ['Rare', 'rare'],
    ['Rare Holo', 'holo'],
    ['Double rare', 'holo'],
    ['Special illustration rare', 'ultra'],
    ['Secret Rare', 'ultra'],
  ])('%s -> %s', (input, expected) => {
    expect(rarityTier(input)).toBe(expected)
  })
})
