import type { SupabaseClient } from '@supabase/supabase-js'
import { tcgdex, type TCGdexCard } from '@/lib/tcgdex/client'
import type { AddToCollectionInput } from '@/types/catalog'
import { getAvailablePrintings } from './variants'

export type AddToCollectionResult =
  | { ok: true; itemId: string }
  | { ok: false; status: number; error: string }

/**
 * Upserts the TCGdex set + card into the local catalog cache and returns the
 * card_variants id for the requested printing. Must be called with a
 * service-role client (catalog tables are read-only for regular users).
 */
async function ensureCardVariant(
  admin: SupabaseClient,
  card: TCGdexCard,
  printingType: string,
  grading: { company: string; grade: number } | null
): Promise<string> {
  let setRowId: string | null = null
  if (card.set?.id) {
    const { data, error } = await admin
      .from('card_sets')
      .upsert(
        {
          provider_id: card.set.id,
          name: card.set.name,
          series: card.set.serie?.name ?? null,
          release_date: card.set.releaseDate ?? null,
          total_cards: card.set.cardCount?.total ?? null,
          logo_url: card.set.logo ?? null,
          symbol_url: card.set.symbol ?? null,
        },
        { onConflict: 'provider_id' }
      )
      .select('id')
      .single()
    if (error) throw new Error(`card_sets upsert failed: ${error.message}`)
    setRowId = data.id
  }

  const { data: cardRow, error: cardErr } = await admin
    .from('cards')
    .upsert(
      {
        provider_id: card.id,
        set_id: setRowId,
        name: card.name,
        collector_number: card.localId,
        rarity: card.rarity ?? null,
        category: card.category ?? null,
        hp: typeof card.hp === 'number' ? card.hp : null,
        energy_types: card.types ?? [],
        illustrator: card.illustrator ?? null,
        image_url: tcgdex.getCardImageUrl(card.image, 'low'),
        image_url_hd: tcgdex.getCardImageUrl(card.image, 'high'),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'provider_id' }
    )
    .select('id')
    .single()
  if (cardErr) throw new Error(`cards upsert failed: ${cardErr.message}`)

  let lookup = admin
    .from('card_variants')
    .select('id')
    .eq('card_id', cardRow.id)
    .eq('printing_type', printingType)
    .eq('language', 'en')
  lookup = grading
    ? lookup.eq('grading_company', grading.company).eq('grade', grading.grade)
    : lookup.is('grading_company', null).is('grade', null)
  const { data: existing, error: findErr } = await lookup.maybeSingle()
  if (findErr) throw new Error(`card_variants lookup failed: ${findErr.message}`)
  if (existing) return existing.id

  const { data: created, error: insErr } = await admin
    .from('card_variants')
    .insert({
      card_id: cardRow.id,
      printing_type: printingType,
      language: 'en',
      grading_company: grading?.company ?? null,
      grade: grading?.grade ?? null,
    })
    .select('id')
    .single()
  if (insErr) throw new Error(`card_variants insert failed: ${insErr.message}`)
  return created.id
}

/**
 * Adds a raw card to the signed-in user's collection.
 * @param userClient anon-key client with the user's session (RLS enforced)
 * @param admin service-role client used only for the shared catalog cache
 */
export async function addToCollection(
  userClient: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
  input: AddToCollectionInput
): Promise<AddToCollectionResult> {
  const card = await tcgdex.getCard(input.providerId)
  if (!card) return { ok: false, status: 404, error: 'Card not found in catalog' }

  const printings = getAvailablePrintings(card)
  if (!printings.includes(input.printingType)) {
    return { ok: false, status: 422, error: 'That printing is not available for this card' }
  }

  const grading =
    input.gradingCompany && input.grade !== undefined
      ? { company: input.gradingCompany, grade: input.grade }
      : null
  const variantId = await ensureCardVariant(admin, card, input.printingType, grading)

  const { data, error } = await userClient
    .from('collection_items')
    .insert({
      user_id: userId,
      card_variant_id: variantId,
      quantity: input.quantity,
      condition: input.condition,
      is_graded: grading !== null,
      grading_company: grading?.company ?? null,
      grade: grading?.grade ?? null,
      cert_number: grading ? input.certNumber ?? null : null,
      purchase_price: input.purchasePrice ?? null,
      purchase_currency: input.purchasePrice ? input.purchaseCurrency : null,
      purchase_date: input.purchaseDate ?? null,
      notes: input.notes || null,
    })
    .select('id')
    .single()
  if (error) throw new Error(`collection_items insert failed: ${error.message}`)

  return { ok: true, itemId: data.id }
}
