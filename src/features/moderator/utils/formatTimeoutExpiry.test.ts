import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatTimeoutExpiry } from './formatTimeoutExpiry'

describe('formatTimeoutExpiry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-08T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('returns "Expired" for past timestamps', () => {
    expect(formatTimeoutExpiry('2026-04-08T11:00:00Z')).toBe('Expired')
  })

  it('returns minutes remaining when under 1 hour', () => {
    expect(formatTimeoutExpiry('2026-04-08T12:45:00Z')).toBe('45m remaining')
  })

  it('returns hours remaining when exactly on the hour', () => {
    expect(formatTimeoutExpiry('2026-04-08T14:00:00Z')).toBe('2h remaining')
  })

  it('returns hours and minutes when under 24 hours', () => {
    expect(formatTimeoutExpiry('2026-04-08T14:30:00Z')).toBe('2h 30m remaining')
  })

  it('returns days when over 24 hours', () => {
    expect(formatTimeoutExpiry('2026-04-10T12:00:00Z')).toBe('2d remaining')
  })
})
