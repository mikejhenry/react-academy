import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useTheme } from '@/theme/ThemeContext'
import { ModuleMap } from '../components/ModuleMap'

export function ModuleMapPage() {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-text-base">React Academy</h1>
          <div className="flex items-center gap-3">
            <nav className="hidden sm:flex gap-3 text-sm">
              <Link to="/leaderboard" className="text-text-muted hover:text-primary transition-colors">Leaderboard</Link>
              <Link to="/profile" className="text-text-muted hover:text-primary transition-colors">{user?.display_name}</Link>
            </nav>
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
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-text-base">Your Curriculum</h2>
          <p className="text-text-muted mt-1">Complete modules in order to unlock the full stack.</p>
        </div>
        <ModuleMap />
      </main>
      <footer className="border-t border-border mt-16 py-4">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between text-xs text-text-muted">
          <span>React Academy</span>
          <Link to="/report-bug" className="hover:text-primary transition-colors">Report a Bug</Link>
        </div>
      </footer>
    </div>
  )
}
