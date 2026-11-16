# AGENTS.md — PokéVault Development Conventions

This file documents the conventions, architecture boundaries, testing requirements, and security rules for all AI-assisted development on the PokéVault project.

**All contributors and AI assistants must read and follow these conventions.**

---

## 1. Architecture Boundaries

### Directory ownership

| Directory | Responsibility | Language |
|---|---|---|
| `apps/web/` | Next.js frontend, API route handlers, auth, UI | TypeScript |
| `services/scanner/` | Card image recognition FastAPI service | Python |
| `packages/shared/` | Shared TypeScript types used across apps | TypeScript |
| `supabase/migrations/` | PostgreSQL schema migrations | SQL |
| `.github/workflows/` | CI, lint, type check, scheduled sync | YAML |
| `scripts/` | One-off utility scripts | TypeScript/Python |
| `docs/` | Architecture documentation | Markdown |

### Cross-boundary rules

- **Never import** from `services/scanner/` in `apps/web/` directly — communicate via HTTP only.
- **Never import** from `apps/web/` in `packages/shared/` — shared package must be framework-agnostic.
- **Never call Supabase** from `services/scanner/` — scanner only receives image data and returns candidates; the Next.js API layer handles all DB operations.
- **Never call pricing APIs** from browser-side code — all pricing calls must go through Next.js route handlers.

---

## 2. TypeScript Conventions

- **Strict mode** is mandatory. `tsconfig.json` must include `"strict": true`.
- **Explicit return types** on all exported functions.
- **No `any`** except at external API boundaries, and must be cast to a typed interface immediately.
- **Zod schemas** must be defined alongside their TypeScript types in `src/types/`.
- **Barrel exports** (`index.ts`) in each feature directory.
- Prefer `type` over `interface` for plain data shapes; use `interface` for extendable/mergeable structures.

---

## 3. File and Module Conventions

```
apps/web/src/
  app/            Next.js App Router pages and layouts
  components/     Reusable presentational components
    ui/           shadcn/ui primitives
    layout/       Navigation, sidebars, shells
    cards/        Card-specific display components
    charts/       Recharts wrappers
    scanner/      Scanner UI components
  features/       Domain logic per feature
    auth/         Authentication hooks, server actions
    collection/   Collection CRUD hooks and helpers
    pricing/      Pricing provider interface and adapters
    portfolio/    Portfolio calculations
    scanner/      Scanner provider interface and adapters
    settings/     User preferences
  lib/            Thin wrappers over external services
    supabase/     Supabase client (browser + server)
    tcgdex/       TCGdex API client
    pricing/      Pricing API clients
    currency/     Frankfurter exchange rate client
    utils/        Pure utility functions
  types/          Zod schemas + derived TypeScript types
```

**Keep route handlers thin.** Business logic lives in `features/` and `lib/`, not in `app/api/`.

---

## 4. Database Conventions

- All migrations in `supabase/migrations/` with ISO-timestamp prefix: `YYYYMMDD_HHMMSS_description.sql`.
- **Row Level Security (RLS)** must be enabled and have explicit policies on every table that holds user data.
- Use `NUMERIC(12, 2)` or `NUMERIC(18, 6)` for monetary values. **Never use `FLOAT` or `DOUBLE` for money.**
- Every table must have `created_at TIMESTAMPTZ DEFAULT NOW()`.
- User-owned tables must have a `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE` column.
- Foreign key constraints must be explicit.
- Create indexes on foreign keys and commonly filtered columns.

---

## 5. API Route Conventions

- Route handlers live in `app/api/`.
- **Every route handler must verify authentication** using `createServerClient` before returning any user data.
- Validate all inputs with Zod before processing.
- Return consistent JSON: `{ data: T }` on success, `{ error: string }` on failure.
- Use appropriate HTTP status codes.
- Rate-limit expensive or external-calling endpoints.

```typescript
// Standard route handler shape
export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... handler logic
}
```

---

## 6. Pricing System Conventions

All pricing providers must implement the `PricingProvider` interface defined in `apps/web/src/features/pricing/provider.ts`.

**Mandatory rules:**
- Never substitute a different printing or condition when exact pricing is unavailable.
- Always label prices with their source name and observation timestamp.
- Distinguish clearly between: current market estimate / historical observation / user-entered value / last known cached price / unavailable.
- Never fabricate or interpolate price data.

---

## 7. Scanner Conventions

All scanner backends must implement the `ScannerProvider` interface defined in `apps/web/src/features/scanner/provider.ts`.

**Mandatory rules:**
- Scanner identifies the card — it does not grade card condition.
- Confidence scores are only shown when calibrated against known ground truth.
- Always provide a manual lookup fallback.
- Never automatically assign PSA/BGS/CGC grades from an image classifier.

---

## 8. Security Rules

- **Never** commit `.env`, `.env.local`, or any file containing real credentials.
- **Never** expose `SUPABASE_SERVICE_ROLE_KEY` to the browser (`NEXT_PUBLIC_` prefix).
- All private Supabase operations must use the service-role client on the server only.
- Uploaded images must be validated for MIME type and content, not just extension.
- Enforce file size limits on all upload endpoints.
- Do not log sensitive data (tokens, keys, user PII) anywhere.

---

## 9. Testing Requirements

### Before marking any feature complete:

1. Unit tests exist for pure functions (calculations, normalizations, validators).
2. Integration tests cover the happy path and primary error cases.
3. The TypeScript compiler reports zero errors (`pnpm type-check`).
4. ESLint reports zero errors (`pnpm lint`).
5. The production build succeeds (`pnpm build`).

### Test file location

- Unit/integration tests: co-located with their source file, e.g., `feature.test.ts`
- End-to-end tests: `apps/web/tests/e2e/`

### Testing tools

- Unit/integration: Vitest
- End-to-end: Playwright

---

## 10. Git Conventions

- **Branch naming:** `feature/<short-description>`, `fix/<short-description>`, `docs/<short-description>`
- **Commit messages:** Conventional Commits format: `feat(scope): description`
  - `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
  - Scope matches the feature or layer: `auth`, `collection`, `pricing`, `scanner`, `db`, `ci`
- **Never force-push** to `main`.
- Commits must include only verified, working code.
- Do not commit commented-out code or TODO stubs without an associated GitHub issue.

---

## 11. Fabrication and Accuracy Rules

**These rules are non-negotiable:**

1. Never fabricate API responses, market prices, scan confidence scores, or historical observations.
2. Never display simulated values as live market data.
3. Never silently omit a requested feature.
4. Never mark a feature as complete unless its functionality has been verified with actual runtime output.
5. Never claim a deployment was successful without verifying the deployed application.
6. If a third-party service is unavailable, implement the fallback and document the blocker — do not stub with invented data.

---

## 12. Documentation Requirements

After each milestone, update:

- `README.md` — milestone table status
- `docs/PROJECT_CONTEXT.md` — implemented features, open issues, next steps
- Inline JSDoc comments on all exported functions and types

---

*Last updated: Milestone 0 — Initial scaffold*
