import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatRelativeTime } from './formatRelativeTime'

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-03-15T12:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" for < 60 seconds ago', () => {
    expect(formatRelativeTime('2024-03-15T11:59:30Z')).toBe('just now')
  })

  it('returns minutes for < 1 hour ago', () => {
    expect(formatRelativeTime('2024-03-15T11:30:00Z')).toBe('30m ago')
  })

  it('returns hours for < 24 hours ago', () => {
    expect(formatRelativeTime('2024-03-15T08:00:00Z')).toBe('4h ago')
  })

  it('returns "yesterday" for exactly 1 day ago', () => {
    expect(formatRelativeTime('2024-03-14T12:00:00Z')).toBe('yesterday')
  })

  it('returns days for 2-6 days ago', () => {
    expect(formatRelativeTime('2024-03-12T12:00:00Z')).toBe('3d ago')
  })

  it('returns weeks for 7-29 days ago', () => {
    expect(formatRelativeTime('2024-03-08T12:00:00Z')).toBe('1w ago')
  })

  it('returns months for >= 30 days ago', () => {
    expect(formatRelativeTime('2024-02-14T12:00:00Z')).toBe('1mo ago')
  })
})
