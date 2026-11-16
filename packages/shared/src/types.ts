// ============================================================
// Shared TypeScript types for PokéVault
// ============================================================

// --- Card Catalog ---

export type EnergyType =
  | 'Colorless' | 'Darkness' | 'Dragon' | 'Fairy' | 'Fighting'
  | 'Fire' | 'Grass' | 'Lightning' | 'Metal' | 'Psychic' | 'Water'

export type CardCategory = 'Pokemon' | 'Trainer' | 'Energy'

export type CardRarity =
  | 'Common' | 'Uncommon' | 'Rare' | 'Rare Holo' | 'Rare Holo EX'
  | 'Rare Holo GX' | 'Rare Holo V' | 'Rare Ultra' | 'Rare Secret'
  | 'Rare Rainbow' | 'Amazing Rare' | 'Promo' | string

export type PrintingType =
  | 'standard' | 'holo' | 'reverse_holo' | 'first_edition' | 'shadowless'
  | 'promo' | 'full_art' | 'alternate_art' | 'rainbow' | string

export interface CardSet {
  id: string
  providerId: string
  name: string
  series: string | null
  releaseDate: string | null
  totalCards: number | null
  logoUrl: string | null
  symbolUrl: string | null
}

export interface Card {
  id: string
  providerId: string
  setId: string | null
  set: CardSet | null
  name: string
  collectorNumber: string
  rarity: string | null
  category: CardCategory | null
  hp: number | null
  energyTypes: EnergyType[]
  illustrator: string | null
  imageUrl: string | null
  imageUrlHd: string | null
  metadata: Record<string, unknown> | null
}

export interface CardVariant {
  id: string
  cardId: string
  card: Card | null
  printingType: PrintingType
  language: string
  gradingCompany: GradingCompany | null
  grade: number | null
}

// --- Conditions ---

export type RawCondition =
  | 'near_mint'
  | 'lightly_played'
  | 'moderately_played'
  | 'heavily_played'
  | 'damaged'

export const RAW_CONDITION_LABELS: Record<RawCondition, string> = {
  near_mint: 'Near Mint',
  lightly_played: 'Lightly Played',
  moderately_played: 'Moderately Played',
  heavily_played: 'Heavily Played',
  damaged: 'Damaged',
}

export type GradingCompany = 'PSA' | 'BGS' | 'CGC'

// PSA grades: 1–10 (whole numbers)
// BGS grades: 1–10 with half-grades (1.0, 1.5, ... 9.5, 10.0)
// CGC grades: 0.5–10 in half-grades

// --- Collection ---

export interface CollectionItem {
  id: string
  userId: string
  cardVariantId: string
  cardVariant: CardVariant | null
  quantity: number
  condition: RawCondition
  isGraded: boolean
  gradingCompany: GradingCompany | null
  grade: number | null
  certNumber: string | null
  purchasePrice: string | null  // NUMERIC as string to preserve precision
  purchaseCurrency: string | null
  purchaseDate: string | null
  notes: string | null
  imageUrl: string | null
  createdAt: string
  updatedAt: string
}

// --- Sealed Products ---

export type SealedProductType =
  | 'booster_pack'
  | 'booster_box'
  | 'elite_trainer_box'
  | 'collection_box'
  | 'other'

export interface SealedProduct {
  id: string
  providerId: string | null
  name: string
  productType: SealedProductType
  setId: string | null
  releaseDate: string | null
  imageUrl: string | null
  metadata: Record<string, unknown> | null
}

export interface SealedCollectionItem {
  id: string
  userId: string
  sealedProductId: string
  sealedProduct: SealedProduct | null
  quantity: number
  condition: 'sealed' | 'opened' | 'damaged'
  purchasePrice: string | null
  purchaseCurrency: string | null
  purchaseDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

// --- Pricing ---

export type PriceType = 'market' | 'low' | 'mid' | 'high' | 'listed'
export type SupportedCurrency = 'USD' | 'PHP' | 'EUR' | 'JPY'

export interface PriceSource {
  id: string
  name: string
  displayName: string
  baseUrl: string | null
  isActive: boolean
}

export interface CurrentPrice {
  id: string
  cardVariantId: string | null
  sealedProductId: string | null
  priceSource: PriceSource
  currency: string
  priceType: PriceType
  condition: string | null
  price: string  // NUMERIC as string
  observedAt: string
  fetchedAt: string
  isStale: boolean
}

export interface PriceHistoryPoint {
  id: string
  cardVariantId: string | null
  sealedProductId: string | null
  priceSource: PriceSource
  currency: string
  priceType: PriceType
  condition: string | null
  price: string
  observedAt: string
  fetchedAt: string
}

// --- Pricing Provider Interface ---

export interface PriceQuery {
  cardProviderId: string  // TCGdex ID
  condition?: RawCondition
  language?: string
  printingType?: PrintingType
  currency?: SupportedCurrency
}

export interface PriceResult {
  source: string
  sourceDisplayName: string
  currency: string
  priceType: PriceType
  condition: string | null
  price: string  // Exact decimal string
  observedAt: string  // ISO 8601
  isAvailable: true
}

export interface PriceUnavailableResult {
  source: string
  sourceDisplayName: string
  isAvailable: false
  reason: string
}

export type PriceQueryResult = PriceResult | PriceUnavailableResult

// --- Portfolio ---

export interface PortfolioSummary {
  totalValue: string
  totalCost: string | null
  unrealizedGain: string | null
  unrealizedGainPercent: number | null
  currency: SupportedCurrency
  cardCount: number
  itemCount: number
  lastSyncAt: string | null
}

export interface PortfolioSnapshot {
  id: string
  userId: string
  snapshotDate: string
  currency: string
  totalValue: string
  totalCost: string | null
  cardCount: number
  itemCount: number
  createdAt: string
}

// --- Scanner ---

export interface ScanCandidate {
  cardProviderId: string    // TCGdex ID
  cardName: string
  setName: string
  collectorNumber: string
  confidence: number | null  // null if not calibrated
  imageUrl: string | null
  rank: number
}

export interface ScanResult {
  candidates: ScanCandidate[]
  scanDurationMs: number
  provider: string
  error?: string
}

// --- Exchange Rates ---

export interface ExchangeRate {
  baseCurrency: string
  targetCurrency: string
  rate: string
  effectiveDate: string
  fetchedAt: string
}

// --- Profile ---

export interface UserProfile {
  id: string
  displayName: string | null
  preferredCurrency: SupportedCurrency
  createdAt: string
  updatedAt: string
}

// --- API Response shapes ---

export interface ApiSuccess<T> {
  data: T
}

export interface ApiError {
  error: string
  code?: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

