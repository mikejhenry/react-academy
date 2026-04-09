interface StreakDisplayProps {
  currentStreak: number
}

export function StreakDisplay({ currentStreak }: StreakDisplayProps) {
  return (
    <div className="bg-bg-secondary border border-border rounded-theme p-4 flex items-center gap-4">
      <span className="text-4xl">🔥</span>
      <p className="text-text-base font-bold">
        <span className="text-3xl leading-none">{currentStreak}</span>{' '}
        <span className="text-text-muted text-sm">day streak</span>
      </p>
    </div>
  )
}
