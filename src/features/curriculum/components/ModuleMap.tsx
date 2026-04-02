import { MODULES } from '@/data/curriculum'
import { ModuleCard } from './ModuleCard'
import { useProgress } from '../hooks/useProgress'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'

export function ModuleMap() {
  const { completedLessons, completedModules, isModuleUnlockedForUser, loading } = useProgress()

  if (loading) return <LoadingSpinner />

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {MODULES.map(module => {
        const completedInModule = module.lessons.filter(l =>
          completedLessons.includes(l.id)
        ).length
        const isComplete = completedModules.includes(module.id)
        const isUnlocked = isModuleUnlockedForUser(module.id)
        const nextLesson =
          module.lessons.find(l => !completedLessons.includes(l.id)) ??
          module.lessons[0]

        return (
          <ModuleCard
            key={module.id}
            module={module}
            isUnlocked={isUnlocked}
            completedLessonCount={completedInModule}
            isComplete={isComplete}
            nextLessonId={nextLesson?.id ?? ''}
          />
        )
      })}
    </div>
  )
}
