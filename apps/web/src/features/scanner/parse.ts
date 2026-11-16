export type CollectorNumber = { number: string; total: string | null }

const NOISE_WORDS = new Set([
  'basic', 'stage', 'stage1', 'stage2', 'hp', 'trainer', 'supporter', 'item', 'tool', 'stadium', 'energy',
  'pokemon', 'pokémon', 'evolves', 'from', 'put', 'on', 'the', 'ability', 'weakness', 'resistance', 'retreat', 'cost',
])

/**
 * Finds a collector number such as "136/189", "TG05/TG30" or "SWSH123" in OCR text.
 * Returns null when nothing plausible is found.
 */
export function extractCollectorNumber(text: string): CollectorNumber | null {
  const t = text.toUpperCase()
  const pair = t.match(/\b([A-Z]{0,4}\d{1,3})\s*[/\x5c|]\s*([A-Z]{0,4}\d{1,3})\b/)
  if (pair) return { number: pair[1], total: pair[2] }
  const promo = t.match(/\b((?:SWSH|SVP|SV|XY|SM|BW|HGSS|DP|SMP|BWP)[-\s]?[A-Z]?\d{1,3})\b/)
  if (promo) return { number: promo[1].replace(/[-\s]/g, ''), total: null }
  return null
}

/** Normalises a collector number for comparison ("003" == "3", "tg05" == "TG05"). */
export function normaliseNumber(n: string | null | undefined): string {
  if (!n) return ''
  const m = n.trim().toUpperCase().match(/^([A-Z-]*)0*(\d+)$/)
  return m ? `${m[1]}${m[2]}` : n.trim().toUpperCase()
}

/**
 * Extracts likely card-name candidates from the OCR text of the top band.
 * Strips stage labels, HP values and symbols; returns best guesses first.
 */
export function extractNameCandidates(text: string, max = 3): string[] {
  const out: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const cleaned = raw
      .replace(/\b\d+\s*HP\b/gi, ' ')
      .replace(/\bHP\s*\d+\b/gi, ' ')
      .replace(/[^A-Za-zÀ-ÿ'’.:\- ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (cleaned.length < 3) continue
    const words = cleaned.split(' ').filter((w) => !NOISE_WORDS.has(w.toLowerCase().replace(/[^a-z0-9é]/g, '')))
    const candidate = words.filter((w) => w.length > 1 || /[A-Za-z]/.test(w)).join(' ').trim()
    if (candidate.length >= 3 && /[A-Za-z]{3}/.test(candidate) && !out.includes(candidate)) out.push(candidate)
    if (out.length >= max) break
  }
  return out
}
