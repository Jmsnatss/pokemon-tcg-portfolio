# docs/PROJECT_CONTEXT.md — PokéVault Architecture & State

**Updated:** Milestone 0 — Foundation COMPLETE (commit `9b080eb`, branch `main`)  
**Git Author:** James Dela Cruz <jrdelacruz@up.edu.ph>  
**Next milestone:** Milestone 1 — Authentication & Catalog

---

## 1. Project Purpose

PokéVault is a personal, zero-cost Pokémon TCG collection manager and portfolio tracker. It identifies physical cards through computer vision, retrieves market valuations from authorized pricing APIs, and allows the user to manage a full inventory of raw cards, graded slabs, and sealed products.

---

## 2. Current Milestone Status

| Milestone | Status | Notes |
|---|---|---|
| 0 — Repository & Foundation | ✅ Complete | Pushed to GitHub; `pnpm install`, type-check, lint, tests (17/17) and build verified |
| 1 — Authentication & Catalog | ✅ Complete | Login, TCGdex search, card detail, add-to-collection verified in browser. shadcn/ui deferred (plain Tailwind used) |
| 2 — Collection Management | 🟡 Built, awaiting browser verification | Collection page (search/filter/sort, cost basis per currency), edit/delete, graded slabs (PSA/BGS/CGC, user-entered grades only). Sealed products not yet done |
| 3 — Pricing & Portfolio | 🟡 Started | Raw: TCGplayer via TCGdex (free). Graded: JustTCG v2 free tier (100 req/day) via cached refresh into `current_prices`; code unit-tested but NOT yet verified against the live API (needs a JUSTTCG_API_KEY). Pending: price history, snapshots, FX DB cache |
| 4 — Card Scanning | ⬜ Pending | — |
| 5 — Historical Pricing | ⬜ Pending | — |
| 6 — Advanced Features | ⬜ Pending | — |
| 7 — Production Readiness | ⬜ Pending | — |

---

## 3. What Was Built in Milestone 0

### Repository structure
```
pokemon-tcg-portfolio/           ← Git repo root (local, commit 9b080eb, branch main)
├── .env.example                 ← All env vars documented
├── .gitignore                   ← Node, Python, secrets, models
├── .github/workflows/
│   ├── ci.yml                   ← Lint + typecheck + build + test
│   └── price-sync.yml           ← Daily price sync (GitHub Actions)
├── AGENTS.md                    ← Full dev conventions for AI agents
├── README.md                    ← Project overview and getting started
├── package.json                 ← Root monorepo scripts
├── pnpm-workspace.yaml          ← Workspace config: apps/*, packages/*
├── apps/web/                    ← Next.js 16 application
│   ├── package.json             ← All dependencies listed (needs pnpm install)
│   ├── next.config.ts           ← Security headers, TCGdex image domain
│   ├── tsconfig.json            ← Strict mode + path aliases
│   ├── vitest.config.ts         ← Unit test runner
│   └── src/
│       ├── middleware.ts         ← Auth redirect middleware
│       ├── app/
│       │   ├── layout.tsx       ← Root layout (dark theme, Geist font)
│       │   ├── page.tsx         ← Root → redirect to /dashboard or /login
│       │   ├── globals.css      ← Tailwind 4 base + skeleton animations
│       │   ├── (auth)/login/    ← Login page
│       │   ├── (dashboard)/     ← Protected layout + all dashboard pages
│       │   │   ├── layout.tsx   ← Auth check + AppShell
│       │   │   ├── card/[id]/   ← Card detail view (dynamic route)
│       │   │   ├── dashboard/   ← Dashboard with stat cards
│       │   │   ├── collection/  ← Placeholder (Milestone 2)
│       │   │   ├── scanner/     ← Placeholder (Milestone 4)
│       │   │   ├── market/      ← Placeholder (Milestone 1)
│       │   │   └── settings/    ← Settings page (reads profile)
│       │   └── api/
│       │       ├── auth/        ← Auth endpoints (.gitkeep)
│       │       ├── catalog/     ← Catalog endpoints (.gitkeep)
│       │       ├── collection/  ← Collection endpoints (.gitkeep)
│       │       ├── currency/    ← Currency endpoints (.gitkeep)
│       │       ├── export/      ← Export endpoints (.gitkeep)
│       │       ├── health/      ← Public health check endpoint
│       │       ├── pricing/     ← Pricing endpoints (.gitkeep)
│       │       └── scanner/     ← Scanner orchestration (.gitkeep)
│       ├── components/
│       │   ├── cards/           ← Card presentation components (.gitkeep)
│       │   ├── charts/          ← Financial/trend charts (.gitkeep)
│       │   ├── layout/AppShell  ← AppShell (sidebar nav + mobile menu)
│       │   ├── scanner/         ← Camera / scan components (.gitkeep)
│       │   └── ui/              ← shadcn/ui primitives (.gitkeep)
│       ├── features/
│       │   ├── auth/            ← LoginForm.tsx + barrel index.ts
│       │   ├── collection/      ← Collection management + barrel index.ts
│       │   ├── portfolio/       ← Portfolio calculations + barrel index.ts
│       │   ├── pricing/         ← PricingProvider + JustTCG stub + barrel index.ts
│       │   ├── scanner/         ← ScannerProvider + barrel index.ts
│       │   └── settings/        ← Settings feature + barrel index.ts
│       ├── lib/
│       │   ├── currency/frankfurter.ts  ← Exchange rate client
│       │   ├── pricing/         ← Provider adapters (.gitkeep)
│       │   ├── supabase/client.ts       ← Browser Supabase client
│       │   ├── supabase/server.ts       ← Server + service-role clients
│       │   ├── tcgdex/client.ts         ← TCGdex API client (caching)
│       │   └── utils/
│       │       ├── format.ts            ← formatCurrency, formatDate, etc.
│       │       └── format.test.ts       ← Vitest unit tests (5 suites)
│       └── types/index.ts              ← Re-exports from @pokevault/shared
├── packages/shared/
│   ├── package.json
│   └── src/
│       ├── index.ts             ← Barrel re-export
│       └── types.ts             ← All canonical TypeScript types
├── scripts/
│   ├── README.md                ← Standalone scripts guide
│   └── sync-prices.ts           ← Price synchronization worker stub
├── services/scanner/            ← Python FastAPI scanner service
│   ├── app/main.py              ← FastAPI app + /health + /scan endpoints
│   ├── app/models.py            ← Pydantic models
│   ├── app/auth.py              ← Shared secret authentication
│   ├── app/providers/
│   │   ├── __init__.py
│   │   └── ocr_provider.py      ← Tesseract OCR provider (fallback)
│   ├── tests/test_scanner.py    ← pytest tests (health, format validation)
│   ├── requirements.txt         ← fastapi, uvicorn, pillow, pytesseract
│   └── Dockerfile               ← Multi-stage build with Tesseract
├── supabase/migrations/
│   └── 20261116_000001_initial_schema.sql  ← Full 13-table schema + RLS
└── docs/
    └── PROJECT_CONTEXT.md       ← This architecture & state context file
```

---

## 3.1 Interrupted Files Recovery & Blueprint Alignment (Analysis Summary)

During initial repository scaffolding, execution was paused before all designated files were linked and committed. The following analysis and actions were conducted to complete the foundation:

1. **Resolution of Uncommitted Changes**: 42 modified files with line-ending and whitespace differences were inspected, staged, and committed cleanly.
2. **Dynamic Route Restored**: Added `apps/web/src/app/(dashboard)/card/[id]/page.tsx` for card details navigation from the Market Explorer.
3. **Feature Barrel Exports**: Implemented `index.ts` barrel exports across all feature modules (`auth`, `collection`, `portfolio`, `pricing`, `scanner`, `settings`) in compliance with `AGENTS.md`.
4. **Shared Package Entrypoint**: Created `packages/shared/src/index.ts` re-exporting canonical TypeScript domain types.
5. **Worker & Maintenance Scripts**: Added `scripts/sync-prices.ts` (stub referenced by `.github/workflows/price-sync.yml`) and `scripts/README.md`.
6. **Component & API Directory Tracking**: Created `.gitkeep` files in `components/ui`, `cards`, `charts`, `scanner`, and all `app/api/*` subfolders to preserve the monorepo architecture boundaries in Git.
7. **Git Configuration & Branch Alignment**:
   - Switched repository default branch from `master` to `main` as required by Section 0.1 of the master specification.
   - Cleared local test author override; commits are authored by `James Dela Cruz` <jrdelacruz@up.edu.ph>.
   - Working tree verified 100% clean.

---

## 4. Architecture Overview

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
│  PostgreSQL │    │    - CardCorpus image matching (pending)     │
│  Auth (RLS) │    │    - OCR fallback (Tesseract)                │
└─────────────┘    └────────────────────────────────────────────┘
                              │ HTTP (local or Docker)
┌─────────────────────────────▼──────────────────────────────────┐
│  External APIs                                                  │
│    TCGdex        — card catalog (free, no key required)         │
│    JustTCG       — pricing (API key required, Milestone 3)      │
│    PriceCharting — secondary pricing (optional, Milestone 3)    │
│    Frankfurter   — exchange rates (free, no key required)       │
└────────────────────────────────────────────────────────────────┘
```

---

## 5. Database Schema Summary

**Migration file:** `supabase/migrations/20261116_000001_initial_schema.sql`

| Table | Purpose | RLS |
|---|---|---|
| `profiles` | User profile (display name, currency) | User-scoped |
| `card_sets` | TCG expansion sets (TCGdex cache) | Public read |
| `cards` | Individual card records (TCGdex cache) | Public read |
| `card_variants` | Specific printings + graded versions | Public read |
| `collection_items` | User-owned raw/graded cards | User-scoped |
| `sealed_products` | Sealed product catalog | Public read |
| `sealed_collection_items` | User-owned sealed products | User-scoped |
| `price_sources` | Pricing provider registry | Public read |
| `current_prices` | Latest prices per variant | Public read |
| `price_history` | Historical observations | Public read |
| `portfolio_snapshots` | Daily portfolio value | User-scoped |
| `exchange_rates` | Frankfurter cached rates | Public read |
| `sync_jobs` | Scheduled sync log | Service-role only |

**Key constraints:**
- All monetary columns: `NUMERIC(12, 4)` or `NUMERIC(18, 6)` — no floats
- Auto-create profile trigger on `auth.users` insert
- RLS enabled on all 13 tables

---

## 6. External API Integration Strategy

### TCGdex
- **Base URL:** `https://api.tcgdex.net/v2`
- **Auth:** None required
- **Client:** `apps/web/src/lib/tcgdex/client.ts` — implemented with 1h cache
- **Methods:** `listSets()`, `getSet()`, `searchCards()`, `getCard()`, `getCardsBySet()`
- **Status:** ✅ Client implemented; integration into API routes = Milestone 1

### JustTCG
- **Status:** ⚠️ API key not obtained. Stub returns `isAvailable: false`
- **Action required:** Register at https://justtcg.com and set `JUSTTCG_API_KEY`
- **Implementation:** `apps/web/src/features/pricing/justtcg.ts` — Milestone 3

### Frankfurter
- **Base URL:** `https://api.frankfurter.dev`
- **Auth:** None required
- **Client:** `apps/web/src/lib/currency/frankfurter.ts` — implemented with 24h cache
- **Status:** ✅ Client implemented; DB caching = Milestone 3

---

## 7. Environment Variables Required

| Variable | Required | Status |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | ❌ Not set — create Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | ❌ Not set |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Server | ❌ Not set |
| `JUSTTCG_API_KEY` | Pricing | ❌ Not obtained |
| `PRICECHARTING_API_KEY` | Optional | ❌ Optional |
| `FRANKFURTER_BASE_URL` | No | ✅ Has default |
| `NEXT_PUBLIC_TCGDEX_BASE_URL` | No | ✅ Has default |
| `SCANNER_SERVICE_URL` | Scanner | ✅ Defaults to localhost:8000 |
| `SCANNER_API_SECRET` | Recommended | ❌ Not set |
| `NEXT_PUBLIC_APP_URL` | Server | ❌ Not set |
| `DISABLE_PUBLIC_SIGNUP` | Recommended | ❌ Not set |

---

## 8. Immediate Blockers & Next Steps

### To run locally right now:

1. **Run `pnpm install`** in `apps/web/` to install all dependencies:
   ```powershell
   Set-Location "d:\School Files\Personal Files\Pokemon Scanner\pokemon-tcg-portfolio\apps\web"
   pnpm install
   ```

2. **Create a Supabase project** at https://supabase.com (free tier):
   - Copy the Project URL and anon key to `apps/web/.env.local`
   - Apply migrations: paste contents of `supabase/migrations/20261116_000001_initial_schema.sql` into the Supabase SQL editor and run it

3. **Create your user account** via Supabase Auth dashboard (email/password)

4. **Run the dev server:**
   ```powershell
   pnpm --filter web dev
   ```

5. Open http://localhost:3000 — you should land on the login page

### Milestone 1 implementation plan:

After `pnpm install` succeeds:
1. Install shadcn/ui components
2. Add catalog search API route (`/api/catalog/search`)
3. Build market page with real TCGdex search
4. Build card detail page (`/card/[id]`)
5. Add collection add-to-collection flow
6. Run type-check, lint, build, tests

### Dependencies to be installed via `pnpm install`:

- `@supabase/supabase-js` + `@supabase/ssr`
- `zod` + `react-hook-form` + `@hookform/resolvers`
- `recharts` + `lucide-react`
- `clsx` + `tailwind-merge` + `class-variance-authority`
- All `@radix-ui/*` primitives
- `date-fns` + `papaparse`
- `vitest` + `@vitejs/plugin-react`
- `prettier` + `@playwright/test`

---

## 9. GitHub Remote

**Local repo:** `d:\School Files\Personal Files\Pokemon Scanner\pokemon-tcg-portfolio\`  
**Branch:** `main` (tracks `origin/main`)  
**Remote:** https://github.com/Jmsnatss/pokemon-tcg-portfolio.git — ✅ connected and pushed

---

## 10. Known Issues / Notes

1. **Foundation fixes after first install:** removed non-existent `@radix-ui/react-badge` and `@radix-ui/react-skeleton` from `apps/web/package.json` (they broke `pnpm install`); removed unused `Pokeball` icon import (not in lucide-react); typed Supabase cookie handlers; replaced `require()` with an ES import in `server.ts`; renamed `vitest.config.ts` → `vitest.config.mts` (ESM); disabled `cacheComponents`/`partialPrefetching` in `next.config.ts` (dynamic auth-gated routes failed prerender).
2. **Build needs Supabase env vars** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) even for `next build`; CI supplies placeholders. Locally, set `.env.local` or placeholders.
3. **Node 21.x** is used locally (prefer ≥22 LTS).
4. `middleware.ts` was migrated to `src/proxy.ts` (Next.js 16). `agentRules: false` stops Next generating `apps/web/AGENTS.md`.
5. **pnpm** ignored esbuild's build script; run `pnpm approve-builds` if esbuild issues appear.
6. **Scanner OCR fallback** requires the Tesseract system binary.
7. **CardCorpus** model availability and license must be verified before Milestone 4.
8. The Python scanner tests have not been run yet.

---

## 11. File Links

| File | Purpose |
|---|---|
| [AGENTS.md](../AGENTS.md) | Development conventions for AI agents |
| [.env.example](../.env.example) | Environment variable reference |
| [apps/web/package.json](../apps/web/package.json) | All frontend dependencies |
| [supabase/migrations/…_initial_schema.sql](../supabase/migrations/20261116_000001_initial_schema.sql) | Full DB schema |
| [packages/shared/src/types.ts](../packages/shared/src/types.ts) | All canonical types |
| [apps/web/src/features/pricing/provider.ts](../apps/web/src/features/pricing/provider.ts) | Pricing provider interface |
| [apps/web/src/features/scanner/provider.ts](../apps/web/src/features/scanner/provider.ts) | Scanner provider interface |
| [services/scanner/app/main.py](../services/scanner/app/main.py) | FastAPI scanner entrypoint |

---

*Last updated: 2026-11-16 — Milestone 0 complete*
