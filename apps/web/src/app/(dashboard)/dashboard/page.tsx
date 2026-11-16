import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CreditCard, DollarSign, Package, TrendingUp } from 'lucide-react'
import { PortfolioChart } from '@/components/charts/PortfolioChart'
import { loadPortfolio } from '@/features/portfolio/load'
import { SnapshotButton } from '@/features/portfolio/SnapshotButton'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { CURRENCIES } from '@/types/catalog'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, preferred_currency')
    .eq('id', user!.id)
    .single()

  const displayName = profile?.display_name ?? user!.email ?? 'Collector'
  const preferred = profile?.preferred_currency as string | undefined
  const currency = CURRENCIES.find((c) => c === preferred) ?? 'USD'

  const p = await loadPortfolio(supabase, currency)
  const { valuation, rows } = p
  const totalCards = rows.reduce((n, r) => n + r.quantity, 0)

  const { data: snaps } = await supabase
    .from('portfolio_snapshots')
    .select('snapshot_date, total_value')
    .eq('currency', 'USD')
    .order('snapshot_date', { ascending: true })
    .limit(365)
  const chart = (snaps ?? []).map((s: { snapshot_date: string; total_value: string }) => ({
    date: s.snapshot_date,
    value: Number(s.total_value),
  }))

  const top = rows
    .map((r) => ({ r, line: valuation.items.get(r.id)?.line ?? null }))
    .filter((x): x is { r: (typeof rows)[number]; line: number } => x.line !== null)
    .sort((a, b) => b.line - a.line)
    .slice(0, 5)
  const recent = rows.slice(0, 5)

  const gainUp = (valuation.gain ?? 0) >= 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Welcome back, {displayName.split('@')[0]}</h1>
        <p className="text-sm text-[var(--pv-muted)] mt-1">Your Pokémon TCG collection at a glance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Collection Value"
          value={valuation.totalValue !== null ? formatCurrency(valuation.totalValue, currency) : '—'}
          sublabel={
            valuation.totalValue !== null
              ? `${valuation.pricedEntries} of ${valuation.totalEntries} entries priced`
              : p.fxMissing ? 'exchange rate unavailable' : 'no priced cards yet'
          }
          accent="green"
          index={0}
        />
        <StatCard
          icon={<CreditCard className="w-5 h-5" />}
          label="Total Cards"
          value={String(totalCards)}
          sublabel={`${rows.length} entr${rows.length === 1 ? 'y' : 'ies'} in inventory`}
          accent="blue"
          index={1}
        />
        <StatCard
          icon={<Package className="w-5 h-5" />}
          label="Total Cost"
          value={p.cost !== null ? formatCurrency(p.cost, currency) : '—'}
          sublabel="purchase prices you recorded"
          accent="purple"
          index={2}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Gain / Loss"
          value={valuation.gain !== null ? formatCurrency(valuation.gain, currency) : '—'}
          sublabel={
            valuation.gainPercent !== null
              ? `${gainUp ? '+' : ''}${valuation.gainPercent.toFixed(1)}% on priced cards with a cost`
              : 'needs priced cards with a purchase price'
          }
          accent={gainUp ? 'yellow' : 'red'}
          index={3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="pv-panel p-6 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Portfolio Value Over Time</h2>
            <SnapshotButton />
          </div>
          {chart.length >= 2 ? (
            <PortfolioChart data={chart} />
          ) : (
            <div className="h-56 flex items-center justify-center rounded-xl bg-black/20 border border-dashed px-6 text-center">
              <p className="text-sm text-[var(--pv-muted)]">
                {chart.length === 1
                  ? 'One snapshot saved. The chart appears after a second day.'
                  : 'No history yet. Record a snapshot now; a daily job then adds one each day.'}
              </p>
            </div>
          )}
          <p className="text-[11px] text-[#5b6385]">
            History is recorded by this app from the day it starts tracking (the price source has no past data). Values are in USD.
          </p>
        </section>

        <section className="pv-panel p-6 space-y-3">
          <h2 className="text-sm font-semibold text-white">Most Valuable Cards</h2>
          {top.length === 0 ? (
            <div className="h-56 flex items-center justify-center rounded-xl bg-black/20 border border-dashed px-6 text-center">
              <p className="text-sm text-[var(--pv-muted)]">Add priced cards to see your top five.</p>
            </div>
          ) : (
            <ol className="space-y-2">
              {top.map(({ r, line }, i) => (
                <CardRow key={r.id} row={r} right={formatCurrency(line, currency)} rank={i + 1} />
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="pv-panel p-6 space-y-3">
        <h2 className="text-sm font-semibold text-white">Recent Additions</h2>
        {recent.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-3 text-center">
            <CreditCard className="w-10 h-10 text-[var(--pv-border)]" />
            <p className="text-sm text-[var(--pv-muted)] max-w-xs">
              Your collection is empty. Use the{' '}
              <Link href="/scanner" className="text-[var(--pv-yellow)] hover:underline">Scanner</Link> or{' '}
              <Link href="/market" className="text-[var(--pv-yellow)] hover:underline">Market Explorer</Link> to add your first card.
            </p>
          </div>
        ) : (
          <ol className="space-y-2">
            {recent.map((r) => (
              <CardRow key={r.id} row={r} right={formatDate(r.created_at)} />
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

function CardRow({
  row,
  right,
  rank,
}: {
  row: Awaited<ReturnType<typeof loadPortfolio>>['rows'][number]
  right: string
  rank?: number
}) {
  const card = row.card_variants?.cards
  return (
    <li>
      <Link
        href={card ? `/card/${card.provider_id}` : '/collection'}
        className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/5"
      >
        {rank && <span className="w-4 text-center text-xs font-bold text-[var(--pv-yellow)]">{rank}</span>}
        {card?.image_url ? (
          <Image src={card.image_url} alt="" width={36} height={50} className="h-[50px] w-9 rounded" />
        ) : (
          <div className="h-[50px] w-9 rounded bg-black/30" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">{card?.name ?? 'Unknown card'}</span>
          <span className="block truncate text-xs text-[var(--pv-muted)]">
            {card?.card_sets?.name ?? '—'} · ×{row.quantity}
          </span>
        </span>
        <span className="text-sm font-semibold tabular-nums text-white">{right}</span>
      </Link>
    </li>
  )
}

function StatCard({
  icon,
  label,
  value,
  sublabel,
  accent,
  index,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sublabel: string
  accent: 'green' | 'blue' | 'purple' | 'yellow' | 'red'
  index: number
}) {
  const accentClasses = {
    green: 'bg-green-500/15 text-green-400',
    blue: 'bg-blue-500/15 text-blue-400',
    purple: 'bg-purple-500/15 text-purple-400',
    yellow: 'bg-yellow-400/15 text-yellow-300',
    red: 'bg-red-500/15 text-red-400',
  }

  return (
    <div className="pv-panel pv-interactive pv-rise p-5 space-y-3" style={{ ['--i' as string]: index }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--pv-muted)] uppercase tracking-wider">{label}</span>
        <span className={`p-1.5 rounded-lg ${accentClasses[accent]}`}>{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
        <p className="text-xs text-[var(--pv-muted)] mt-0.5">{sublabel}</p>
      </div>
    </div>
  )
}
