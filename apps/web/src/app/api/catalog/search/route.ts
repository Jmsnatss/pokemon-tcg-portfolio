import { applyCatalogView, PAGE_SIZE } from '@/features/catalog/view'
import { fetchCollection } from '@/features/collection/list'
import { fetchPricingByCard } from '@/features/pricing/catalog-prices'
import { getHeadlineQuote } from '@/features/pricing/tcgplayer'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { tcgdex } from '@/lib/tcgdex/client'
import { rateLimit } from '@/lib/utils/rate-limit'
import { catalogSearchSchema, type CatalogSearchResult } from '@/types/catalog'

export async function GET(request: Request): Promise<Response> {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`search:${user.id}`, 60, 60_000)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  const params = Object.fromEntries(new URL(request.url).searchParams)
  const parsed = catalogSearchSchema.safeParse(params)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const f = parsed.data

  const [matches, collection] = await Promise.all([
    tcgdex.searchCardsFiltered({ name: f.q, category: f.category, rarity: f.rarity, type: f.type, setId: f.set }),
    fetchCollection(supabase),
  ])

  const ownedQty = new Map<string, number>()
  for (const r of collection) {
    const id = r.card_variants?.cards?.provider_id
    if (id) ownedQty.set(id, (ownedQty.get(id) ?? 0) + r.quantity)
  }

  const { items, total, hasMore } = applyCatalogView(matches, ownedQty, { owned: f.owned, sort: f.sort, page: f.page })
  const pageItems = items.slice((f.page - 1) * PAGE_SIZE)
  const pricing = await fetchPricingByCard(pageItems.map((c) => c.id), 10)

  const data: CatalogSearchResult[] = pageItems.map((c) => {
    const headline = getHeadlineQuote(pricing.get(c.id))
    return {
      id: c.id,
      localId: c.localId,
      name: c.name,
      imageUrl: tcgdex.getCardImageUrl(c.image, 'low'),
      price: headline
        ? { amount: headline.quote.price, currency: headline.quote.currency, printing: headline.printing }
        : null,
      ownedQuantity: ownedQty.get(c.id),
    }
  })

  return Response.json({ data, total, hasMore, page: f.page, pageSize: PAGE_SIZE })
}
