import { Link } from 'react-router-dom'
import type { Module } from '@/lib/types'

interface ModuleCardProps {
  module: Module
  isUnlocked: boolean
  completedLessonCount: number
  isComplete: boolean
  nextLessonId: string
}

export function ModuleCard({
  module,
  isUnlocked,
  completedLessonCount,
  isComplete,
  nextLessonId,
}: ModuleCardProps) {
  const totalLessons = module.lessons.length
  const progress = totalLessons > 0
    ? Math.round((completedLessonCount / totalLessons) * 100)
    : 0

  if (!isUnlocked) {
    return (
      <div className="bg-card border border-border rounded-theme p-5 opacity-50 cursor-not-allowed select-none">
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl">{module.icon}</span>
          <span className="text-text-muted text-sm" aria-label="Locked">🔒</span>
        </div>
        <h3 className="font-semibold text-text-base text-sm leading-snug">{module.title}</h3>
        <p className="text-text-muted text-xs mt-1 line-clamp-2">{module.description}</p>
        <p className="text-text-muted text-xs mt-3">Complete previous module to unlock</p>
      </div>
    )
  }

  return (
    <Link
      to={`/module/${module.id}/lesson/${nextLessonId}`}
      className={`block bg-card rounded-theme p-5 border-2 transition-all hover:border-primary hover:shadow-sm ${
        isComplete ? 'border-success' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl">{module.icon}</span>
        {isComplete && (
          <span className="text-success text-sm font-semibold" aria-label="Complete">✓</span>
        )}
      </div>
      <h3 className="font-semibold text-text-base text-sm leading-snug">{module.title}</h3>
      <p className="text-text-muted text-xs mt-1 line-clamp-2">{module.description}</p>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-text-muted mb-1">
          <span>{completedLessonCount}/{totalLessons} lessons</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </Link>
  )
}
