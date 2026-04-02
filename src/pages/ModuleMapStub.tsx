import { useAuth } from '@/features/auth/hooks/useAuth'
import { useTheme } from '@/theme/ThemeContext'

export function ModuleMapStub() {
  const { user, signOut } = useAuth()
  const { theme, setTheme, tokens } = useTheme()

  return (
    <div className="min-h-screen bg-bg p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-text-base">React Academy</h1>
          <div className="flex items-center gap-4">
            <span className="text-text-muted text-sm">
              {user?.display_name} · {tokens.name}
            </span>
            <select
              value={theme}
              onChange={e => setTheme(e.target.value as typeof theme)}
              className="text-sm border border-border rounded-theme px-2 py-1 bg-bg text-text-base"
            >
              <option value="fun">Fun</option>
              <option value="pro">Pro</option>
              <option value="dev">Dev</option>
            </select>
            <button
              onClick={signOut}
              className="text-sm text-text-muted hover:text-error transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-theme p-8 text-center">
          <p className="text-4xl mb-4">🚧</p>
          <h2 className="text-xl font-semibold text-text-base">Module Map coming in Phase 2</h2>
          <p className="text-text-muted mt-2">
            Auth and theme system are working. The full curriculum will be built next.
          </p>
        </div>
      </div>
    </div>
  )
}
