interface StatsPanelProps {
  completedLessonsCount: number
  completedModulesCount: number
  projectsPassedCount: number
  quizAccuracy: number
}

export function StatsPanel({
  completedLessonsCount,
  completedModulesCount,
  projectsPassedCount,
  quizAccuracy,
}: StatsPanelProps) {
  const stats = [
    { label: 'Lessons', value: completedLessonsCount },
    { label: 'Modules', value: completedModulesCount },
    { label: 'Projects', value: projectsPassedCount },
    { label: 'Quiz Avg', value: `${quizAccuracy}%` },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map(stat => (
        <div
          key={stat.label}
          className="bg-bg-secondary border border-border rounded-theme p-4 text-center"
        >
          <p className="text-2xl font-bold text-text-base">{stat.value}</p>
          <p className="text-text-muted text-sm">{stat.label}</p>
        </div>
      ))}
    </div>
  )
}
