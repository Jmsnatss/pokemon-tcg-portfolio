import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Settings',
}

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, preferred_currency')
    .eq('id', user!.id)
    .single()

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-[var(--pv-muted)] mt-1">
          Manage your account and application preferences
        </p>
      </div>

      {/* Account section */}
      <section className="pv-panel divide-y divide-[var(--pv-border)]">
        <div className="px-6 py-4">
          <h2 className="text-sm font-semibold text-[var(--pv-muted)]">Account</h2>
        </div>
        <div className="px-6 py-4 space-y-1">
          <p className="text-xs text-[var(--pv-muted)]">Email</p>
          <p className="text-sm text-white">{user!.email}</p>
        </div>
        <div className="px-6 py-4 space-y-1">
          <p className="text-xs text-[var(--pv-muted)]">Display Name</p>
          <p className="text-sm text-white">{profile?.display_name ?? '—'}</p>
        </div>
        <div className="px-6 py-4 space-y-1">
          <p className="text-xs text-[var(--pv-muted)]">Preferred Currency</p>
          <p className="text-sm text-white">{profile?.preferred_currency ?? 'USD'}</p>
        </div>
        <div className="px-6 py-4">
          <p className="text-xs text-[var(--pv-muted)]">
            Profile editing — Milestone 2
          </p>
        </div>
      </section>

      {/* Pricing sync section */}
      <section className="pv-panel divide-y divide-[var(--pv-border)]">
        <div className="px-6 py-4">
          <h2 className="text-sm font-semibold text-[var(--pv-muted)]">Pricing Synchronization</h2>
        </div>
        <div className="px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-sm text-[var(--pv-muted)]">JustTCG — API key not configured</span>
          </div>
          <p className="text-xs text-[var(--pv-muted)] mt-2">
            Add <code className="bg-black/30 px-1 rounded">JUSTTCG_API_KEY</code> to your environment to enable automatic pricing.
          </p>
        </div>
        <div className="px-6 py-4">
          <p className="text-xs text-[var(--pv-muted)]">
            Scheduled sync and manual trigger — Milestone 5
          </p>
        </div>
      </section>

      {/* Export section */}
      <section className="pv-panel divide-y divide-[var(--pv-border)]">
        <div className="px-6 py-4">
          <h2 className="text-sm font-semibold text-[var(--pv-muted)]">Export Collection</h2>
        </div>
        <div className="px-6 py-4">
          <p className="text-xs text-[var(--pv-muted)]">
            CSV and PDF export — Milestone 6
          </p>
        </div>
      </section>
    </div>
  )
}

