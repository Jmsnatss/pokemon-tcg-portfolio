'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import type { RefreshSummary } from './sync-graded'

export function RefreshGradedButton({ configured }: { configured: boolean }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)

  async function onClick() {
    setPending(true)
    setMessage(null)
    try {
      const res = await fetch('/api/pricing/refresh-graded', { method: 'POST' })
      const json = (await res.json()) as { data?: RefreshSummary; error?: string }
      if (!res.ok || !json.data) {
        setMessage({ text: json.error ?? 'Refresh failed', error: true })
        return
      }
      const s = json.data
      const parts = [`${s.updated} updated`]
      if (s.skippedFresh) parts.push(`${s.skippedFresh} already fresh`)
      if (s.remainingToCheck) parts.push(`${s.remainingToCheck} more to check, click again`)
      if (s.failures.length) parts.push(`${s.failures.length} unavailable (${s.failures[0].reason})`)
      setMessage({ text: parts.join(' · '), error: s.updated === 0 && s.failures.length > 0 })
      router.refresh()
    } catch {
      setMessage({ text: 'Network error. Please try again.', error: true })
    } finally {
      setPending(false)
    }
  }

  if (!configured) {
    return (
      <p className="max-w-xs text-xs text-[var(--pv-muted)]">
        Graded prices need a free JustTCG API key. Add <code className="rounded bg-black/30 px-1">JUSTTCG_API_KEY</code> to{' '}
        <code className="rounded bg-black/30 px-1">.env.local</code>.
      </p>
    )
  }

  return (
    <div className="space-y-1.5">
      <button type="button" onClick={onClick} disabled={pending} className="pv-btn pv-btn-ghost">
        <RefreshCw className={`h-4 w-4 ${pending ? 'animate-spin' : ''}`} />
        {pending ? 'Fetching (about 7s per slab)…' : 'Refresh graded prices'}
      </button>
      {message && (
        <p className={`max-w-sm text-xs ${message.error ? 'text-red-400' : 'text-green-400'}`} role="status">
          {message.text}
        </p>
      )}
    </div>
  )
}
