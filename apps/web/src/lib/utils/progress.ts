export type TrainerRank = {
  title: string
  level: number
  /** Total cards needed for the next rank, or null at max rank. */
  nextAt: number | null
  /** 0-100 progress toward the next rank. */
  progress: number
}

const RANKS: { title: string; min: number }[] = [
  { title: 'Rookie Trainer', min: 0 },
  { title: 'Trainer', min: 10 },
  { title: 'Ace Trainer', min: 50 },
  { title: 'Gym Leader', min: 150 },
  { title: 'Elite Four', min: 400 },
  { title: 'Champion', min: 1000 },
]

/** Derives a display rank from the real number of cards owned. */
export function getTrainerRank(totalCards: number): TrainerRank {
  const n = Math.max(0, Math.floor(totalCards))
  let idx = 0
  RANKS.forEach((r, i) => {
    if (n >= r.min) idx = i
  })
  const next = RANKS[idx + 1]
  const progress = next ? Math.round(((n - RANKS[idx].min) / (next.min - RANKS[idx].min)) * 100) : 100
  return { title: RANKS[idx].title, level: idx + 1, nextAt: next?.min ?? null, progress }
}

export type RarityTier = 'common' | 'rare' | 'holo' | 'ultra'

/** Maps a TCGdex rarity string to a visual tier. Cosmetic only. */
export function rarityTier(rarity: string | null | undefined): RarityTier {
  const r = (rarity ?? '').toLowerCase()
  if (/(secret|ultra|hyper|special illustration|illustration rare|rainbow|gold|shiny ultra)/.test(r)) return 'ultra'
  if (/(holo|\bex\b|\bgx\b|\bvmax\b|\bv\b|full art|double rare|shiny)/.test(r)) return 'holo'
  if (/rare/.test(r)) return 'rare'
  return 'common'
}
