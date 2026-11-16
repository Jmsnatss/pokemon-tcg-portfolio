import { beforeEach, describe, expect, it } from 'vitest'
import { rateLimit, resetRateLimits } from './rate-limit'

describe('rateLimit', () => {
  beforeEach(() => resetRateLimits())

  it('allows requests up to the limit then blocks', () => {
    expect(rateLimit('u1', 2, 1000, 0)).toBe(true)
    expect(rateLimit('u1', 2, 1000, 1)).toBe(true)
    expect(rateLimit('u1', 2, 1000, 2)).toBe(false)
  })

  it('resets after the window', () => {
    rateLimit('u1', 1, 1000, 0)
    expect(rateLimit('u1', 1, 1000, 500)).toBe(false)
    expect(rateLimit('u1', 1, 1000, 1001)).toBe(true)
  })

  it('tracks keys independently', () => {
    rateLimit('a', 1, 1000, 0)
    expect(rateLimit('b', 1, 1000, 0)).toBe(true)
  })
})
