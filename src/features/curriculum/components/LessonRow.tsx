import { Link } from 'react-router-dom'
import type { Lesson } from '@/lib/types'
import type { LessonStatus } from '../utils/getLessonStatuses'

interface LessonRowProps {
  lesson: Lesson
  moduleId: string
  status: LessonStatus
}

export function LessonRow({ lesson, moduleId, status }: LessonRowProps) {
  const icon =
    status === 'completed' ? (
      <span className="text-success text-xs flex-shrink-0">✓</span>
    ) : status === 'current' ? (
      <span className="text-primary text-xs flex-shrink-0">▶</span>
    ) : (
      <span className="text-xs flex-shrink-0">🔒</span>
    )

  const titleClass =
    status === 'current'
      ? 'text-xs flex-1 font-semibold text-text-base'
      : status === 'completed'
        ? 'text-xs flex-1 text-text-base'
        : 'text-xs flex-1 text-text-muted'

  const meta = (
    <span className="text-text-muted text-[9px] flex-shrink-0">
      {lesson.duration}m · {lesson.xpReward}xp
    </span>
  )

  if (status === 'locked') {
    return (
      <div
        className="flex items-center gap-2 border border-white/[0.06] rounded-md px-2.5 py-2 opacity-40 cursor-not-allowed"
        aria-disabled="true"
      >
        {icon}
        <span className={titleClass}>{lesson.title}</span>
        {meta}
      </div>
    )
  }

  const href = `/module/${moduleId}/lesson/${lesson.id}`
  const rowClass =
    status === 'completed'
      ? 'flex items-center gap-2 bg-success/[0.08] border border-success/25 hover:border-success/50 rounded-md px-2.5 py-2'
      : 'flex items-center gap-2 bg-primary/15 border border-primary/55 rounded-md px-2.5 py-2'

  return (
    <Link to={href} className={rowClass}>
      {icon}
      <span className={titleClass}>{lesson.title}</span>
      {meta}
    </Link>
  )
}
