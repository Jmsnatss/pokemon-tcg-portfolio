const buckets = new Map<string, { count: number; resetAt: number }>()

/**
 * Fixed-window in-memory rate limiter. Per server instance only: adequate for
 * a single-user deployment, not a substitute for a shared limiter at scale.
 * @returns true if the request is allowed
 */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= limit) return false
  bucket.count += 1
  return true
}

export function resetRateLimits(): void {
  buckets.clear()
}
