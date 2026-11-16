import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/utils/rate-limit'
import { collectionItemIdSchema, updateCollectionItemSchema } from '@/types/catalog'

type Ctx = { params: Promise<{ id: string }> }

type Auth =
  | { ok: false; response: Response }
  | { ok: true; supabase: SupabaseClient; user: User; id: string }

async function authorize(id: string): Promise<Auth> {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { ok: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!rateLimit(`collection:${user.id}`, 60, 60_000)) {
    return { ok: false, response: Response.json({ error: 'Too many requests' }, { status: 429 }) }
  }
  const parsedId = collectionItemIdSchema.safeParse(id)
  if (!parsedId.success) return { ok: false, response: Response.json({ error: 'Invalid item id' }, { status: 400 }) }
  return { ok: true, supabase, user, id: parsedId.data }
}

/** Full replace of the editable fields: omitted optional fields are cleared. */
export async function PATCH(request: Request, { params }: Ctx): Promise<Response> {
  const auth = await authorize((await params).id)
  if (!auth.ok) return auth.response
  const { supabase, user, id } = auth

  const parsed = updateCollectionItemSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const v = parsed.data

  const { data, error } = await supabase
    .from('collection_items')
    .update({
      ...(v.quantity !== undefined && { quantity: v.quantity }),
      ...(v.condition !== undefined && { condition: v.condition }),
      purchase_price: v.purchasePrice ?? null,
      purchase_currency: v.purchasePrice ? v.purchaseCurrency : null,
      purchase_date: v.purchaseDate ?? null,
      notes: v.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[collection] update failed:', error.message)
    return Response.json({ error: 'Failed to update item' }, { status: 500 })
  }
  if (!data) return Response.json({ error: 'Item not found' }, { status: 404 })
  return Response.json({ data: { id: data.id } })
}

export async function DELETE(_request: Request, { params }: Ctx): Promise<Response> {
  const auth = await authorize((await params).id)
  if (!auth.ok) return auth.response
  const { supabase, user, id } = auth

  const { data, error } = await supabase
    .from('collection_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[collection] delete failed:', error.message)
    return Response.json({ error: 'Failed to delete item' }, { status: 500 })
  }
  if (!data) return Response.json({ error: 'Item not found' }, { status: 404 })
  return Response.json({ data: { id: data.id } })
}
