import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Scanner',
}

export default function ScannerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Card Scanner</h1>
        <p className="text-sm text-[var(--pv-muted)] mt-1">
          Scan or upload a card photo to identify and add it to your collection
        </p>
      </div>
      <div className="pv-panel p-12 flex flex-col items-center justify-center gap-3 text-center">
        <p className="text-[var(--pv-muted)]">Scanner — Milestone 4</p>
        <p className="text-sm text-[var(--pv-muted)]">
          Camera capture and image recognition powered by CardCorpus + OCR fallback.
        </p>
      </div>
    </div>
  )
}

