import type { Lesson } from '@/lib/types'

export type LessonStatus = 'completed' | 'current' | 'locked'

export interface LessonWithStatus {
  lesson: Lesson
  status: LessonStatus
}

export function getLessonStatuses(
  lessons: Lesson[],
  completedLessons: string[] | undefined,
): LessonWithStatus[] {
  const completed = completedLessons ?? []
  let foundCurrent = false
  return lessons.map(lesson => {
    if (!foundCurrent && completed.includes(lesson.id)) {
      return { lesson, status: 'completed' }
    }
    if (!foundCurrent) {
      foundCurrent = true
      return { lesson, status: 'current' }
    }
    return { lesson, status: 'locked' }
  })
}
