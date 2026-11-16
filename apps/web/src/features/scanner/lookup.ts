import { tcgdex, type TCGdexCardSummary } from '@/lib/tcgdex/client'
import { preScore, rankCandidates, type CatalogCandidate, type Hints } from './match'
import type { ScanResult } from '@/types'

const MAX_ENRICH = 8

const searchTerms = (name: string): string[] => {
  const words = [...new Set(name.split(/\s+/).filter((w) => w.replace(/[^A-Za-z]/g, '').length >= 4))]
    .sort((x, y) => y.length - x.length)
    .slice(0, 2)
  return [name, ...words.filter((w) => w !== name)]
}

/** Matches OCR hints against the TCGdex catalog and returns ranked candidates (no confidence scores). */
export async function matchCatalog(hints: Hints): Promise<ScanResult> {
  const started = Date.now()
  const terms = [...new Set(hints.names.flatMap(searchTerms))]
  const lists = await Promise.all(terms.map((name) => tcgdex.searchCardsFiltered({ name })))
  const unique = new Map<string, TCGdexCardSummary>()
  for (const c of lists.flat()) unique.set(c.id, c)

  const brief = (c: TCGdexCardSummary): CatalogCandidate => ({ id: c.id, localId: c.localId, name: c.name, image: c.image ?? null })
  const shortlist = [...unique.values()]
    .map((c) => ({ c, s: preScore(brief(c), hints) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, MAX_ENRICH)

  const enriched: CatalogCandidate[] = await Promise.all(
    shortlist.map(async ({ c }) => {
      const full = await tcgdex.getCard(c.id)
      return {
        ...brief(c),
        image: full?.image ?? c.image ?? null,
        setName: full?.set?.name ?? null,
        setTotal: full?.set?.cardCount?.official ?? null,
      }
    })
  )

  const ranked = rankCandidates(enriched, hints, 5)
  return {
    candidates: ranked.map((c, i) => ({
      cardProviderId: c.id,
      cardName: c.name,
      setName: c.setName ?? '',
      collectorNumber: c.localId,
      confidence: null,
      imageUrl: tcgdex.getCardImageUrl(c.image, 'low'),
      rank: i + 1,
    })),
    scanDurationMs: Date.now() - started,
    provider: 'browser-ocr',
  }
}
