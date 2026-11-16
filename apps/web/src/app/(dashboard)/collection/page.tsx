import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Field } from '@/components/ui/Field'
import { Pokeball } from '@/components/ui/Pokeball'
import { CollectionItemCard, type TilePrice } from '@/features/collection/CollectionItemCard'
import { filterCollection, type CollectionFilters } from '@/features/collection/list'
import { loadPortfolio } from '@/features/portfolio/load'
import { RefreshGradedButton } from '@/features/pricing/RefreshGradedButton'
import { PRICE_SOURCE } from '@/features/pricing/tcgplayer'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { CURRENCIES } from '@/types/catalog'

export const metadata: Metadata = {
  title: 'Collection',
}

type SearchParams = Promise<{ q?: string; type?: string; sort?: string; cur?: string }>

const pick = <T extends string>(v: string | undefined, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback

export default async function CollectionPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const filters: CollectionFilters = {
    q: sp.q?.slice(0, 60),
    type: pick(sp.type, ['all', 'raw', 'graded'] as const, 'all'),
    sort: pick(sp.sort, ['newest', 'name', 'quantity'] as const, 'newest'),
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('preferred_currency').eq('id', user!.id).single()
  const currency = pick(sp.cur, CURRENCIES, pick(profile?.preferred_currency, CURRENCIES, 'USD'))

  const portfolio = await loadPortfolio(supabase, currency)
  const { rows: all, valuation, fx, fxMissing, justTcg, hasGraded } = portfolio
  const rows = filterCollection(all, filters)
  const totalCards = all.reduce((n, r) => n + r.quantity, 0)

  const tilePrice = (id: string): TilePrice => {
    const v = valuation.items.get(id)
    if (!v || v.result.status === 'unavailable' || v.unit === null) {
      const reason = v?.result.status === 'unavailable' ? v.result.reason : fxMissing ? 'Exchange rate unavailable' : 'No price data'
      return { status: 'unavailable', unit: null, line: null, currency, source: PRICE_SOURCE, observedAt: null, note: reason }
    }
    return {
      status: v.result.status,
      unit: v.unit,
      line: v.line,
      currency,
      source: v.result.quote.source,
      observedAt: v.result.quote.observedAt,
      note: v.result.status === 'reference' ? v.result.note : null,
    }
  }

  const qs = (over: Record<string, string>): string => {
    const p = new URLSearchParams()
    if (filters.q) p.set('q', filters.q)
    if (filters.type !== 'all') p.set('type', filters.type!)
    if (filters.sort !== 'newest') p.set('sort', filters.sort!)
    p.set('cur', currency)
    Object.entries(over).forEach(([k, v]) => p.set(k, v))
    return `?${p.toString()}`
  }

  const up = (valuation.gain ?? 0) >= 0

  return (
    <div className="space-y-6">
      <section className="pv-panel relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[var(--pv-red)]/10 blur-3xl" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="pv-label !mb-1">Portfolio value</p>
            {all.length === 0 ? (
              <p className="text-3xl font-bold text-white">Your collection is empty</p>
            ) : valuation.totalValue !== null ? (
              <p className="text-5xl font-extrabold tracking-tight text-white tabular-nums md:text-6xl">
                {formatCurrency(valuation.totalValue, currency)}
              </p>
            ) : (
              <p className="text-3xl font-bold text-[var(--pv-muted)]">
                {fxMissing ? 'Exchange rate unavailable' : 'No priced cards yet'}
              </p>
            )}
            {valuation.gain !== null && (
              <p className={`mt-2 inline-flex items-center gap-1 text-sm font-semibold tabular-nums ${up ? 'text-green-400' : 'text-red-400'}`}>
                {up ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {formatCurrency(valuation.gain, currency)}
                {valuation.gainPercent !== null && ` (${valuation.gainPercent >= 0 ? '+' : ''}${valuation.gainPercent.toFixed(1)}%)`}
                <span className="ml-1 font-normal text-[var(--pv-muted)]">
                  vs. {formatCurrency(valuation.costBasis, currency)} paid on priced cards
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-3">
          <div className="flex gap-1 rounded-xl bg-black/30 p-1" role="group" aria-label="Display currency">
            {CURRENCIES.map((c) => (
              <Link
                key={c}
                href={qs({ cur: c })}
                aria-current={c === currency ? 'true' : undefined}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  c === currency ? 'bg-[var(--pv-yellow)] text-black' : 'text-[var(--pv-muted)] hover:bg-white/5 hover:text-white'
                }`}
              >
                {c}
              </Link>
            ))}
          </div>
          {hasGraded && <RefreshGradedButton configured={justTcg} />}
          </div>
        </div>

        {all.length > 0 && (
          <p className="mt-4 text-xs leading-relaxed text-[var(--pv-muted)]">
            {totalCards} card{totalCards === 1 ? '' : 's'} in {all.length} entr{all.length === 1 ? 'y' : 'ies'} ·{' '}
            {valuation.pricedEntries} of {all.length} priced
            {valuation.latestObservedAt && ` · prices as of ${formatDate(valuation.latestObservedAt)}`}. Sources: {PRICE_SOURCE}{hasGraded ? ', JustTCG' : ''}
            {currency !== 'USD' && fx ? `; FX: ECB via Frankfurter, ${formatDate(fx.date)}` : ''}. Raw cards are valued at Near Mint with an exact printing match only. Graded slabs use the
            most recent JustTCG sale of that exact grade, when one exists. Other conditions aren&apos;t valued.
          </p>
        )}
      </section>

      <form method="get" className="pv-panel grid gap-3 p-4 sm:grid-cols-[1fr_150px_150px_auto] sm:items-end">
        <input type="hidden" name="cur" value={currency} />
        <Field label="Search">
          <input name="q" defaultValue={filters.q} placeholder="Card name or set" className="pv-control" />
        </Field>
        <Field label="Show">
          <select name="type" defaultValue={filters.type} className="pv-control">
            <option value="all">All cards</option>
            <option value="raw">Raw only</option>
            <option value="graded">Graded only</option>
          </select>
        </Field>
        <Field label="Sort by">
          <select name="sort" defaultValue={filters.sort} className="pv-control">
            <option value="newest">Newest first</option>
            <option value="name">Name (A-Z)</option>
            <option value="quantity">Most copies</option>
          </select>
        </Field>
        <button type="submit" className="pv-btn pv-btn-gold h-[38px]">Apply</button>
      </form>

      {all.length === 0 ? (
        <div className="pv-panel flex flex-col items-center gap-4 p-12 text-center">
          <Pokeball className="h-14 w-14" />
          <p className="text-[var(--pv-muted)]">Your Pokédex of cards is empty. Time to start your journey!</p>
          <Link href="/market" className="pv-btn pv-btn-primary">Find cards in the Market</Link>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[var(--pv-muted)]">No entries match your filters.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))]">
          {rows.map((r, i) => (
            <CollectionItemCard key={r.id} item={r} price={tilePrice(r.id)} index={i} />
          ))}
        </ul>
      )}
    </div>
  )
}
