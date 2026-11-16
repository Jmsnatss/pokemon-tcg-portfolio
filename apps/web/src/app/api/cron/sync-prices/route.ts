import { timingSafeEqual } from 'node:crypto'
import { syncPrices } from '@/features/portfolio/sync'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/server'

export const maxDuration = 60

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const given = Buffer.from(request.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

async function handle(request: Request): Promise<Response> {
  if (!process.env.CRON_SECRET) return Response.json({ error: 'Cron is not configured' }, { status: 503 })
  if (!authorised(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const summary = await syncPrices(createServiceRoleSupabaseClient())
    return Response.json({ data: summary })
  } catch (err) {
    console.error('[cron] price sync failed:', err instanceof Error ? err.message : 'unknown error')
    return Response.json({ error: 'Price sync failed' }, { status: 500 })
  }
}

export const GET = handle
export const POST = handle
