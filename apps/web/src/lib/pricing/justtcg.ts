/**
 * Minimal JustTCG v2 client (graded lookups only).
 * Docs: https://justtcg.com/docs/api/cards-v2
 *
 * Free tier limits: 1,000 requests/month, 100/day, 10/minute. The guards below
 * keep this app well inside them: a conservative per-day budget and a minimum
 * gap between calls. Counters are per server process.
 */

export type JustTcgMarket = {
  region: string
  currency: string
  price: number | null
  price_status: 'current' | 'expired' | 'unpriced' | string
  last_price: number | null
  updated_at: number | null
  last_sale_at: number | null
  price_expires_at: number | null
}

export type JustTcgVariant = {
  id: string
  type: 'raw' | 'graded' | string
  condition: string | null
  printing: string | null
  grading: {
    company: string
    grade: number | null
    grade_label: string | null
    qualifier: string | null
    canonical: string
  } | null
  markets: JustTcgMarket[]
}

export type JustTcgCard = {
  id: string
  name: string
  number?: string
  external_ids?: { tcgplayer: string | null }
  variants: JustTcgVariant[]
}

export type JustTcgResult =
  | { ok: true; cards: JustTcgCard[] }
  | { ok: false; reason: string }

const BASE_URL = 'https://api.justtcg.com/v2'
const DAILY_BUDGET = 90
const MIN_GAP_MS = 6500

let day = ''
let used = 0
let lastCallAt = 0
let queue: Promise<unknown> = Promise.resolve()

export function isJustTcgConfigured(): boolean {
  return Boolean(process.env.JUSTTCG_API_KEY)
}

export function remainingDailyBudget(now = new Date()): number {
  return now.toISOString().slice(0, 10) === day ? Math.max(0, DAILY_BUDGET - used) : DAILY_BUDGET
}

/** Looks up every graded variant of one company for a card, by TCGplayer product id. */
export function fetchGradedByTcgplayerId(tcgplayerId: string, company: string): Promise<JustTcgResult> {
  const run = queue.then(() => doFetch(tcgplayerId, company))
  queue = run.catch(() => undefined)
  return run
}

async function doFetch(tcgplayerId: string, company: string): Promise<JustTcgResult> {
  const key = process.env.JUSTTCG_API_KEY
  if (!key) return { ok: false, reason: 'JUSTTCG_API_KEY is not set' }

  const today = new Date().toISOString().slice(0, 10)
  if (today !== day) {
    day = today
    used = 0
  }
  if (used >= DAILY_BUDGET) return { ok: false, reason: 'Daily JustTCG request budget reached; try again tomorrow' }

  const wait = lastCallAt + MIN_GAP_MS - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastCallAt = Date.now()
  used += 1

  const params = new URLSearchParams({ tcgplayer_id: tcgplayerId, graded: 'only', grading_company: company })
  try {
    const res = await fetch(`${BASE_URL}/cards?${params}`, {
      headers: { 'x-api-key': key, Accept: 'application/json' },
      cache: 'no-store',
    })
    if (res.status === 429) return { ok: false, reason: 'JustTCG rate limit hit; try again shortly' }
    if (res.status === 401 || res.status === 403) return { ok: false, reason: 'JustTCG rejected the API key' }
    if (res.status === 404) return { ok: true, cards: [] }
    if (!res.ok) return { ok: false, reason: `JustTCG error ${res.status}` }
    const json = (await res.json()) as { data?: JustTcgCard[] }
    return { ok: true, cards: json.data ?? [] }
  } catch {
    return { ok: false, reason: 'Could not reach JustTCG' }
  }
}
