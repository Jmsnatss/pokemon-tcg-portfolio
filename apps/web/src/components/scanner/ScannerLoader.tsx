'use client'

import dynamic from 'next/dynamic'

const ScannerPanel = dynamic(() => import('./ScannerPanel').then((m) => m.ScannerPanel), {
  ssr: false,
  loading: () => <p className="text-sm text-[var(--pv-muted)]">Loading scanner…</p>,
})

export function ScannerLoader() {
  return <ScannerPanel />
}
