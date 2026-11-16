/**
 * TCGdex API client
 * Documentation: https://tcgdex.dev/
 * No API key required. Free and open.
 */

const BASE_URL = process.env.NEXT_PUBLIC_TCGDEX_BASE_URL ?? 'https://api.tcgdex.net/v2'
const DEFAULT_LANG = 'en'

export interface TCGdexSet {
  id: string
  name: string
  serie: { id: string; name: string } | null
  releaseDate: string | null
  cardCount: { total: number; official: number } | null
  logo: string | null
  symbol: string | null
}

export interface TCGdexCard {
  id: string
  localId: string
  name: string
  set: TCGdexSet
  rarity: string | null
  category: string | null
  hp: number | null
  types: string[] | null
  illustrator: string | null
  image: string | null
  variants?: {
    normal?: boolean
    reverse?: boolean
    holo?: boolean
    firstEdition?: boolean
    wPromo?: boolean
  }
  pricing?: {
    tcgplayer?: {
      unit?: string
      updated?: string
      [printing: string]: unknown
    }
  }
  // Attacks, abilities, etc. available in full response
  [key: string]: unknown
}

export interface TCGdexCardSummary {
  id: string
  localId: string
  name: string
  image: string | null
}

export interface TCGdexSetWithCards extends TCGdexSet {
  cards: TCGdexCardSummary[]
}

class TCGdexClient {
  private async fetch<T>(path: string, lang = DEFAULT_LANG): Promise<T | null> {
    const url = `${BASE_URL}/${lang}/${path}`

    try {
      const res = await fetch(url, {
        next: { revalidate: 3600 },  // Cache for 1 hour
        headers: { 'Accept': 'application/json' },
      })

      if (res.status === 404) return null
      if (!res.ok) {
        console.error(`[TCGdex] ${res.status} ${res.statusText} — ${url}`)
        return null
      }

      return res.json() as Promise<T>
    } catch (err) {
      console.error(`[TCGdex] Network error fetching ${url}:`, err)
      return null
    }
  }

  /**
   * List all card sets (series-grouped)
   */
  async listSets(lang = DEFAULT_LANG): Promise<TCGdexSet[]> {
    const data = await this.fetch<TCGdexSet[]>('sets', lang)
    return data ?? []
  }

  /**
   * Get a single set with its card list
   */
  async getSet(setId: string, lang = DEFAULT_LANG): Promise<TCGdexSetWithCards | null> {
    return this.fetch<TCGdexSetWithCards>(`sets/${setId}`, lang)
  }

  /**
   * Search cards by name (uses TCGdex filter)
   */
  async searchCards(
    query: string,
    lang = DEFAULT_LANG
  ): Promise<TCGdexCardSummary[]> {
    if (!query.trim()) return []
    const encoded = encodeURIComponent(query.trim())
    const data = await this.fetch<TCGdexCardSummary[]>(`cards?name=${encoded}`, lang)
    return data ?? []
  }

  /**
   * Get full card details by card ID (e.g. "swsh1-1")
   */
  async getCard(cardId: string, lang = DEFAULT_LANG): Promise<TCGdexCard | null> {
    return this.fetch<TCGdexCard>(`cards/${cardId}`, lang)
  }

  /**
   * Get all cards in a set
   */
  async getCardsBySet(
    setId: string,
    lang = DEFAULT_LANG
  ): Promise<TCGdexCardSummary[]> {
    const set = await this.getSet(setId, lang)
    return set?.cards ?? []
  }

  /**
   * Build the full image URL for a card
   * TCGdex image pattern: {image}/high.webp or /low.webp
   */
  getCardImageUrl(imageBase: string | null, quality: 'high' | 'low' = 'high'): string | null {
    if (!imageBase) return null
    return `${imageBase}/${quality}.webp`
  }
}

export const tcgdex = new TCGdexClient()

