# PokéVault 🃏

**A personal Pokémon TCG card scanner, collection manager, and market portfolio tracker powered by computer vision and trading card pricing APIs.**

> **Status: Milestones 0-5 built (foundation, catalog, collection, pricing, scanner, price history). Deployment guide below.**

---

## What is PokéVault?

PokéVault is a zero-cost, self-hosted personal web application for Pokémon TCG collectors. It lets you:

- 📷 **Scan** your physical cards using your phone's camera or image uploads
- 📚 **Browse** the full Pokémon TCG catalog (powered by TCGdex)
- 🗂️ **Manage** your personal collection (raw, graded, sealed products)
- 💰 **Track** current market valuations and historical price trends
- 📊 **Monitor** your portfolio performance over time
- 🔄 **Sync** prices automatically on a daily schedule
- 🌍 **View** values in multiple currencies (USD, PHP, EUR, JPY)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript 5.9 |
| Styling | Tailwind CSS 4, shadcn/ui |
| Charts | Recharts |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Card catalog | TCGdex API |
| Pricing | JustTCG, PriceCharting |
| Currency | Frankfurter API |
| Computer vision | Python FastAPI + CardCorpus / OCR fallback |
| Deployment | Vercel (frontend), Supabase (DB), GitHub Actions (sync) |

---

## Project Structure

```
pokemon-tcg-portfolio/
├── apps/web/               # Next.js frontend application
├── services/scanner/       # Python FastAPI card recognition service
├── packages/shared/        # Shared TypeScript types and utilities
├── supabase/migrations/    # PostgreSQL database migrations
├── .github/workflows/      # CI and scheduled sync workflows
├── scripts/                # Utility scripts
└── docs/                   # Architecture and project documentation
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 20 (or 21.x)
- pnpm 12+
- Python 3.11+ (for the scanner service)
- A free [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/pokemon-tcg-portfolio.git
cd pokemon-tcg-portfolio
pnpm install
```

### 2. Configure environment

```bash
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local with your Supabase URL, keys, and optional API keys
```

### 3. Run database migrations

```bash
# Using the Supabase CLI
supabase db push
```

### 4. Start the development server

```bash
pnpm --filter web dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. (Optional) Start the scanner service

```bash
cd services/scanner
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

---

## Environment Variables

See [`.env.example`](.env.example) for a full reference of required and optional variables.  
**Never commit `.env.local` or any file containing real credentials.**

---

## Development Milestones

| # | Milestone | Status |
|---|---|---|
| 0 | Repository & Foundation | ✅ Complete |
| 1 | Authentication & Catalog | ✅ Complete |
| 2 | Collection Management | ✅ Complete (sealed products pending) |
| 3 | Pricing & Portfolio | 🟡 Raw prices live; graded via JustTCG needs an API key |
| 4 | Card Scanning | 🟡 Built; needs real-photo testing |
| 5 | Historical Pricing | ✅ Complete |
| 6 | Advanced Features | ⬜ Pending |
| 7 | Production Readiness | 🟡 Deployment documented |

---

## Deployment (free tier)

Target: **Vercel Hobby** (app) + **Supabase Free** (database/auth) + **GitHub Actions** (daily sync). Hobby is for personal, non-commercial use.

1. **Supabase**: run `supabase/migrations/*.sql` in the SQL editor. Under Authentication, turn **off** "Allow new users to sign up" (single-user app) after creating your user. Under Authentication > URL Configuration, set the Site URL to your Vercel URL. Rotate the secret key if it was ever shared.
2. **Vercel**: import the GitHub repo, set **Root Directory** to `apps/web`, keep "Include source files outside of the Root Directory" enabled, framework Next.js, Node 22. Add environment variables (Production): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` (your Vercel URL), `CRON_SECRET` (a long random string), optionally `JUSTTCG_API_KEY`.
3. **GitHub**: add repository secrets `APP_URL` (your Vercel URL) and `CRON_SECRET` (same value). The `Price Sync` workflow then records prices and a portfolio snapshot daily, and can be run manually from the Actions tab.
4. Verify: `GET /api/health` returns ok; sign in; add a card; click "Record today's snapshot" on the dashboard; run the Price Sync workflow once.

Notes: the in-memory rate limits and the JustTCG daily budget reset on cold starts; JustTCG may block free keys used from shared cloud hosts (it returns `EXCESSIVE_FREE_TIER_USAGE`), so graded pricing is most reliable when running locally.

---

## Documentation

- [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) — Architecture, current state, and next steps
- [`AGENTS.md`](AGENTS.md) — Conventions for AI-assisted development

---

## Security

This application is designed for **personal, single-user use**. All collection data is protected by Supabase Row Level Security. See [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) for security architecture details.

**Do not expose the Supabase service-role key to the browser or any public endpoint.**

---

## License

License pending. Third-party dependency, model-weight, and asset licensing under review before a license is applied. See [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) for details.
