import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Scanner',
}

export default function ScannerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Card Scanner</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Scan or upload a card photo to identify and add it to your collection
        </p>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 flex flex-col items-center justify-center gap-3 text-center">
        <p className="text-zinc-400">Scanner — Milestone 4</p>
        <p className="text-sm text-zinc-500">
          Camera capture and image recognition powered by CardCorpus + OCR fallback.
        </p>
      </div>
    </div>
  )
}

