import type { LeaderboardEntry } from '../hooks/useLeaderboard'

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
  currentUserId: string | null
  valueLabel: string
  valueFormatter?: (v: number) => string
}

export function LeaderboardTable({
  entries,
  currentUserId,
  valueLabel,
  valueFormatter,
}: LeaderboardTableProps) {
  const format = valueFormatter ?? String

  return (
    <div className="flex flex-col gap-0.5">
      {entries.map(entry => (
        <div
          key={entry.userId}
          className={`flex items-center gap-3 px-4 py-3 rounded-theme ${
            entry.userId === currentUserId
              ? 'bg-primary/10 border border-primary'
              : 'bg-bg-secondary'
          }`}
        >
          <span className="text-text-muted text-sm w-8 shrink-0 font-mono">#{entry.rank}</span>
          <div className="w-8 h-8 rounded-full bg-border overflow-hidden shrink-0">
            {entry.avatarUrl ? (
              <img
                src={entry.avatarUrl}
                alt={entry.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-text-muted">
                {entry.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-base text-sm font-medium truncate">{entry.displayName}</p>
            <p className="text-text-muted text-xs">{entry.levelTitle}</p>
          </div>
          <span className="text-text-base font-semibold text-sm shrink-0">
            {format(entry.value)}{' '}
            <span className="text-text-muted font-normal text-xs">{valueLabel}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
