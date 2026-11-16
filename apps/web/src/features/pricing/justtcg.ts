/**
 * JustTCG pricing provider.
 * API documentation: https://justtcg.com/docs
 *
 * STATUS: Stub implementation — API key not yet obtained.
 * Returns UnconfiguredProvider if JUSTTCG_API_KEY is not set.
 * Full implementation will be completed in Milestone 3.
 */

import type { PriceQuery, PriceQueryResult, PriceHistoryPoint } from '@/types'
import {
  PricingProvider,
  UnconfiguredProvider,
  RateLimitStatus,
} from './provider'

class JustTCGProvider implements PricingProvider {
  readonly name = 'justtcg'
  readonly displayName = 'JustTCG'
  readonly isAvailable = true

  private readonly apiKey: string
  private readonly baseUrl = 'https://justtcg.com/api'  // TBC from docs

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async getCurrentPrice(query: PriceQuery): Promise<PriceQueryResult> {
    // TODO: Implement after reviewing https://justtcg.com/docs for exact endpoint shapes.
    // This is a placeholder that correctly returns unavailable rather than fabricated data.
    return {
      source: this.name,
      sourceDisplayName: this.displayName,
      isAvailable: false,
      reason: 'JustTCG integration not yet implemented — Milestone 3',
    }
  }

  async getPriceHistory(
    query: PriceQuery,
    fromDate?: string,
    toDate?: string
  ): Promise<PriceHistoryPoint[]> {
    // TODO: Implement after verifying JustTCG's historical data policy and endpoints.
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

/**
 * Returns the JustTCG provider if configured, or an UnconfiguredProvider.
 * Server-side only — API key must not be exposed to the browser.
 */
export function getJustTCGProvider(): PricingProvider {
  const apiKey = process.env.JUSTTCG_API_KEY

  if (!apiKey) {
    return new UnconfiguredProvider(
      'justtcg',
      'JustTCG',
      'JUSTTCG_API_KEY environment variable is not set'
    )
  }

  return new JustTCGProvider(apiKey)
}

