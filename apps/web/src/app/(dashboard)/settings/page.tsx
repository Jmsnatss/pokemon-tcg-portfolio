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
        <h1 className="text-2xl font-bold text-zinc-50">Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Manage your account and application preferences
        </p>
      </div>

      {/* Account section */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
        <div className="px-6 py-4">
          <h2 className="text-sm font-semibold text-zinc-300">Account</h2>
        </div>
        <div className="px-6 py-4 space-y-1">
          <p className="text-xs text-zinc-500">Email</p>
          <p className="text-sm text-zinc-200">{user!.email}</p>
        </div>
        <div className="px-6 py-4 space-y-1">
          <p className="text-xs text-zinc-500">Display Name</p>
          <p className="text-sm text-zinc-200">{profile?.display_name ?? '—'}</p>
        </div>
        <div className="px-6 py-4 space-y-1">
          <p className="text-xs text-zinc-500">Preferred Currency</p>
          <p className="text-sm text-zinc-200">{profile?.preferred_currency ?? 'USD'}</p>
        </div>
        <div className="px-6 py-4">
          <p className="text-xs text-zinc-500">
            Profile editing — Milestone 2
          </p>
        </div>
      </section>

      {/* Pricing sync section */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
        <div className="px-6 py-4">
          <h2 className="text-sm font-semibold text-zinc-300">Pricing Synchronization</h2>
        </div>
        <div className="px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-sm text-zinc-400">JustTCG — API key not configured</span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            Add <code className="bg-zinc-800 px-1 rounded">JUSTTCG_API_KEY</code> to your environment to enable automatic pricing.
          </p>
        </div>
        <div className="px-6 py-4">
          <p className="text-xs text-zinc-500">
            Scheduled sync and manual trigger — Milestone 5
          </p>
        </div>
      </section>

      {/* Export section */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
        <div className="px-6 py-4">
          <h2 className="text-sm font-semibold text-zinc-300">Export Collection</h2>
        </div>
        <div className="px-6 py-4">
          <p className="text-xs text-zinc-500">
            CSV and PDF export — Milestone 6
          </p>
        </div>
      </section>
    </div>
  )
}
