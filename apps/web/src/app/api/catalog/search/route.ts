import { createServerSupabaseClient } from '@/lib/supabase/server'
import { tcgdex } from '@/lib/tcgdex/client'
import { rateLimit } from '@/lib/utils/rate-limit'
import { catalogSearchSchema, type CatalogSearchResult } from '@/types/catalog'

const MAX_RESULTS = 60

export async function GET(request: Request): Promise<Response> {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`search:${user.id}`, 60, 60_000)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  const parsed = catalogSearchSchema.safeParse({
    q: new URL(request.url).searchParams.get('q') ?? '',
  })
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const results = await tcgdex.searchCards(parsed.data.q)
  const data: CatalogSearchResult[] = results.slice(0, MAX_RESULTS).map((c) => ({
    id: c.id,
    localId: c.localId,
    name: c.name,
    imageUrl: tcgdex.getCardImageUrl(c.image, 'low'),
  }))

  return Response.json({ data, total: results.length })
}
