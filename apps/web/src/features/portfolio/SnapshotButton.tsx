'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera } from 'lucide-react'

export function SnapshotButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)

  async function onClick() {
    setPending(true)
    setMessage(null)
    try {
      const res = await fetch('/api/portfolio/snapshot', { method: 'POST' })
      const json = (await res.json()) as { data?: { snapshots: number; variantsPriced: number }; error?: string }
      if (!res.ok || !json.data) {
        setMessage({ text: json.error ?? 'Snapshot failed', error: true })
        return
      }
      setMessage({
        text: json.data.snapshots > 0 ? `Saved today's snapshot (${json.data.variantsPriced} cards priced).` : 'Nothing priced yet, so no snapshot was saved.',
        error: json.data.snapshots === 0,
      })
      router.refresh()
    } catch {
      setMessage({ text: 'Network error. Please try again.', error: true })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <button type="button" onClick={onClick} disabled={pending} className="pv-btn pv-btn-ghost">
        <Camera className="h-4 w-4" />
        {pending ? 'Recording…' : "Record today's snapshot"}
      </button>
      {message && (
        <p className={`text-xs ${message.error ? 'text-red-400' : 'text-green-400'}`} role="status">
          {message.text}
        </p>
      )}
    </div>
  )
}
