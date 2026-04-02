import { describe, it, expect } from 'vitest'
import { computeNewStreak } from './useXP'

describe('computeNewStreak', () => {
  it('returns 1 when no prior activity', () => {
    expect(computeNewStreak(null, '2024-03-15', 0)).toBe(1)
  })

  it('increments streak when activity was yesterday', () => {
    expect(computeNewStreak('2024-03-14', '2024-03-15', 3)).toBe(4)
  })

  it('preserves streak when activity was today already', () => {
    expect(computeNewStreak('2024-03-15', '2024-03-15', 5)).toBe(5)
  })

  it('resets streak to 1 when gap > 1 day', () => {
    expect(computeNewStreak('2024-03-10', '2024-03-15', 7)).toBe(1)
  })

  it('handles month boundaries correctly', () => {
    expect(computeNewStreak('2024-02-29', '2024-03-01', 2)).toBe(3)
  })
})
