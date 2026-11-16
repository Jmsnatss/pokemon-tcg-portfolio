import { z } from 'zod'

export const CARD_PROVIDER_ID_REGEX = /^[A-Za-z0-9._-]{1,64}$/

export const PRINTING_TYPES = ['standard', 'reverse_holo', 'holo', 'first_edition', 'promo'] as const
export type SupportedPrintingType = (typeof PRINTING_TYPES)[number]

export const PRINTING_LABELS: Record<SupportedPrintingType, string> = {
  standard: 'Normal',
  reverse_holo: 'Reverse Holo',
  holo: 'Holo',
  first_edition: '1st Edition',
  promo: 'Promo',
}

export const RAW_CONDITIONS = [
  'near_mint',
  'lightly_played',
  'moderately_played',
  'heavily_played',
  'damaged',
] as const

export const CURRENCIES = ['USD', 'PHP', 'EUR', 'JPY'] as const

export const catalogSearchSchema = z.object({
  q: z.string().trim().min(2, 'Enter at least 2 characters').max(60),
})

export const cardProviderIdSchema = z.string().regex(CARD_PROVIDER_ID_REGEX, 'Invalid card id')

export const addToCollectionSchema = z.object({
  providerId: cardProviderIdSchema,
  printingType: z.enum(PRINTING_TYPES),
  quantity: z.coerce.number().int().min(1).max(9999),
  condition: z.enum(RAW_CONDITIONS),
  purchasePrice: z
    .string()
    .trim()
    .regex(/^\d{1,8}(\.\d{1,4})?$/, 'Enter a valid amount')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  purchaseCurrency: z.enum(CURRENCIES).default('USD'),
  purchaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  notes: z.string().trim().max(1000).optional(),
})

export type AddToCollectionInput = z.infer<typeof addToCollectionSchema>

export type CatalogSearchResult = {
  id: string
  localId: string
  name: string
  imageUrl: string | null
}
