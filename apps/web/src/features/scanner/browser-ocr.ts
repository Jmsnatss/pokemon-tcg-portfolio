import type { Worker } from 'tesseract.js'
import { extractCollectorNumber, extractNameCandidates } from './parse'
import type { BrowserScannerProvider, ScanHints } from './provider'

const MAX_SIDE = 2000

/** Bands as fractions of the card image: [left, top, width, height]. Tuned on TCGdex card scans. */
type Band = readonly [number, number, number, number]
const NAME_BAND: Band = [0.14, 0.03, 0.62, 0.085]
const FOOTER_BANDS: Band[] = [
  [0, 0.925, 0.5, 0.07],
  [0.5, 0.925, 0.5, 0.07],
]
const FOOTER_WHITELIST = '0123456789/ABCDEFGHIJKLMNOPQRSTUVWXYZ-'

/** Crops a band, upscales it so small print is legible, and boosts contrast in grayscale. */
async function cropBand(bitmap: ImageBitmap, band: Band, minWidth: number): Promise<Blob> {
  const sx = Math.round(band[0] * bitmap.width)
  const sy = Math.round(band[1] * bitmap.height)
  const sw = Math.max(1, Math.round(band[2] * bitmap.width))
  const sh = Math.max(1, Math.round(band[3] * bitmap.height))
  const scale = Math.max(1, Math.min(4, minWidth / sw))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sw * scale)
  canvas.height = Math.round(sh * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not supported in this browser')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = img.data
  let lo = 255
  let hi = 0
  for (let i = 0; i < d.length; i += 4) {
    const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])
    d[i] = d[i + 1] = d[i + 2] = g
    if (g < lo) lo = g
    if (g > hi) hi = g
  }
  const range = Math.max(1, hi - lo)
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.round(((d[i] - lo) / range) * 255)
    d[i] = d[i + 1] = d[i + 2] = v
  }
  ctx.putImageData(img, 0, 0)
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process image'))), 'image/png')
  )
}

async function loadBitmap(image: Blob): Promise<ImageBitmap> {
  const bitmap = await createImageBitmap(image)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  if (scale === 1) return bitmap
  const resized = await createImageBitmap(bitmap, {
    resizeWidth: Math.round(bitmap.width * scale),
    resizeHeight: Math.round(bitmap.height * scale),
    resizeQuality: 'high',
  })
  bitmap.close()
  return resized
}

/**
 * Reads the card name (top band) and collector number (footer corners) with
 * Tesseract in a web worker. It identifies a card; it never grades it.
 * The photo stays on the device: only the extracted text is sent to the server.
 */
export class TesseractBrowserProvider implements BrowserScannerProvider {
  readonly name = 'browser-ocr'
  readonly displayName = 'On-device OCR (Tesseract.js)'
  readonly isAvailable = typeof window !== 'undefined'

  private worker: Worker | null = null
  private onProgress: ((f: number) => void) | undefined

  private async getWorker(): Promise<Worker> {
    if (this.worker) return this.worker
    const { createWorker } = await import('tesseract.js')
    this.worker = await createWorker('eng', 1, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text') this.onProgress?.(m.progress)
      },
    })
    return this.worker
  }

  async readHints(image: Blob, onProgress?: (fraction: number) => void): Promise<ScanHints> {
    this.onProgress = onProgress
    const bitmap = await loadBitmap(image)
    try {
      const worker = await this.getWorker()
      const { PSM } = await import('tesseract.js')

      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE, tessedit_char_whitelist: '' })
      const name = await worker.recognize(await cropBand(bitmap, NAME_BAND, 1200))

      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE, tessedit_char_whitelist: FOOTER_WHITELIST })
      let number = null as ReturnType<typeof extractCollectorNumber>
      for (const band of FOOTER_BANDS) {
        const foot = await worker.recognize(await cropBand(bitmap, band, 1000))
        number = extractCollectorNumber(foot.data.text)
        if (number) break
      }

      return {
        names: extractNameCandidates(name.data.text),
        number: number?.number ?? null,
        total: number?.total ?? null,
      }
    } finally {
      bitmap.close()
    }
  }

  async dispose(): Promise<void> {
    await this.worker?.terminate()
    this.worker = null
  }
}
