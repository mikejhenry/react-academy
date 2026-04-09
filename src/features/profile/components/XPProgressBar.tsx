interface XPProgressBarProps {
  xp: number
  level: number
  levelTitle: string
  xpForNextLevel: number
}

export function XPProgressBar({ xp, level, levelTitle, xpForNextLevel }: XPProgressBarProps) {
  // XP earned within the current level (each level requires 500 XP)
  const xpIntoLevel = xp - (level - 1) * 500
  const percent = Math.min(Math.round((xpIntoLevel / 500) * 100), 100)
  const xpRemaining = xpForNextLevel - xp

  return (
    <div className="bg-bg-secondary border border-border rounded-theme p-4">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-text-base font-semibold">
          Level {level} — {levelTitle}
        </span>
        <span className="text-text-muted text-sm">{xp.toLocaleString()} XP total</span>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-text-muted text-xs mt-1">
        {xpRemaining} XP to Level {level + 1}
      </p>
    </div>
  )
}
