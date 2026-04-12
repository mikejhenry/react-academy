import { describe, it, expect } from 'vitest'
import { getLessonStatuses } from './getLessonStatuses'
import type { Lesson } from '@/lib/types'

const makeLessons = (ids: string[]): Lesson[] =>
  ids.map(id => ({
    id,
    title: `Lesson ${id}`,
    duration: 10,
    xpReward: 100,
    content: [],
    quiz: [],
  }))

describe('getLessonStatuses', () => {
  it('marks all as completed when all IDs are in completedLessons', () => {
    const lessons = makeLessons(['1.1', '1.2', '1.3'])
    const result = getLessonStatuses(lessons, ['1.1', '1.2', '1.3'])
    expect(result.map(r => r.status)).toEqual(['completed', 'completed', 'completed'])
  })

  it('makes first lesson current and rest locked when none are completed', () => {
    const lessons = makeLessons(['1.1', '1.2', '1.3'])
    const result = getLessonStatuses(lessons, [])
    expect(result.map(r => r.status)).toEqual(['current', 'locked', 'locked'])
  })

  it('handles partial progress: 2 of 5 completed', () => {
    const lessons = makeLessons(['1.1', '1.2', '1.3', '1.4', '1.5'])
    const result = getLessonStatuses(lessons, ['1.1', '1.2'])
    expect(result.map(r => r.status)).toEqual(['completed', 'completed', 'current', 'locked', 'locked'])
  })

  it('returns single lesson as current when not completed', () => {
    const lessons = makeLessons(['1.1'])
    const result = getLessonStatuses(lessons, [])
    expect(result.map(r => r.status)).toEqual(['current'])
  })

  it('returns single lesson as completed when in completedLessons', () => {
    const lessons = makeLessons(['1.1'])
    const result = getLessonStatuses(lessons, ['1.1'])
    expect(result.map(r => r.status)).toEqual(['completed'])
  })

  it('treats undefined completedLessons as empty array', () => {
    const lessons = makeLessons(['1.1', '1.2'])
    const result = getLessonStatuses(lessons, undefined)
    expect(result.map(r => r.status)).toEqual(['current', 'locked'])
  })

  it('preserves lesson objects in the returned array', () => {
    const lessons = makeLessons(['1.1', '1.2'])
    const result = getLessonStatuses(lessons, ['1.1'])
    expect(result[0].lesson).toBe(lessons[0])
    expect(result[1].lesson).toBe(lessons[1])
  })

  it('treats lessons after the current boundary as locked even if in completedLessons', () => {
    const lessons = makeLessons(['1.1', '1.2', '1.3', '1.4'])
    const result = getLessonStatuses(lessons, ['1.1', '1.3']) // 1.2 skipped
    expect(result.map(r => r.status)).toEqual(['completed', 'current', 'locked', 'locked'])
  })

  it('returns empty array when given empty lessons', () => {
    const result = getLessonStatuses([], ['1.1'])
    expect(result).toEqual([])
  })
})
