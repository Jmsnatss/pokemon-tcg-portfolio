# docs/PROJECT_CONTEXT.md — PokéVault Architecture & State

**Updated:** Milestone 0 — Foundation COMPLETE (commit `8fee602`)  
**Next milestone:** Milestone 1 — Authentication & Catalog

---

## 1. Project Purpose

PokéVault is a personal, zero-cost Pokémon TCG collection manager and portfolio tracker. It identifies physical cards through computer vision, retrieves market valuations from authorized pricing APIs, and allows the user to manage a full inventory of raw cards, graded slabs, and sealed products.

---

## 2. Current Milestone Status

| Milestone | Status | Notes |
|---|---|---|
| 0 — Repository & Foundation | ✅ Complete | All files committed; `pnpm install` pending user approval |
| 1 — Authentication & Catalog | ⬜ Pending | Requires Supabase credentials + `pnpm install` |
| 2 — Collection Management | ⬜ Pending | — |
| 3 — Pricing & Portfolio | ⬜ Pending | — |
| 4 — Card Scanning | ⬜ Pending | — |
| 5 — Historical Pricing | ⬜ Pending | — |
| 6 — Advanced Features | ⬜ Pending | — |
| 7 — Production Readiness | ⬜ Pending | — |

---

## 3. What Was Built in Milestone 0

### Repository structure
```
pokemon-tcg-portfolio/           ← Git repo root (local, commit 8fee602)
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
│       │   │   ├── dashboard/   ← Dashboard with stat cards
│       │   │   ├── collection/  ← Placeholder (Milestone 2)
│       │   │   ├── scanner/     ← Placeholder (Milestone 4)
│       │   │   ├── market/      ← Placeholder (Milestone 1)
│       │   │   └── settings/    ← Settings page (reads profile)
│       │   └── api/health/      ← Public health check endpoint
│       ├── components/layout/   ← AppShell (sidebar nav + mobile menu)
│       ├── features/
│       │   ├── auth/LoginForm.tsx       ← Email/password with Zod validation
│       │   ├── pricing/provider.ts      ← PricingProvider interface
│       │   ├── pricing/justtcg.ts       ← JustTCG stub (Milestone 3)
│       │   └── scanner/provider.ts     ← ScannerProvider interface
│       ├── lib/
│       │   ├── supabase/client.ts       ← Browser Supabase client
│       │   ├── supabase/server.ts       ← Server + service-role clients
│       │   ├── tcgdex/client.ts         ← TCGdex API client (caching)
│       │   ├── currency/frankfurter.ts  ← Exchange rate client
│       │   └── utils/
│       │       ├── format.ts            ← formatCurrency, formatDate, etc.
│       │       └── format.test.ts       ← Vitest unit tests (5 suites)
│       └── types/index.ts              ← Re-exports from @pokevault/shared
├── packages/shared/src/types.ts ← All canonical TypeScript types
├── services/scanner/            ← Python FastAPI scanner service
│   ├── app/main.py              ← FastAPI app + /health + /scan endpoints
│   ├── app/models.py            ← Pydantic models
│   ├── app/auth.py              ← Shared secret authentication
│   ├── app/providers/
│   │   └── ocr_provider.py      ← Tesseract OCR provider (fallback)
│   ├── tests/test_scanner.py    ← pytest tests (health, format validation)
│   ├── requirements.txt         ← fastapi, uvicorn, pillow, pytesseract
│   └── Dockerfile               ← Multi-stage build with Tesseract
├── supabase/migrations/
│   └── 20261116_000001_initial_schema.sql  ← Full 13-table schema + RLS
└── docs/
    └── PROJECT_CONTEXT.md       ← This file
```

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

1. **Run `pnpm install`** in `apps/web/` to install all dependencies
   ```powershell
   Set-Location "d:\School Files\Personal Files\Pokemon Scanner\pokemon-tcg-portfolio\apps\web"
   pnpm install
   ```

2. **Create a Supabase project** at https://supabase.com (free tier)
   - Copy the URL and anon key to `apps/web/.env.local`
   - Apply migrations: `supabase db push` or paste SQL manually in Supabase SQL editor

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

### Dependencies not yet installed (need `pnpm install`):

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
**Remote:** ❌ Not yet connected — no GitHub plugin authorized

To connect a GitHub remote after creating the repo at github.com:
```bash
git remote add origin https://github.com/YOUR_USERNAME/pokemon-tcg-portfolio.git
git branch -M main
git push -u origin main
```

---

## 10. Known Issues / Notes

1. **`apps/web/pnpm-lock.yaml`** exists from the original scaffold but references the old root-level install, not the monorepo `apps/web/` package.json. It will be regenerated on next `pnpm install`.
2. **`apps/web/pnpm-workspace.yaml`** is a stale artefact from scaffold — has been deleted.
3. **Node.js 21.x engine warnings** from some packages (want ≥22). No functional impact confirmed; upgrade path is Node 22 LTS.
4. **Scanner OCR fallback** requires Tesseract system binary — documented in `services/scanner/README`.
5. **CardCorpus** model availability and license not yet verified — research required before Milestone 4.

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
