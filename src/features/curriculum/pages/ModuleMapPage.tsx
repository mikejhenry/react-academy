import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useTheme } from '@/theme/ThemeContext'
import { ModuleMap } from '../components/ModuleMap'

export function ModuleMapPage() {
  const { user, isGuest, signOut } = useAuth()
  const { theme, setTheme } = useTheme()

  return (
    <div className="min-h-screen bg-bg">
      {isGuest && (
        <div className="bg-primary/10 border-b border-primary/20 text-center py-2 px-4 text-sm text-text-muted">
          Browsing as guest —{' '}
          <Link to="/auth" className="text-primary hover:underline font-medium">Sign up</Link>
          {' '}to save permanently.
        </div>
      )}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-text-base">React Academy</h1>
          <div className="flex items-center gap-3">
            <nav className="hidden sm:flex gap-3 text-sm items-center">
              {isGuest ? (
                <>
                  <div className="relative group">
                    <span className="text-text-muted/50 cursor-not-allowed line-through">Leaderboard</span>
                    <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-bg-secondary text-text-muted text-xs px-2 py-1 rounded border border-border whitespace-nowrap z-20">
                      Sign in to access
                    </div>
                  </div>
                  <div className="relative group">
                    <span className="text-text-muted/50 cursor-not-allowed line-through">Profile</span>
                    <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-bg-secondary text-text-muted text-xs px-2 py-1 rounded border border-border whitespace-nowrap z-20">
                      Sign in to access
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/leaderboard" className="text-text-muted hover:text-primary transition-colors">Leaderboard</Link>
                  <Link to="/profile" className="text-text-muted hover:text-primary transition-colors">{user?.display_name}</Link>
                  {(user?.role === 'moderator' || user?.role === 'admin') && (
                    <Link to="/moderator" className="text-text-muted hover:text-primary transition-colors">Moderation</Link>
                  )}
                  {user?.role === 'admin' && (
                    <Link to="/admin" className="text-text-muted hover:text-primary transition-colors">Admin</Link>
                  )}
                </>
              )}
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
            {isGuest ? (
              <Link
                to="/auth"
                className="text-sm px-3 py-1.5 rounded-theme bg-primary hover:bg-primary-hover text-white font-medium transition-colors"
              >
                Sign Up
              </Link>
            ) : (
              <button
                onClick={signOut}
                className="text-sm text-text-muted hover:text-error transition-colors"
              >
                Sign out
              </button>
            )}
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
