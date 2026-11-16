import { tcgdex, type TCGdexCard } from '@/lib/tcgdex/client'

/** Fetches pricing blocks for card ids with bounded concurrency (TCGdex responses are cached for 1h). */
export async function fetchPricingByCard(
  providerIds: string[],
  concurrency = 8
): Promise<Map<string, TCGdexCard['pricing']>> {
  const ids = [...new Set(providerIds)]
  const out = new Map<string, TCGdexCard['pricing']>()
  let next = 0
  const worker = async (): Promise<void> => {
    while (next < ids.length) {
      const id = ids[next++]
      const card = await tcgdex.getCard(id)
      out.set(id, card?.pricing)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker))
  return out
}
