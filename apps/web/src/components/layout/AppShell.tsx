'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Library, ScanLine, TrendingUp, Settings, LogOut, Menu, X } from 'lucide-react'
import { Pokeball } from '@/components/ui/Pokeball'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { getTrainerRank } from '@/lib/utils/progress'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/collection', label: 'Collection', icon: Library },
  { href: '/scanner', label: 'Scanner', icon: ScanLine },
  { href: '/market', label: 'Market', icon: TrendingUp },
  { href: '/settings', label: 'Settings', icon: Settings },
]

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <Pokeball className="w-8 h-8 transition-transform duration-500 hover:rotate-[360deg]" />
      <span className="font-bold tracking-tight text-white">
        Poké<span className="text-[var(--pv-yellow)]">Vault</span>
      </span>
    </div>
  )
}

function TrainerCard({ totalCards }: { totalCards: number }) {
  const rank = getTrainerRank(totalCards)
  return (
    <div className="pv-panel mx-3 mb-3 p-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-[var(--pv-yellow)]">Lv. {rank.level} · {rank.title}</span>
      </div>
      <div className="pv-xp" role="progressbar" aria-valuenow={rank.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Rank progress">
        <span style={{ width: `${rank.progress}%` }} />
      </div>
      <p className="text-[11px] text-[var(--pv-muted)]">
        {rank.nextAt === null
          ? `${totalCards} cards · max rank`
          : `${totalCards} / ${rank.nextAt} cards to next rank`}
      </p>
    </div>
  )
}

export function AppShell({ children, totalCards = 0 }: { children: React.ReactNode; totalCards?: number }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientSupabaseClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const nav = (
    <>
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Main navigation">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="pv-nav-link"
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>
      <TrainerCard totalCards={totalCards} />
      <div className="px-3 py-3 border-t">
        <button onClick={handleSignOut} className="pv-nav-link w-full hover:!text-red-400">
          <LogOut className="w-4 h-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </>
  )

  return (
    <div className="pv-app flex min-h-screen">
      <aside className="hidden md:flex flex-col w-64 border-r bg-[var(--pv-surface)]/80 backdrop-blur shrink-0">
        <div className="px-5 py-5 border-b">
          <Brand />
        </div>
        {nav}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 md:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-[var(--pv-surface)] border-r md:hidden transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-between px-5 py-5 border-b">
          <Brand />
          <button onClick={() => setMobileOpen(false)} className="text-[var(--pv-muted)] hover:text-white" aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        </div>
        {nav}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b bg-[var(--pv-surface)] sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="text-[var(--pv-muted)] hover:text-white p-1" aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
          <Brand />
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}
