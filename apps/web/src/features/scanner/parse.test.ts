import { describe, expect, it } from 'vitest'
import { rankCandidates, preScore, similarity } from './match'
import { extractCollectorNumber, extractNameCandidates, normaliseNumber } from './parse'

describe('extractCollectorNumber', () => {
  it.each([
    ['Illus. Mitsuhiro Arita  136/189 R', '136', '189'],
    ['TG05/TG30', 'TG05', 'TG30'],
    ['  4 / 102  ', '4', '102'],
    ['hello 044|189', '044', '189'],
  ])('parses %s', (text, number, total) => {
    expect(extractCollectorNumber(text)).toEqual({ number, total })
  })

  it('parses promo numbers without a total', () => {
    expect(extractCollectorNumber('SWSH 123 PROMO')).toEqual({ number: 'SWSH123', total: null })
  })

  it('returns null when there is no number', () => {
    expect(extractCollectorNumber('Pikachu lightning')).toBeNull()
  })
})

describe('normaliseNumber', () => {
  it('ignores leading zeros and case', () => {
    expect(normaliseNumber('003')).toBe('3')
    expect(normaliseNumber('tg05')).toBe('TG5')
    expect(normaliseNumber('TG005')).toBe('TG5')
    expect(normaliseNumber(null)).toBe('')
  })
})

describe('extractNameCandidates', () => {
  it('strips stage labels and HP values', () => {
    expect(extractNameCandidates('BASIC\nSurfing Pikachu VMAX 310 HP\n')).toEqual(['Surfing Pikachu VMAX'])
  })
  it('skips junk lines and returns best guesses first', () => {
    expect(extractNameCandidates('~~\n12\nStage 1 Furret HP 110\nEvolves from Sentret')).toEqual(['Furret', 'Sentret'])
  })
  it('returns an empty list for noise', () => {
    expect(extractNameCandidates('||| 12 ..')).toEqual([])
  })
})

describe('rankCandidates', () => {
  const cs = [
    { id: 'a-1', localId: '1', name: 'Pikachu', image: null, setTotal: 102 },
    { id: 'b-25', localId: '25', name: 'Pikachu', image: null, setTotal: 189 },
    { id: 'c-25', localId: '25', name: 'Pikachu V', image: null, setTotal: 189 },
    { id: 'd-9', localId: '9', name: 'Raichu', image: null, setTotal: 189 },
  ]

  it('prefers exact name + number + set total', () => {
    const r = rankCandidates(cs, { names: ['Pikachu'], number: '025', total: '189' })
    expect(r[0].id).toBe('b-25')
    expect(r.map((x) => x.id)).not.toContain('d-9')
  })

  it('falls back to name matches when no number is read', () => {
    const r = rankCandidates(cs, { names: ['Pikachu'], number: null, total: null })
    expect(r.map((x) => x.id).slice(0, 2).sort()).toEqual(['a-1', 'b-25'])
  })

  it('returns nothing without any usable hints', () => {
    expect(rankCandidates(cs, { names: [], number: null, total: null })).toEqual([])
  })

  it('scores a name-only prefix match below an exact one', () => {
    const h = { names: ['Pikachu'], number: null, total: null }
    expect(preScore(cs[0], h)).toBeGreaterThan(preScore(cs[2], h))
  })
})

describe('fuzzy matching of noisy OCR names', () => {
  it('scores near-identical names highly and unrelated names low', () => {
    expect(similarity('Surfing Pikachu VMAX', 'Surfing Rikachu Vax')).toBeGreaterThan(0.85)
    expect(similarity('Charizard', 'Bulbasaur')).toBeLessThan(0.3)
  })

  it('ranks the right card first despite OCR errors', () => {
    const cs = [
      { id: 'cel25-8', localId: '8', name: 'Surfing Pikachu V', image: null },
      { id: 'cel25-9', localId: '9', name: 'Surfing Pikachu VMAX', image: null },
      { id: 'swsh4-44', localId: '44', name: 'Pikachu VMAX', image: null },
    ]
    const r = rankCandidates(cs, { names: ['Surfing Rikachu Vax'], number: null, total: null })
    expect(r[0].id).toBe('cel25-9')
  })
})
