import { syncPrices } from '@/features/portfolio/sync'
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/utils/rate-limit'

export const maxDuration = 60

export async function POST(): Promise<Response> {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`snapshot:${user.id}`, 5, 60_000)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const summary = await syncPrices(createServiceRoleSupabaseClient(), { userId: user.id })
    return Response.json({ data: summary })
  } catch (err) {
    console.error('[portfolio] snapshot failed:', err instanceof Error ? err.message : 'unknown error')
    return Response.json({ error: 'Failed to record snapshot' }, { status: 500 })
  }
}
