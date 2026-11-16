import { addToCollection } from '@/features/collection/add-to-collection'
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/utils/rate-limit'
import { addToCollectionSchema } from '@/types/catalog'

export async function POST(request: Request): Promise<Response> {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`collection:${user.id}`, 30, 60_000)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body: unknown = await request.json().catch(() => null)
  const parsed = addToCollectionSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const result = await addToCollection(supabase, createServiceRoleSupabaseClient(), user.id, parsed.data)
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status })
    return Response.json({ data: { id: result.itemId } }, { status: 201 })
  } catch (err) {
    console.error('[collection] add failed:', err instanceof Error ? err.message : 'unknown error')
    return Response.json({ error: 'Failed to add card to collection' }, { status: 500 })
  }
}
