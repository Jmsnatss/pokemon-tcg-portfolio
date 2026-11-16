import { fetchCollection } from '@/features/collection/list'
import { refreshGradedPrices } from '@/features/pricing/sync-graded'
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/utils/rate-limit'

export const maxDuration = 60

export async function POST(): Promise<Response> {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`refresh-graded:${user.id}`, 4, 60_000)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const rows = await fetchCollection(supabase)
    const summary = await refreshGradedPrices(supabase, createServiceRoleSupabaseClient(), rows)
    return Response.json({ data: summary })
  } catch (err) {
    console.error('[pricing] graded refresh failed:', err instanceof Error ? err.message : 'unknown error')
    return Response.json({ error: 'Failed to refresh graded prices' }, { status: 500 })
  }
}
