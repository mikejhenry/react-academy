import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useTheme } from '@/theme/ThemeContext'
import { useProgress } from '@/features/curriculum/hooks/useProgress'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { useProfileStats } from '../hooks/useProfileStats'
import { XPProgressBar } from '../components/XPProgressBar'
import { BadgeGrid } from '../components/BadgeGrid'
import { StatsPanel } from '../components/StatsPanel'
import { StreakDisplay } from '../components/StreakDisplay'
import { ProfileInbox } from '../components/ProfileInbox'
import { ContactModeratorForm } from '../components/ContactModeratorForm'
import { ProfileSettings } from '../components/ProfileSettings'

export function ProfilePage() {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const {
    completedLessons,
    completedModules,
    quizScores,
    projectsPassed,
    loading: progressLoading,
  } = useProgress()
  const {
    xp,
    streak,
    level,
    levelTitle,
    xpForNextLevel,
    earnedBadgeIds,
    loading: statsLoading,
  } = useProfileStats()

  const quizScoreValues = Object.values(quizScores)
  const quizAccuracy =
    quizScoreValues.length > 0
      ? Math.round(quizScoreValues.reduce((a, b) => a + b, 0) / quizScoreValues.length)
      : 0

  if (!user || progressLoading || statsLoading) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-lg font-bold text-text-base">React Academy</Link>
            <nav className="hidden sm:flex gap-3 text-sm">
              <Link to="/" className="text-text-muted hover:text-primary transition-colors">Modules</Link>
              <Link to="/leaderboard" className="text-text-muted hover:text-primary transition-colors">Leaderboard</Link>
              <Link to="/profile" className="text-primary font-medium">Profile</Link>
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

      <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Hero */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-border overflow-hidden shrink-0">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-text-muted">
                {user.display_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-base">{user.display_name}</h1>
            <p className="text-text-muted text-sm">{levelTitle} · Level {level}</p>
          </div>
        </div>

        {/* XP + Level */}
        <XPProgressBar
          xp={xp}
          level={level}
          levelTitle={levelTitle}
          xpForNextLevel={xpForNextLevel}
        />

        {/* Streak + Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StreakDisplay currentStreak={streak} />
          <div className="sm:col-span-2">
            <StatsPanel
              completedLessonsCount={completedLessons.length}
              completedModulesCount={completedModules.length}
              projectsPassedCount={projectsPassed.length}
              quizAccuracy={quizAccuracy}
            />
          </div>
        </div>

        {/* Badges */}
        <BadgeGrid earnedBadgeIds={earnedBadgeIds} />

        <hr className="border-border" />

        {/* Inbox */}
        <section>
          <h2 className="text-lg font-semibold text-text-base mb-3">Messages from Moderators</h2>
          <ProfileInbox />
        </section>

        {/* Contact a Moderator */}
        <section>
          <h2 className="text-lg font-semibold text-text-base mb-3">Contact a Moderator</h2>
          <ContactModeratorForm />
        </section>

        <hr className="border-border" />

        {/* Settings */}
        <section>
          <h2 className="text-lg font-semibold text-text-base mb-4">Settings</h2>
          <ProfileSettings />
        </section>
      </main>
    </div>
  )
}
