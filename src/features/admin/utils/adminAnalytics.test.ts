import { describe, it, expect } from 'vitest'
import { bucketXP, groupByLesson, groupByStatus } from './adminAnalytics'

describe('bucketXP', () => {
  it('assigns 0–499 XP to first bucket', () => {
    const result = bucketXP([0, 100, 499])
    expect(result.find(b => b.label === '0–499')?.count).toBe(3)
  })

  it('assigns 500–999 XP to second bucket', () => {
    const result = bucketXP([500, 750, 999])
    expect(result.find(b => b.label === '500–999')?.count).toBe(3)
  })

  it('assigns 1000–4999 XP to third bucket', () => {
    const result = bucketXP([1000, 2500, 4999])
    expect(result.find(b => b.label === '1,000–4,999')?.count).toBe(3)
  })

  it('assigns 5000–9999 XP to fourth bucket', () => {
    const result = bucketXP([5000, 7500, 9999])
    expect(result.find(b => b.label === '5,000–9,999')?.count).toBe(3)
  })

  it('assigns 10000+ XP to fifth bucket', () => {
    const result = bucketXP([10000, 99999])
    expect(result.find(b => b.label === '10,000+')?.count).toBe(2)
  })

  it('returns all 5 buckets with zero counts for empty input', () => {
    const result = bucketXP([])
    expect(result).toHaveLength(5)
    expect(result.every(b => b.count === 0)).toBe(true)
  })
})

describe('groupByLesson', () => {
  it('counts completions per lesson, sorted descending', () => {
    const rows = [
      { lesson_id: '1.1' }, { lesson_id: '1.1' }, { lesson_id: '1.2' },
    ]
    const result = groupByLesson(rows)
    expect(result[0]).toEqual({ lessonId: '1.1', count: 2 })
    expect(result[1]).toEqual({ lessonId: '1.2', count: 1 })
  })

  it('respects topN limit', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ lesson_id: `${i}.1` }))
    expect(groupByLesson(rows, 5)).toHaveLength(5)
  })

  it('returns empty array for empty input', () => {
    expect(groupByLesson([])).toHaveLength(0)
  })
})

describe('groupByStatus', () => {
  it('counts each status', () => {
    const rows = [
      { status: 'new' }, { status: 'new' }, { status: 'resolved' },
    ]
    const result = groupByStatus(rows)
    expect(result.find(r => r.status === 'new')?.count).toBe(2)
    expect(result.find(r => r.status === 'resolved')?.count).toBe(1)
  })

  it('returns empty array for empty input', () => {
    expect(groupByStatus([])).toHaveLength(0)
  })
})
