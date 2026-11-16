import { normaliseNumber } from './parse'

export type CatalogCandidate = {
  id: string
  localId: string
  name: string
  image: string | null
  setName?: string | null
  setTotal?: number | null
}

export type Hints = { names: string[]; number: string | null; total: string | null }

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Levenshtein distance. */
function distance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

/** 0..1 similarity of two names after normalisation; tolerant of OCR slips. */
export function similarity(a: string, b: string): number {
  const x = norm(a)
  const y = norm(b)
  const len = Math.max(x.length, y.length)
  return len === 0 ? 0 : 1 - distance(x, y) / len
}

/** Cheap score from the brief card data only; used to decide which cards to enrich. */
export function preScore(c: CatalogCandidate, h: Hints): number {
  let score = 0
  const name = norm(c.name)
  h.names.forEach((n, i) => {
    const hint = norm(n)
    if (!hint) return
    const weight = i === 0 ? 1 : 0.6
    if (name === hint) score = Math.max(score, 6 * weight)
    else if (name.startsWith(hint) || hint.startsWith(name)) score = Math.max(score, 4 * weight)
    else if (name.includes(hint) || hint.includes(name)) score = Math.max(score, 2.5 * weight)
    const sim = similarity(name, hint)
    if (sim >= 0.7) score = Math.max(score, 5 * sim * weight)
  })
  if (h.number && normaliseNumber(c.localId) === normaliseNumber(h.number)) score += 5
  return score
}

/** Final score once set info is known. Total match is a strong signal for set identity. */
export function finalScore(c: CatalogCandidate, h: Hints): number {
  let score = preScore(c, h)
  if (score === 0) return 0
  const total = h.total ? Number(h.total.replace(/\D/g, '')) : NaN
  if (Number.isFinite(total) && c.setTotal && c.setTotal === total) score += 3
  return score
}

/** Ranks candidates; ties are broken by name then id so results are stable. */
export function rankCandidates(cs: CatalogCandidate[], h: Hints, limit = 5): (CatalogCandidate & { score: number })[] {
  return cs
    .map((c) => ({ ...c, score: finalScore(c, h) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
    .slice(0, limit)
}
