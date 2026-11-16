/**
 * Scanner provider interface.
 * All recognition backends must implement this interface.
 * Providers are independently testable and swappable.
 */

import type { ScanResult } from '@/types'

export interface ScannerProvider {
  readonly name: string
  readonly displayName: string
  readonly isAvailable: boolean

  /**
   * Identify a Pokémon card from the provided image bytes.
   * Returns candidates ranked by confidence (highest first).
   * MUST NOT assess or return card condition/grade assessments.
   */
  identifyCard(imageBuffer: Buffer, mimeType: string): Promise<ScanResult>
}

/**
 * Null object: used when the scanner service is unavailable.
 */
export class UnavailableScannerProvider implements ScannerProvider {
  constructor(
    public readonly name: string,
    public readonly displayName: string,
    private readonly reason: string
  ) {}

  get isAvailable() {
    return false
  }

  async identifyCard(_imageBuffer: Buffer, _mimeType: string): Promise<ScanResult> {
    return {
      candidates: [],
      scanDurationMs: 0,
      provider: this.name,
      error: this.reason,
    }
  }
}


/** Hints read from a card photo; the server matches these against the catalog. */
export type ScanHints = {
  names: string[]
  number: string | null
  total: string | null
}

/**
 * Client-side recognition backend. Runs in the browser so the photo never
 * leaves the device; only the extracted text hints are sent to the server.
 */
export interface BrowserScannerProvider {
  readonly name: string
  readonly displayName: string
  readonly isAvailable: boolean
  readHints(image: Blob, onProgress?: (fraction: number) => void): Promise<ScanHints>
  dispose(): Promise<void>
}
