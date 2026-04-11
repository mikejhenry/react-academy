import { vi, describe, it, expect, beforeEach } from 'vitest'
import { migrateGuestProgress } from './migrateGuestProgress'

const { mockProgressUpsert, mockCacheMaybySingle, mockCacheUpsert } = vi.hoisted(() => ({
  mockProgressUpsert: vi.fn(),
  mockCacheMaybySingle: vi.fn(),
  mockCacheUpsert: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'progress') return { upsert: mockProgressUpsert }
      return {
        select: () => ({ eq: () => ({ maybeSingle: mockCacheMaybySingle }) }),
        upsert: mockCacheUpsert,
      }
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mockProgressUpsert.mockResolvedValue({ error: null })
  mockCacheMaybySingle.mockResolvedValue({ data: null, error: null })
  mockCacheUpsert.mockResolvedValue({ error: null })
})

describe('migrateGuestProgress', () => {
  it('returns early without calling supabase when no guest data exists', async () => {
    await migrateGuestProgress('user-123')
    expect(mockProgressUpsert).not.toHaveBeenCalled()
    expect(mockCacheUpsert).not.toHaveBeenCalled()
  })

  it('upserts progress rows with correct shape and conflict config', async () => {
    localStorage.setItem('guest_progress', JSON.stringify({
      lessons: [
        { lesson_id: '1.1', module_id: '1', completed_at: '2024-03-15T10:00:00Z', xp_earned: 100 },
      ],
      quizScores: {},
      projectsPassed: [],
    }))

    await migrateGuestProgress('user-123')

    expect(mockProgressUpsert).toHaveBeenCalledWith(
      [{ user_id: 'user-123', lesson_id: '1.1', module_id: '1', completed_at: '2024-03-15T10:00:00Z', xp_earned: 100 }],
      { onConflict: 'user_id,lesson_id', ignoreDuplicates: true }
    )
  })

  it('adds guest_xp on top of existing leaderboard_cache xp', async () => {
    localStorage.setItem('guest_xp', '200')
    mockCacheMaybySingle.mockResolvedValue({ data: { xp: 100 }, error: null })

    await migrateGuestProgress('user-123')

    expect(mockCacheUpsert).toHaveBeenCalledWith({ user_id: 'user-123', xp: 300 })
  })

  it('uses 0 as base xp when no existing leaderboard_cache row', async () => {
    localStorage.setItem('guest_xp', '150')
    mockCacheMaybySingle.mockResolvedValue({ data: null, error: null })

    await migrateGuestProgress('user-123')

    expect(mockCacheUpsert).toHaveBeenCalledWith({ user_id: 'user-123', xp: 150 })
  })

  it('skips xp upsert when guest_xp is 0', async () => {
    localStorage.setItem('guest_xp', '0')

    await migrateGuestProgress('user-123')

    expect(mockCacheUpsert).not.toHaveBeenCalled()
  })

  it('clears guest_progress and guest_xp from localStorage after success', async () => {
    localStorage.setItem('guest_progress', JSON.stringify({ lessons: [], quizScores: {}, projectsPassed: [] }))
    localStorage.setItem('guest_xp', '100')

    await migrateGuestProgress('user-123')

    expect(localStorage.getItem('guest_progress')).toBeNull()
    expect(localStorage.getItem('guest_xp')).toBeNull()
  })

  it('clears localStorage even when supabase throws', async () => {
    mockProgressUpsert.mockRejectedValueOnce(new Error('network error'))
    localStorage.setItem('guest_progress', JSON.stringify({
      lessons: [{ lesson_id: '1.1', module_id: '1', completed_at: '2024-03-15T10:00:00Z', xp_earned: 100 }],
      quizScores: {},
      projectsPassed: [],
    }))

    await migrateGuestProgress('user-123')

    expect(localStorage.getItem('guest_progress')).toBeNull()
  })

  it('skips progress upsert when lessons array is empty', async () => {
    localStorage.setItem('guest_progress', JSON.stringify({ lessons: [], quizScores: {}, projectsPassed: [] }))

    await migrateGuestProgress('user-123')

    expect(mockProgressUpsert).not.toHaveBeenCalled()
  })
})
