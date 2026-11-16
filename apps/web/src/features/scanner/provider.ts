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
