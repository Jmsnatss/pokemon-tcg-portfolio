import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { TrendingUp, Package, CreditCard, DollarSign } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch basic portfolio counts
  const { count: itemCount } = await supabase
    .from('collection_items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, preferred_currency')
    .eq('id', user!.id)
    .single()

  const displayName = profile?.display_name ?? user!.email ?? 'Collector'
  const currency = profile?.preferred_currency ?? 'USD'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">
          Welcome back, {displayName.split('@')[0]}
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Your Pokémon TCG collection at a glance
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Collection Value"
          value="—"
          sublabel={`in ${currency} · pricing not yet synced`}
          accent="green"
        />
        <StatCard
          icon={<CreditCard className="w-5 h-5" />}
          label="Total Cards"
          value={itemCount?.toString() ?? '0'}
          sublabel="items in inventory"
          accent="blue"
        />
        <StatCard
          icon={<Package className="w-5 h-5" />}
          label="Total Cost"
          value="—"
          sublabel="purchase price recorded"
          accent="purple"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Gain / Loss"
          value="—"
          sublabel="unrealized, estimated"
          accent="yellow"
        />
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio chart placeholder */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-300">Portfolio Value Over Time</h2>
          <div className="h-48 flex items-center justify-center rounded-lg bg-zinc-800/50 border border-dashed border-zinc-700">
            <p className="text-sm text-zinc-500">
              Price history chart — available after Milestone 5
            </p>
          </div>
        </div>

        {/* Top cards placeholder */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-300">Most Valuable Cards</h2>
          <div className="h-48 flex items-center justify-center rounded-lg bg-zinc-800/50 border border-dashed border-zinc-700">
            <p className="text-sm text-zinc-500">
              Add cards to your collection to see rankings
            </p>
          </div>
        </div>
      </div>

      {/* Recent additions placeholder */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300">Recent Additions</h2>
        {itemCount === 0 ? (
          <div className="py-12 flex flex-col items-center gap-3 text-center">
            <CreditCard className="w-10 h-10 text-zinc-600" />
            <p className="text-sm text-zinc-400 max-w-xs">
              Your collection is empty. Use the{' '}
              <a href="/scanner" className="text-red-400 hover:underline">Scanner</a>{' '}
              or{' '}
              <a href="/market" className="text-red-400 hover:underline">Market Explorer</a>{' '}
              to add your first card.
            </p>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            {itemCount} item{itemCount !== 1 ? 's' : ''} in collection.
            Detailed recent additions list — Milestone 2.
          </p>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sublabel,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sublabel: string
  accent: 'green' | 'blue' | 'purple' | 'yellow'
}) {
  const accentClasses = {
    green: 'bg-green-900/30 text-green-400',
    blue: 'bg-blue-900/30 text-blue-400',
    purple: 'bg-purple-900/30 text-purple-400',
    yellow: 'bg-yellow-900/30 text-yellow-400',
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          {label}
        </span>
        <span className={`p-1.5 rounded-lg ${accentClasses[accent]}`}>
          {icon}
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold text-zinc-50 tabular-nums">{value}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{sublabel}</p>
      </div>
    </div>
  )
}

