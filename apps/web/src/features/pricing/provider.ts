/**
 * Pricing provider interface.
 * All pricing integrations must implement this interface.
 * This ensures providers are interchangeable and independently testable.
 */

import type { PriceQuery, PriceQueryResult, PriceHistoryPoint } from '@/types'

export interface PricingProvider {
  /** Unique internal name for this provider, e.g. "justtcg" */
  readonly name: string
  /** Human-readable display name, e.g. "JustTCG" */
  readonly displayName: string
  /** Whether this provider is currently configured and usable */
  readonly isAvailable: boolean

  /**
   * Fetch the current price for a specific card and condition.
   * Must never substitute a different printing or condition if exact match is unavailable.
   */
  getCurrentPrice(query: PriceQuery): Promise<PriceQueryResult>

  /**
   * Fetch historical price observations if supported by the provider's terms.
   * Returns an empty array if historical access is not permitted or unavailable.
   */
  getPriceHistory(
    query: PriceQuery,
    fromDate?: string,
    toDate?: string
  ): Promise<PriceHistoryPoint[]>

  /**
   * Report the provider's rate-limit status.
   * Returns remaining requests and reset timestamp if known.
   */
  getRateLimitStatus(): Promise<RateLimitStatus>
}

export interface RateLimitStatus {
  provider: string
  remainingRequests: number | null
  resetAt: string | null
  isThrottled: boolean
}

/**
 * Null object implementation: used when a provider is not configured.
 * Always returns "unavailable" without throwing.
 */
export class UnconfiguredProvider implements PricingProvider {
  constructor(
    public readonly name: string,
    public readonly displayName: string,
    private readonly reason: string
  ) {}

  get isAvailable() {
    return false
  }

  async getCurrentPrice(query: PriceQuery): Promise<PriceQueryResult> {
    return {
      source: this.name,
      sourceDisplayName: this.displayName,
      isAvailable: false,
      reason: this.reason,
    }
  }

  async getPriceHistory(): Promise<PriceHistoryPoint[]> {
    return []
  }

  async getRateLimitStatus(): Promise<RateLimitStatus> {
    return {
      provider: this.name,
      remainingRequests: null,
      resetAt: null,
      isThrottled: false,
    }
  }
}
