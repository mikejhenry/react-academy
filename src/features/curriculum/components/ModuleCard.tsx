import type { Module } from '@/lib/types'
import { getLessonStatuses } from '../utils/getLessonStatuses'
import { LessonRow } from './LessonRow'

interface ModuleCardProps {
  module: Module
  isUnlocked: boolean
  completedLessonCount: number
  isComplete: boolean
  nextLessonId: string
  isExpanded: boolean
  onToggle: (moduleId: string) => void
  completedLessons: string[]
}

export function ModuleCard({
  module,
  isUnlocked,
  completedLessonCount,
  isComplete,
  nextLessonId: _nextLessonId,
  isExpanded,
  onToggle,
  completedLessons,
}: ModuleCardProps) {
  const totalLessons = module.lessons.length
  const progress =
    totalLessons > 0 ? Math.round((completedLessonCount / totalLessons) * 100) : 0

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

  const lessonStatuses = getLessonStatuses(module.lessons, completedLessons)

  return (
    <div
      className={`bg-card rounded-theme p-5 border-2 transition-all ${
        isExpanded ? 'border-primary' : isComplete ? 'border-success' : 'border-border'
      }`}
    >
      <button
        className="w-full flex items-center gap-3 mb-3 cursor-pointer text-left"
        onClick={() => onToggle(module.id)}
        aria-expanded={isExpanded}
      >
        <span className="text-3xl">{module.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-base text-sm leading-snug">{module.title}</h3>
          <p className="text-text-muted text-xs">{completedLessonCount}/{totalLessons} completed</p>
        </div>
        <span className="text-text-muted text-xs" aria-hidden="true">
          {isExpanded ? '▴' : '▾'}
        </span>
      </button>

      {isExpanded ? (
        <div className="flex flex-col gap-1.5 border-t border-white/[0.07] pt-2.5">
          {lessonStatuses.map(({ lesson, status }) => (
            <LessonRow key={lesson.id} lesson={lesson} moduleId={module.id} status={status} />
          ))}
        </div>
      ) : (
        <>
          <p className="text-text-muted text-xs mb-4 line-clamp-2">{module.description}</p>
          <div>
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
          <p className="text-text-muted text-[10px] mt-2.5">Click to see lessons ▾</p>
        </>
      )}
    </div>
  )
}
