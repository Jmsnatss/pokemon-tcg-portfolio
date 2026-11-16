import { describe, expect, it } from 'vitest'
import { isValidGrade } from './grading'

describe('isValidGrade', () => {
  it('PSA accepts whole grades 1-10 only', () => {
    expect(isValidGrade('PSA', 10)).toBe(true)
    expect(isValidGrade('PSA', 1)).toBe(true)
    expect(isValidGrade('PSA', 9.5)).toBe(false)
    expect(isValidGrade('PSA', 0)).toBe(false)
    expect(isValidGrade('PSA', 11)).toBe(false)
  })

  it('BGS accepts half grades 1-10', () => {
    expect(isValidGrade('BGS', 9.5)).toBe(true)
    expect(isValidGrade('BGS', 9.3)).toBe(false)
    expect(isValidGrade('BGS', 0.5)).toBe(false)
  })

  it('CGC accepts half grades 0.5-10', () => {
    expect(isValidGrade('CGC', 0.5)).toBe(true)
    expect(isValidGrade('CGC', 10)).toBe(true)
    expect(isValidGrade('CGC', 0)).toBe(false)
  })

  it('rejects NaN', () => {
    expect(isValidGrade('PSA', Number.NaN)).toBe(false)
  })
})
