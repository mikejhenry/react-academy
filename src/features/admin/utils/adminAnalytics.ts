export interface XPBucket {
  label: string
  count: number
}

export function bucketXP(xpValues: number[]): XPBucket[] {
  const buckets: XPBucket[] = [
    { label: '0–499', count: 0 },
    { label: '500–999', count: 0 },
    { label: '1,000–4,999', count: 0 },
    { label: '5,000–9,999', count: 0 },
    { label: '10,000+', count: 0 },
  ]
  for (const xp of xpValues) {
    if (xp < 500) buckets[0].count++
    else if (xp < 1000) buckets[1].count++
    else if (xp < 5000) buckets[2].count++
    else if (xp < 10000) buckets[3].count++
    else buckets[4].count++
  }
  return buckets
}

export interface LessonCount {
  lessonId: string
  count: number
}

export function groupByLesson(rows: { lesson_id: string }[], topN = 10): LessonCount[] {
  const counts: Record<string, number> = {}
  for (const row of rows) {
    counts[row.lesson_id] = (counts[row.lesson_id] ?? 0) + 1
  }
  return Object.entries(counts)
    .map(([lessonId, count]) => ({ lessonId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
}

export interface StatusCount {
  status: string
  count: number
}

export function groupByStatus(rows: { status: string }[]): StatusCount[] {
  const counts: Record<string, number> = {}
  for (const row of rows) {
    counts[row.status] = (counts[row.status] ?? 0) + 1
  }
  return Object.entries(counts).map(([status, count]) => ({ status, count }))
}
