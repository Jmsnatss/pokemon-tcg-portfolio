'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Camera, ImagePlus, RotateCcw, ScanLine, Search } from 'lucide-react'
import { Field } from '@/components/ui/Field'
import { Pokeball } from '@/components/ui/Pokeball'
import { TesseractBrowserProvider } from '@/features/scanner/browser-ocr'
import type { ScanCandidate, ScanResult } from '@/types'

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

type Mode = 'camera' | 'upload'
type Phase = 'idle' | 'reading' | 'matching' | 'done' | 'error'

export function ScannerPanel() {
  const [mode, setMode] = useState<Mode>('upload')
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [total, setTotal] = useState('')
  const [candidates, setCandidates] = useState<ScanCandidate[]>([])
  const [cameraReady, setCameraReady] = useState(false)

  const providerRef = useRef<TesseractBrowserProvider | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const previewRef = useRef<string | null>(null)

  const getProvider = () => (providerRef.current ??= new TesseractBrowserProvider())

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraReady(false)
  }, [])

  useEffect(() => {
    const provider = providerRef
    return () => {
      stopCamera()
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
      void provider.current?.dispose()
    }
  }, [stopCamera])

  const startCamera = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraReady(true)
    } catch {
      setError('Camera unavailable. Allow camera access, or upload a photo instead.')
      setMode('upload')
    }
  }, [])

  const switchMode = (next: Mode) => {
    setMode(next)
    if (next === 'camera') void startCamera()
    else stopCamera()
  }

  const lookup = useCallback(async (names: string[], num: string, tot: string) => {
    setPhase('matching')
    try {
      const res = await fetch('/api/scanner/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names, number: num || null, total: tot || null }),
      })
      const json = (await res.json()) as { data?: ScanResult; error?: string }
      if (!res.ok || !json.data) {
        setError(json.error ?? 'Lookup failed')
        setPhase('error')
        return
      }
      setCandidates(json.data.candidates)
      setPhase('done')
    } catch {
      setError('Network error. Please try again.')
      setPhase('error')
    }
  }, [])

  const processImage = useCallback(
    async (blob: Blob) => {
      setError(null)
      setCandidates([])
      if (!ALLOWED.includes(blob.type)) {
        setError('Use a JPEG, PNG or WebP image.')
        return
      }
      if (blob.size > MAX_BYTES) {
        setError('That image is over 10 MB. Try a smaller photo.')
        return
      }
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
      const url = URL.createObjectURL(blob)
      previewRef.current = url
      setPreview(url)
      setPhase('reading')
      setProgress(0)
      try {
        const hints = await getProvider().readHints(blob, setProgress)
        setName(hints.names[0] ?? '')
        setNumber(hints.number ?? '')
        setTotal(hints.total ?? '')
        if (hints.names.length === 0) {
          setError('Could not read a card name. Edit the fields below or retake the photo with the card filling the frame.')
          setPhase('error')
          return
        }
        await lookup(hints.names, hints.number ?? '', hints.total ?? '')
      } catch {
        setError('Could not read that image. Try a sharper, well-lit photo.')
        setPhase('error')
      }
    },
    [lookup]
  )

  const capture = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob((b) => b && void processImage(b), 'image/jpeg', 0.92)
  }

  const reset = () => {
    setPhase('idle')
    setCandidates([])
    setError(null)
    setPreview(null)
    setName('')
    setNumber('')
    setTotal('')
  }

  const busy = phase === 'reading' || phase === 'matching'

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
      <section className="pv-panel space-y-4 p-4">
        <div className="flex gap-1 rounded-xl bg-black/30 p-1" role="tablist" aria-label="Scan source">
          {(['upload', 'camera'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition active:scale-95 ${
                mode === m ? 'bg-[var(--pv-yellow)] text-black' : 'text-[var(--pv-muted)] hover:text-white'
              }`}
            >
              {m === 'upload' ? <ImagePlus className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
              {m === 'upload' ? 'Upload photo' : 'Use camera'}
            </button>
          ))}
        </div>

        {mode === 'camera' ? (
          <div className="space-y-3">
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-black">
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-dashed border-[var(--pv-yellow)]/70" />
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--pv-muted)]">Starting camera…</div>
              )}
            </div>
            <button type="button" onClick={capture} disabled={!cameraReady || busy} className="pv-btn pv-btn-primary w-full !py-2.5">
              <ScanLine className="h-4 w-4" /> Capture and identify
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition hover:border-[var(--pv-yellow)]/60">
            <ImagePlus className="h-8 w-8 text-[var(--pv-muted)]" />
            <span className="text-sm text-white">Choose a photo of one card</span>
            <span className="text-xs text-[var(--pv-muted)]">JPEG, PNG or WebP, up to 10 MB</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void processImage(f)
                e.target.value = ''
              }}
            />
          </label>
        )}

        <p className="text-xs leading-relaxed text-[var(--pv-muted)]">
          Tip: lay the card flat in good light, fill the frame with the card, and keep the name at the top and the number at the
          bottom visible. Photos are read on your device and never uploaded; only the detected text is sent to look up matches.
        </p>

        {preview && (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Your scanned card" className="h-24 w-auto rounded-lg border" />
            <button type="button" onClick={reset} className="pv-btn pv-btn-ghost">
              <RotateCcw className="h-4 w-4" /> Start over
            </button>
          </div>
        )}
      </section>

      <section className="min-w-0 space-y-5">
        {phase === 'reading' && (
          <div className="pv-panel flex items-center gap-4 p-5">
            <Pokeball className="pv-pokeball-spin h-8 w-8" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Reading your card…</p>
              <div className="pv-xp mt-2"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>
              <p className="mt-1 text-[11px] text-[var(--pv-muted)]">The first scan downloads the text model (a few MB).</p>
            </div>
          </div>
        )}
        {phase === 'matching' && (
          <div className="pv-panel flex items-center gap-4 p-5">
            <Pokeball className="pv-pokeball-spin h-8 w-8" />
            <p className="text-sm font-semibold text-white">Matching against the catalog…</p>
          </div>
        )}
        {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200" role="alert">{error}</p>}

        {(phase === 'done' || phase === 'error') && (
          <form
            className="pv-panel space-y-3 p-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (name.trim().length >= 2) void lookup([name.trim()], number.trim(), total.trim())
            }}
          >
            <h2 className="text-sm font-bold text-white">What we read (edit if wrong)</h2>
            <div className="grid grid-cols-[1fr_90px_90px] gap-3">
              <Field label="Card name">
                <input className="pv-control" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
              </Field>
              <Field label="Number" optional>
                <input className="pv-control" value={number} onChange={(e) => setNumber(e.target.value)} maxLength={12} />
              </Field>
              <Field label="Set total" optional>
                <input className="pv-control" value={total} onChange={(e) => setTotal(e.target.value)} maxLength={12} />
              </Field>
            </div>
            <button type="submit" disabled={busy || name.trim().length < 2} className="pv-btn pv-btn-gold">
              <Search className="h-4 w-4" /> Search again
            </button>
          </form>
        )}

        {phase === 'done' && candidates.length === 0 && (
          <div className="pv-panel space-y-3 p-5 text-sm text-[var(--pv-muted)]">
            <p>No catalog match found. Adjust the name or number above, or search by hand.</p>
            <Link href="/market" className="pv-btn pv-btn-ghost inline-flex">Open Market Explorer</Link>
          </div>
        )}

        {phase === 'done' && candidates.length > 0 && (
          <>
            <p className="text-xs text-[var(--pv-muted)]">
              Ranked by name and number match. Confidence scores aren&apos;t shown because they aren&apos;t calibrated. Always confirm the
              set and number. This tool identifies cards only; it doesn&apos;t grade condition.
            </p>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {candidates.map((c) => (
                <li key={c.cardProviderId} className="pv-rise" style={{ ['--i' as string]: c.rank }}>
                  <Link href={`/card/${c.cardProviderId}`} className="pv-panel pv-interactive pv-tilt relative block p-2.5">
                    {c.rank === 1 && <span className="pv-chip pv-chip-gold absolute left-4 top-4 z-10 !bg-black/70">Best match</span>}
                    {c.imageUrl ? (
                      <div className="pv-card-art">
                        <Image src={c.imageUrl} alt={c.cardName} width={245} height={342} className="h-auto w-full" />
                      </div>
                    ) : (
                      <div className="flex aspect-[245/342] items-center justify-center rounded-lg bg-black/30 text-xs text-[var(--pv-muted)]">No image</div>
                    )}
                    <p className="mt-2.5 truncate text-sm font-semibold text-white">{c.cardName}</p>
                    <p className="truncate text-xs text-[var(--pv-muted)]">{c.setName || c.cardProviderId} · #{c.collectorNumber}</p>
                    <span className="mt-2 inline-block text-xs font-semibold text-[var(--pv-yellow)]">View and add</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {phase === 'idle' && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Pokeball className="h-14 w-14 opacity-80" />
            <p className="text-sm text-[var(--pv-muted)]">Upload or capture a card to identify it.</p>
          </div>
        )}
      </section>
    </div>
  )
}
