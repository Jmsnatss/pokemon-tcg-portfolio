import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatDate,
  calculateGainPercent,
  truncate,
  buildCardImageUrl,
} from '@/lib/utils/format'

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency('12.50', 'USD')).toBe('$12.50')
  })

  it('returns em-dash for null', () => {
    expect(formatCurrency(null)).toBe('—')
  })

  it('returns em-dash for empty string', () => {
    expect(formatCurrency('')).toBe('—')
  })

  it('returns em-dash for NaN string', () => {
    expect(formatCurrency('not-a-number')).toBe('—')
  })

  it('formats numeric values', () => {
    expect(formatCurrency(100, 'USD')).toBe('$100.00')
  })
})

describe('formatDate', () => {
  it('formats valid ISO date', () => {
    const result = formatDate('2024-01-15')
    expect(result).toBe('Jan 15, 2024')
  })

  it('returns em-dash for null', () => {
    expect(formatDate(null)).toBe('—')
  })

  it('returns em-dash for invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('—')
  })
})

describe('calculateGainPercent', () => {
  it('calculates positive gain correctly', () => {
    expect(calculateGainPercent(150, 100)).toBeCloseTo(50)
  })

  it('calculates negative gain correctly', () => {
    expect(calculateGainPercent(50, 100)).toBeCloseTo(-50)
  })

  it('returns null when cost is zero', () => {
    expect(calculateGainPercent(100, 0)).toBeNull()
  })

  it('returns null when cost is not provided', () => {
    expect(calculateGainPercent(100, 0)).toBeNull()
  })
})

describe('truncate', () => {
  it('does not truncate short strings', () => {
    expect(truncate('Hello', 10)).toBe('Hello')
  })

  it('truncates long strings with ellipsis', () => {
    expect(truncate('Hello world', 8)).toBe('Hello w…')
  })
})

describe('buildCardImageUrl', () => {
  it('builds high quality URL', () => {
    expect(buildCardImageUrl('https://assets.tcgdex.net/en/swsh/swsh1/1')).toBe(
      'https://assets.tcgdex.net/en/swsh/swsh1/1/high.webp'
    )
  })

  it('builds low quality URL', () => {
    expect(buildCardImageUrl('https://assets.tcgdex.net/en/swsh/swsh1/1', 'low')).toBe(
      'https://assets.tcgdex.net/en/swsh/swsh1/1/low.webp'
    )
  })

  it('returns null for null input', () => {
    expect(buildCardImageUrl(null)).toBeNull()
  })
})

