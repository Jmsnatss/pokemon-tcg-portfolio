# docs/PROJECT_CONTEXT.md — PokéVault Architecture & State

**Updated:** Milestone 0 — Initial scaffold  
**Next milestone:** Milestone 1 — Authentication & Catalog

---

## 1. Project Purpose

PokéVault is a personal, zero-cost Pokémon TCG collection manager and portfolio tracker. It identifies physical cards through computer vision, retrieves market valuations from authorized pricing APIs, and allows the user to manage a full inventory of raw cards, graded slabs, and sealed products.

---

## 2. Current Milestone Status

| Milestone | Status | Notes |
|---|---|---|
| 0 — Repository & Foundation | 🟡 In Progress | Scaffold complete; installing dependencies |
| 1 — Authentication & Catalog | ⬜ Pending | — |
| 2 — Collection Management | ⬜ Pending | — |
| 3 — Pricing & Portfolio | ⬜ Pending | — |
| 4 — Card Scanning | ⬜ Pending | — |
| 5 — Historical Pricing | ⬜ Pending | — |
| 6 — Advanced Features | ⬜ Pending | — |
| 7 — Production Readiness | ⬜ Pending | — |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser / Mobile                                               │
│  Next.js 16 App Router (apps/web/)                              │
│    Pages: Dashboard, Scanner, Collection, Market, Settings      │
│    Components: shadcn/ui + Recharts + custom card components    │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────────────┐
│  Next.js API Route Handlers (apps/web/src/app/api/)             │
│    /api/catalog   → TCGdex proxy + cache                        │
│    /api/collection → Supabase CRUD (authenticated)              │
│    /api/pricing   → JustTCG / PriceCharting (server-side)       │
│    /api/scanner   → Dispatches to scanner service               │
│    /api/currency  → Frankfurter exchange rates                  │
│    /api/export    → CSV / PDF generation                        │
└──────┬──────────────────────┬───────────────────────────────────┘
       │                      │
┌──────▼──────┐    ┌──────────▼──────────────────────────────────┐
│  Supabase   │    │  Python FastAPI Scanner (services/scanner/)  │
│  PostgreSQL │    │    - CardCorpus image matching               │
│  Auth       │    │    - OCR fallback (Tesseract)                │
│  RLS        │    │    - Returns candidates + confidence         │
└─────────────┘    └────────────────────────────────────────────┘
                              │ HTTP (local or Docker)
┌─────────────────────────────▼──────────────────────────────────┐
│  External APIs                                                  │
│    TCGdex    — card catalog (free, no key)                      │
│    JustTCG   — current + historical prices (API key required)   │
│    PriceCharting — secondary prices (optional API key)          │
│    Frankfurter — exchange rates (free, no key)                  │
└────────────────────────────────────────────────────────────────┘
```

---

## 4. Database Schema Summary

All migrations in `supabase/migrations/`. See migration files for full DDL.

### Tables

| Table | Purpose |
|---|---|
| `profiles` | Extended user profile (display name, preferred currency) |
| `card_sets` | Pokémon TCG expansion sets (cached from TCGdex) |
| `cards` | Individual card records (cached from TCGdex) |
| `card_variants` | Specific printings (holo, reverse holo, graded versions) |
| `collection_items` | User-owned raw cards |
| `sealed_products` | Sealed product catalog |
| `sealed_collection_items` | User-owned sealed products |
| `price_sources` | Pricing provider registry |
| `current_prices` | Latest prices per card variant per provider |
| `price_history` | Historical price observations |
| `portfolio_snapshots` | Daily portfolio value snapshots |
| `exchange_rates` | Cached currency rates with effective dates |
| `sync_jobs` | Scheduled sync execution log |

### Key constraints

- All monetary columns: `NUMERIC(12, 4)` or `NUMERIC(18, 6)`
- RLS enabled on: `collection_items`, `sealed_collection_items`, `portfolio_snapshots`
- Soft-delete not implemented — destructive deletes cascade appropriately

---

## 5. Frontend Page Map

| Route | Component | Status |
|---|---|---|
| `/` | Redirect to `/dashboard` or `/login` | ⬜ |
| `/login` | Email/password login form | ⬜ |
| `/dashboard` | Portfolio overview, charts, recent additions | ⬜ |
| `/collection` | Card grid/list with search and filters | ⬜ |
| `/scanner` | Camera / upload → recognition → add to collection | ⬜ |
| `/market` | TCGdex catalog search + pricing | ⬜ |
| `/card/[id]` | Card detail: art, metadata, prices, history | ⬜ |
| `/settings` | Currency, account, sync status, export | ⬜ |

---

## 6. External API Integration Strategy

### TCGdex
- **Base URL:** `https://api.tcgdex.net/v2`
- **Auth:** None required
- **Rate limits:** Unknown; implement HTTP caching (ETag/Cache-Control) and local DB cache
- **Usage:** Catalog search, card metadata, set lists, artwork URLs
- **Docs:** https://tcgdex.dev/

### JustTCG
- **Base URL:** TBD (requires account creation + API key)
- **Auth:** API key in `Authorization` header (server-side only)
- **Usage:** Current prices, historical observations, condition-based pricing
- **Docs:** https://justtcg.com/docs
- **Status:** API key not yet configured — implement provider interface and document setup

### PriceCharting
- **Status:** Optional secondary provider — implement after JustTCG
- **Auth:** API key required

### Frankfurter
- **Base URL:** `https://api.frankfurter.dev`
- **Auth:** None required
- **Usage:** USD/PHP/EUR/JPY conversion rates, cached daily

---

## 7. Environment Dependencies

| Variable | Required | Service |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server) | Supabase |
| `NEXT_PUBLIC_TCGDEX_BASE_URL` | No (has default) | TCGdex |
| `JUSTTCG_API_KEY` | For pricing | JustTCG |
| `PRICECHARTING_API_KEY` | Optional | PriceCharting |
| `FRANKFURTER_BASE_URL` | No (has default) | Frankfurter |
| `SCANNER_SERVICE_URL` | For scanning | Local FastAPI |
| `SCANNER_API_SECRET` | Recommended | Local FastAPI |
| `NEXT_PUBLIC_APP_URL` | For server components | App |
| `DISABLE_PUBLIC_SIGNUP` | Recommended | App |

---

## 8. Deployment Architecture

| Component | Platform | Notes |
|---|---|---|
| Next.js app | Vercel Hobby | Free tier, automatic HTTPS |
| Database | Supabase Free | 500 MB, up to 50K monthly active users |
| Auth | Supabase Auth | Included in Supabase Free |
| Scheduled sync | GitHub Actions | Free minutes for public/private repos |
| Scanner service | Local / Docker | No free GPU hosting assumed |

**Deployment not yet performed.** Remote repository and credentials required.

---

## 9. Open Issues and Blockers

| Issue | Severity | Notes |
|---|---|---|
| GitHub remote not yet connected | Low | Local repo initialized; needs `git remote add origin` |
| JustTCG API key not obtained | Medium | Pricing features will show "unavailable" until configured |
| Scanner model availability unverified | Medium | CardCorpus research pending; OCR fallback implemented first |
| Node.js 21.x engine warnings from some packages | Low | Some packages prefer 18/20/22; no functional impact confirmed |
| No Supabase project created | Medium | Migrations can be written but not applied until project exists |

---

## 10. Immediate Next Steps (Milestone 1)

1. Install remaining dependencies: `@supabase/supabase-js`, `zod`, `shadcn/ui`, `lucide-react`, `recharts`, `react-hook-form`
2. Write initial database migration (`001_initial_schema.sql`)
3. Implement Supabase client utilities (browser + server)
4. Build login page and auth middleware
5. Implement TCGdex client and catalog search API route
6. Build catalog search page and card detail page
7. Add type-check and lint scripts to CI

---

## 11. Known Limitations

- **Scanner:** CardCorpus availability and licensing not yet verified. OCR fallback (Tesseract) is significantly less accurate. Manual lookup always available.
- **Historical pricing:** Depends on JustTCG or PriceCharting providing authorized historical endpoints — not guaranteed on free tiers.
- **GPU inference:** No free continuous cloud GPU hosting available. Scanner service designed for local or Docker execution.
- **Sealed products:** Catalog data model designed; recognition and pricing not implemented in Milestone 0.

---

## 12. Licensing Notes

No application license has been applied pending review of:

- Next.js and React (MIT)
- Tailwind CSS (MIT)
- shadcn/ui (MIT)
- Supabase client libraries (MIT / Apache 2.0)
- TCGdex (terms of service review required)
- CardCorpus model weights (terms of use / research license review required)
- Pokémon card artwork (The Pokémon Company — strictly no reproduction beyond fair-use thumbnail display)

**Do not publish or redistribute card artwork beyond what is served by TCGdex's authorized image CDN.**
