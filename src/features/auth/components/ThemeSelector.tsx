import { useTheme } from '@/theme/ThemeContext'
import { themes } from '@/theme/tokens'
import { useAuth } from '../hooks/useAuth'
import type { Theme } from '@/lib/types'

interface ThemeSelectorProps {
  onComplete: () => void
}

const THEME_PREVIEWS: { key: Theme; emoji: string; tagline: string }[] = [
  { key: 'fun', emoji: '🎮', tagline: 'Bright, playful, game-like' },
  { key: 'pro', emoji: '💼', tagline: 'Clean, minimal, focused' },
  { key: 'dev', emoji: '💻', tagline: 'Dark, terminal-style' },
]

export function ThemeSelector({ onComplete }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme()
  const { updateProfile } = useAuth()

  const handleSelect = (t: Theme) => setTheme(t)

  const handleConfirm = async () => {
    await updateProfile({ theme })
    onComplete()
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-base">Choose your experience</h2>
        <p className="text-text-muted mt-1">You can change this anytime in your profile settings.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 w-full sm:grid-cols-3">
        {THEME_PREVIEWS.map(({ key, emoji, tagline }) => (
          <button
            key={key}
            onClick={() => handleSelect(key)}
            className={`p-4 rounded-theme border-2 text-left transition-all ${
              theme === key
                ? 'border-primary bg-bg-secondary'
                : 'border-border bg-card hover:border-primary'
            }`}
          >
            <div className="text-2xl mb-2">{emoji}</div>
            <div className="font-semibold text-text-base">{themes[key].name}</div>
            <div className="text-sm text-text-muted mt-1">{tagline}</div>
          </button>
        ))}
      </div>

      <button
        onClick={handleConfirm}
        className="px-8 py-3 rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors"
      >
        Start Learning →
      </button>
    </div>
  )
}
