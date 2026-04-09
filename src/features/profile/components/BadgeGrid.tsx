import { BADGES } from '@/data/achievements'

interface BadgeGridProps {
  earnedBadgeIds: string[]
}

export function BadgeGrid({ earnedBadgeIds }: BadgeGridProps) {
  return (
    <div>
      <h3 className="text-text-base font-semibold mb-3">
        Badges ({earnedBadgeIds.length}/{BADGES.length})
      </h3>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {BADGES.map(badge => {
          const earned = earnedBadgeIds.includes(badge.id)
          return (
            <div
              key={badge.id}
              title={earned ? `${badge.name}: ${badge.description}` : `Locked: ${badge.description}`}
              className={`flex flex-col items-center gap-1 p-2 rounded-theme border cursor-default ${
                earned
                  ? 'border-primary bg-bg-secondary'
                  : 'border-border opacity-30'
              }`}
            >
              <span className="text-2xl">{badge.icon}</span>
              <span className="text-xs text-text-muted text-center leading-tight">
                {badge.name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
