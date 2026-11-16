-- ============================================================
-- Migration: 20261116_000001_initial_schema.sql
-- PokéVault — Initial PostgreSQL schema
-- ============================================================
-- Run via: supabase db push
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- Extended user profile linked to Supabase auth.users
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  preferred_currency  TEXT NOT NULL DEFAULT 'USD' CHECK (preferred_currency IN ('USD', 'PHP', 'EUR', 'JPY')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- CARD_SETS
-- Pokémon TCG expansion sets (cached from TCGdex)
-- ============================================================
CREATE TABLE IF NOT EXISTS card_sets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id     TEXT NOT NULL UNIQUE,  -- TCGdex set ID, e.g. "swsh1"
  name            TEXT NOT NULL,
  series          TEXT,
  release_date    DATE,
  total_cards     INTEGER,
  logo_url        TEXT,
  symbol_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_card_sets_provider_id ON card_sets(provider_id);

-- ============================================================
-- CARDS
-- Individual card records (cached from TCGdex)
-- ============================================================
CREATE TABLE IF NOT EXISTS cards (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id      TEXT NOT NULL UNIQUE,  -- TCGdex card ID, e.g. "swsh1-1"
  set_id           UUID REFERENCES card_sets(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  collector_number TEXT NOT NULL,
  rarity           TEXT,
  category         TEXT,  -- Pokémon, Trainer, Energy
  hp               INTEGER,
  energy_types     TEXT[],  -- e.g. ["Fire", "Colorless"]
  illustrator      TEXT,
  image_url        TEXT,    -- High-resolution from TCGdex CDN
  image_url_hd     TEXT,
  metadata         JSONB,   -- Full TCGdex response for extra fields
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_provider_id ON cards(provider_id);
CREATE INDEX IF NOT EXISTS idx_cards_set_id ON cards(set_id);
CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);

-- ============================================================
-- CARD_VARIANTS
-- Specific printings: holo, reverse holo, graded, language variants
-- ============================================================
CREATE TABLE IF NOT EXISTS card_variants (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id          UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  printing_type    TEXT NOT NULL DEFAULT 'standard',  -- standard, holo, reverse_holo, first_edition, shadowless, etc.
  language         TEXT NOT NULL DEFAULT 'en',
  grading_company  TEXT,  -- PSA, BGS, CGC, or NULL for raw
  grade            NUMERIC(4, 1),  -- e.g. 9.0, 10.0
  variant_metadata JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (card_id, printing_type, language, grading_company, grade)
);

CREATE INDEX IF NOT EXISTS idx_card_variants_card_id ON card_variants(card_id);

-- ============================================================
-- COLLECTION_ITEMS
-- User-owned raw card inventory
-- ============================================================
CREATE TABLE IF NOT EXISTS collection_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_variant_id   UUID NOT NULL REFERENCES card_variants(id) ON DELETE RESTRICT,
  quantity          INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  condition         TEXT NOT NULL DEFAULT 'near_mint'
                    CHECK (condition IN ('near_mint', 'lightly_played', 'moderately_played', 'heavily_played', 'damaged')),
  is_graded         BOOLEAN NOT NULL DEFAULT FALSE,
  grading_company   TEXT,
  grade             NUMERIC(4, 1),
  cert_number       TEXT,
  purchase_price    NUMERIC(12, 4),
  purchase_currency TEXT DEFAULT 'USD',
  purchase_date     DATE,
  notes             TEXT,
  image_url         TEXT,  -- Optional user-uploaded image
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collection_items_user_id ON collection_items(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_card_variant_id ON collection_items(card_variant_id);

-- ============================================================
-- SEALED_PRODUCTS
-- Sealed product catalog
-- ============================================================
CREATE TABLE IF NOT EXISTS sealed_products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id     TEXT UNIQUE,  -- External catalog ID if available
  name            TEXT NOT NULL,
  product_type    TEXT NOT NULL
                  CHECK (product_type IN ('booster_pack', 'booster_box', 'elite_trainer_box', 'collection_box', 'other')),
  set_id          UUID REFERENCES card_sets(id) ON DELETE SET NULL,
  release_date    DATE,
  image_url       TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SEALED_COLLECTION_ITEMS
-- User-owned sealed products
-- ============================================================
CREATE TABLE IF NOT EXISTS sealed_collection_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sealed_product_id UUID NOT NULL REFERENCES sealed_products(id) ON DELETE RESTRICT,
  quantity          INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  condition         TEXT NOT NULL DEFAULT 'sealed' CHECK (condition IN ('sealed', 'opened', 'damaged')),
  purchase_price    NUMERIC(12, 4),
  purchase_currency TEXT DEFAULT 'USD',
  purchase_date     DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sealed_collection_items_user_id ON sealed_collection_items(user_id);

-- ============================================================
-- PRICE_SOURCES
-- Registry of pricing providers
-- ============================================================
CREATE TABLE IF NOT EXISTS price_sources (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,  -- 'justtcg', 'pricecharting', 'manual'
  display_name TEXT NOT NULL,
  base_url    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed known sources
INSERT INTO price_sources (name, display_name, base_url) VALUES
  ('justtcg', 'JustTCG', 'https://justtcg.com'),
  ('pricecharting', 'PriceCharting', 'https://www.pricecharting.com'),
  ('manual', 'Manual Entry', NULL)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- CURRENT_PRICES
-- Latest price per variant per provider
-- ============================================================
CREATE TABLE IF NOT EXISTS current_prices (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_variant_id  UUID REFERENCES card_variants(id) ON DELETE CASCADE,
  sealed_product_id UUID REFERENCES sealed_products(id) ON DELETE CASCADE,
  price_source_id  UUID NOT NULL REFERENCES price_sources(id),
  currency         TEXT NOT NULL DEFAULT 'USD',
  price_type       TEXT NOT NULL DEFAULT 'market'
                   CHECK (price_type IN ('market', 'low', 'mid', 'high', 'listed')),
  condition        TEXT,
  price            NUMERIC(12, 4) NOT NULL,
  observed_at      TIMESTAMPTZ NOT NULL,
  fetched_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_stale         BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT chk_variant_or_sealed CHECK (
    (card_variant_id IS NOT NULL AND sealed_product_id IS NULL) OR
    (card_variant_id IS NULL AND sealed_product_id IS NOT NULL)
  ),
  UNIQUE (card_variant_id, price_source_id, currency, price_type, condition)
);

CREATE INDEX IF NOT EXISTS idx_current_prices_card_variant ON current_prices(card_variant_id);
CREATE INDEX IF NOT EXISTS idx_current_prices_sealed ON current_prices(sealed_product_id);
CREATE INDEX IF NOT EXISTS idx_current_prices_source ON current_prices(price_source_id);

-- ============================================================
-- PRICE_HISTORY
-- Historical price observations (where provider permits storage)
-- ============================================================
CREATE TABLE IF NOT EXISTS price_history (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_variant_id  UUID REFERENCES card_variants(id) ON DELETE CASCADE,
  sealed_product_id UUID REFERENCES sealed_products(id) ON DELETE CASCADE,
  price_source_id  UUID NOT NULL REFERENCES price_sources(id),
  currency         TEXT NOT NULL DEFAULT 'USD',
  price_type       TEXT NOT NULL DEFAULT 'market',
  condition        TEXT,
  price            NUMERIC(12, 4) NOT NULL,
  observed_at      TIMESTAMPTZ NOT NULL,
  fetched_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_history_variant_or_sealed CHECK (
    (card_variant_id IS NOT NULL AND sealed_product_id IS NULL) OR
    (card_variant_id IS NULL AND sealed_product_id IS NOT NULL)
  ),
  UNIQUE (card_variant_id, price_source_id, currency, price_type, condition, observed_at)
);

CREATE INDEX IF NOT EXISTS idx_price_history_card_variant ON price_history(card_variant_id);
CREATE INDEX IF NOT EXISTS idx_price_history_observed_at ON price_history(observed_at);

-- ============================================================
-- PORTFOLIO_SNAPSHOTS
-- Daily portfolio value snapshots per user
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date     DATE NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'USD',
  total_value       NUMERIC(18, 4) NOT NULL,
  total_cost        NUMERIC(18, 4),
  card_count        INTEGER NOT NULL DEFAULT 0,
  item_count        INTEGER NOT NULL DEFAULT 0,
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, snapshot_date, currency)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_date ON portfolio_snapshots(user_id, snapshot_date);

-- ============================================================
-- EXCHANGE_RATES
-- Cached exchange rates from Frankfurter
-- ============================================================
CREATE TABLE IF NOT EXISTS exchange_rates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  base_currency   TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate            NUMERIC(18, 8) NOT NULL,
  effective_date  DATE NOT NULL,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (base_currency, target_currency, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair_date ON exchange_rates(base_currency, target_currency, effective_date);

-- ============================================================
-- SYNC_JOBS
-- Scheduled synchronization execution log
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_jobs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type        TEXT NOT NULL,  -- 'price_sync', 'exchange_rate_sync'
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'running', 'success', 'partial', 'failed')),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  items_processed INTEGER DEFAULT 0,
  items_failed    INTEGER DEFAULT 0,
  error_message   TEXT,  -- Safe, non-sensitive error summary only
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- profiles: users can only read/write their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- collection_items: fully scoped to user
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own collection" ON collection_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own collection" ON collection_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own collection" ON collection_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own collection" ON collection_items FOR DELETE USING (auth.uid() = user_id);

-- sealed_collection_items: fully scoped to user
ALTER TABLE sealed_collection_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sealed items" ON sealed_collection_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sealed items" ON sealed_collection_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sealed items" ON sealed_collection_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sealed items" ON sealed_collection_items FOR DELETE USING (auth.uid() = user_id);

-- portfolio_snapshots: scoped to user
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own portfolio snapshots" ON portfolio_snapshots FOR SELECT USING (auth.uid() = user_id);

-- card_sets, cards, card_variants: publicly readable (catalog data)
ALTER TABLE card_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read card sets" ON card_sets FOR SELECT USING (TRUE);

ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read cards" ON cards FOR SELECT USING (TRUE);

ALTER TABLE card_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read card variants" ON card_variants FOR SELECT USING (TRUE);

-- sealed_products: publicly readable
ALTER TABLE sealed_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read sealed products" ON sealed_products FOR SELECT USING (TRUE);

-- price_sources, current_prices, price_history, exchange_rates: publicly readable
ALTER TABLE price_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read price sources" ON price_sources FOR SELECT USING (TRUE);

ALTER TABLE current_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read current prices" ON current_prices FOR SELECT USING (TRUE);

ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read price history" ON price_history FOR SELECT USING (TRUE);

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read exchange rates" ON exchange_rates FOR SELECT USING (TRUE);

-- sync_jobs: service-role only (no user RLS policy = blocked for all users)
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
-- sync_jobs is written by the service-role key only; no user-facing read needed
