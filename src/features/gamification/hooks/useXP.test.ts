import { describe, it, expect } from 'vitest'
import { computeNewStreak, buildProgressState } from './useXP'
import { MODULES } from '@/data/curriculum'

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

describe('buildProgressState', () => {
  it('maps completedLessons from progress rows', () => {
    const rows = [
      { lesson_id: '1.1', completed_at: '2024-03-15T10:00:00Z' },
      { lesson_id: '1.2', completed_at: '2024-03-15T11:00:00Z' },
    ]
    const result = buildProgressState(rows, [], 500, 1, '2024-03-15')
    expect(result.completedLessons).toEqual(['1.1', '1.2'])
  })

  it('marks a module complete when all its lessons are present', () => {
    const mod = MODULES[0]
    const allLessons = mod.lessons.map(l => ({
      lesson_id: l.id,
      completed_at: '2024-03-15T10:00:00Z',
    }))
    const result = buildProgressState(allLessons, [], 500, 1, '2024-03-15')
    expect(result.completedModules).toContain(mod.id)
  })

  it('does not mark a module complete when some lessons are missing', () => {
    const mod = MODULES[0]
    const partialLessons = mod.lessons.slice(0, -1).map(l => ({
      lesson_id: l.id,
      completed_at: '2024-03-15T10:00:00Z',
    }))
    const result = buildProgressState(partialLessons, [], 500, 1, '2024-03-15')
    expect(result.completedModules).not.toContain(mod.id)
  })

  it('uses the best score per lesson for quizScores', () => {
    const quizRows = [
      { lesson_id: '1.1', score: 80 },
      { lesson_id: '1.1', score: 100 },
      { lesson_id: '1.2', score: 60 },
    ]
    const result = buildProgressState([], quizRows, 0, 0, '2024-03-15')
    expect(result.quizScores['1.1']).toBe(100)
    expect(result.quizScores['1.2']).toBe(60)
  })

  it('counts only lessons completed today for lessonsToday', () => {
    const rows = [
      { lesson_id: '1.1', completed_at: '2024-03-15T10:00:00Z' },
      { lesson_id: '1.2', completed_at: '2024-03-14T10:00:00Z' }, // yesterday
      { lesson_id: '1.3', completed_at: '2024-03-15T22:00:00Z' },
    ]
    const result = buildProgressState(rows, [], 500, 1, '2024-03-15')
    expect(result.lessonsToday).toBe(2)
  })

  it('returns empty state for empty inputs', () => {
    const result = buildProgressState([], [], 0, 0, '2024-03-15')
    expect(result.completedLessons).toHaveLength(0)
    expect(result.completedModules).toHaveLength(0)
    expect(result.quizScores).toEqual({})
    expect(result.lessonsToday).toBe(0)
  })
})
