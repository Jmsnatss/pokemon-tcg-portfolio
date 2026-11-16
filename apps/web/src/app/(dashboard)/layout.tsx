import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: rows } = await supabase.from('collection_items').select('quantity')
  const totalCards = (rows ?? []).reduce((n, r: { quantity: number }) => n + r.quantity, 0)

  return <AppShell totalCards={totalCards}>{children}</AppShell>
}
