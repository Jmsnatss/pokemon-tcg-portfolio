import type { Metadata } from 'next'
import { ScannerLoader } from '@/components/scanner/ScannerLoader'

export const metadata: Metadata = {
  title: 'Scanner',
}

export default function ScannerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Card Scanner</h1>
        <p className="text-sm text-[var(--pv-muted)] mt-1">
          Scan or upload a card photo to identify it, then add it to your collection
        </p>
      </div>
      <ScannerLoader />
    </div>
  )
}
