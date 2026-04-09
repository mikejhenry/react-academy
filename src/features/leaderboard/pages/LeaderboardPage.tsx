import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useTheme } from '@/theme/ThemeContext'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { useLeaderboard, type BoardType, type ActivePeriod } from '../hooks/useLeaderboard'
import { LeaderboardTable } from '../components/LeaderboardTable'

interface BoardConfig {
  type: BoardType
  label: string
  valueLabel: string
  valueFormatter?: (v: number) => string
}

const BOARDS: BoardConfig[] = [
  { type: 'xp', label: 'Top Learners', valueLabel: 'XP' },
  { type: 'streak', label: 'Longest Streak', valueLabel: 'days' },
  { type: 'quiz', label: 'Quiz Masters', valueLabel: '', valueFormatter: v => `${v}%` },
  { type: 'active', label: 'Most Active', valueLabel: 'lessons' },
]

export function LeaderboardPage() {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [activeBoard, setActiveBoard] = useState<BoardType>('xp')
  const [activePeriod, setActivePeriod] = useState<ActivePeriod>('all')
  const { entries, currentUserRank, loading } = useLeaderboard(activeBoard, activePeriod)
  const currentBoardConfig = BOARDS.find(b => b.type === activeBoard)!

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-lg font-bold text-text-base">React Academy</Link>
            <nav className="hidden sm:flex gap-3 text-sm">
              <Link to="/" className="text-text-muted hover:text-primary transition-colors">Modules</Link>
              <Link to="/leaderboard" className="text-primary font-medium">Leaderboard</Link>
              <Link to="/profile" className="text-text-muted hover:text-primary transition-colors">Profile</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={theme}
              onChange={e => setTheme(e.target.value as typeof theme)}
              className="text-sm border border-border rounded-theme px-2 py-1 bg-bg text-text-base"
              aria-label="Select theme"
            >
              <option value="fun">🎮 Fun</option>
              <option value="pro">💼 Pro</option>
              <option value="dev">💻 Dev</option>
            </select>
            <button
              onClick={signOut}
              className="text-sm text-text-muted hover:text-error transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-text-base mb-6">Leaderboard</h2>

        <div className="flex gap-2 mb-4 flex-wrap">
          {BOARDS.map(board => (
            <button
              key={board.type}
              onClick={() => setActiveBoard(board.type)}
              className={`px-4 py-2 rounded-theme text-sm font-medium transition-colors ${
                activeBoard === board.type
                  ? 'bg-primary text-white'
                  : 'bg-bg-secondary border border-border text-text-muted hover:border-primary hover:text-primary'
              }`}
            >
              {board.label}
            </button>
          ))}
        </div>

        {activeBoard === 'active' && (
          <div className="flex gap-2 mb-4">
            {(['all', 'week'] as ActivePeriod[]).map(period => (
              <button
                key={period}
                onClick={() => setActivePeriod(period)}
                className={`px-3 py-1 rounded-theme text-xs font-medium transition-colors ${
                  activePeriod === period
                    ? 'bg-primary/20 text-primary border border-primary'
                    : 'border border-border text-text-muted hover:border-primary'
                }`}
              >
                {period === 'all' ? 'All time' : 'This week'}
              </button>
            ))}
          </div>
        )}

        {currentUserRank !== null && (
          <p className="text-text-muted text-sm mb-4">
            Your rank:{' '}
            <span className="text-text-base font-semibold">#{currentUserRank}</span>
          </p>
        )}

        {loading ? (
          <LoadingSpinner />
        ) : entries.length === 0 ? (
          <p className="text-text-muted text-sm">
            {activeBoard === 'quiz'
              ? 'No players have completed 10 or more quizzes yet.'
              : 'No entries yet.'}
          </p>
        ) : (
          <LeaderboardTable
            entries={entries}
            currentUserId={user?.id ?? null}
            valueLabel={currentBoardConfig.valueLabel}
            valueFormatter={currentBoardConfig.valueFormatter}
          />
        )}
      </main>
    </div>
  )
}
