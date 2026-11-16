import { z } from 'zod'
import { matchCatalog } from '@/features/scanner/lookup'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/utils/rate-limit'

const bodySchema = z.object({
  names: z.array(z.string().trim().min(2).max(60)).min(1).max(3),
  number: z.string().trim().max(12).nullish(),
  total: z.string().trim().max(12).nullish(),
})

export async function POST(request: Request): Promise<Response> {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`scan:${user.id}`, 30, 60_000)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'Provide at least one card name' }, { status: 400 })

  const data = await matchCatalog({
    names: parsed.data.names,
    number: parsed.data.number ?? null,
    total: parsed.data.total ?? null,
  })
  return Response.json({ data })
}
