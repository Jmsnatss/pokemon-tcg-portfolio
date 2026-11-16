# PokéVault Utility & Maintenance Scripts

Standalone scripts for maintenance tasks live here.

The daily price sync is not a script: `.github/workflows/price-sync.yml` calls the deployed app's
`/api/cron/sync-prices` endpoint (authorised with the `CRON_SECRET` bearer token), which runs
`syncPrices` from `apps/web/src/features/portfolio/sync.ts`.
