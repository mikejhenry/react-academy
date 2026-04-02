import { useEffect, useState } from 'react'
import { useTheme } from '@/theme/ThemeContext'
import { useAuth } from '../hooks/useAuth'

interface WelcomeScreenProps {
  onComplete: () => void
}

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [lines, setLines] = useState<string[]>([])
  const name = user?.display_name ?? 'there'

  useEffect(() => {
    if (theme !== 'dev') {
      const timer = setTimeout(onComplete, 2500)
      return () => clearTimeout(timer)
    }

    const terminalLines = [
      `$ welcome ${name}`,
      '> initializing learning environment...',
      '✓ profile loaded',
      '✓ curriculum ready — 19 modules',
      '✓ leaderboard connected',
      "> ready. let's build something.",
    ]
    let i = 0
    let completionTimer: ReturnType<typeof setTimeout> | null = null
    const interval = setInterval(() => {
      if (i < terminalLines.length) {
        setLines(prev => [...prev, terminalLines[i]])
        i++
      } else {
        clearInterval(interval)
        completionTimer = setTimeout(onComplete, 800)
      }
    }, 350)
    return () => {
      clearInterval(interval)
      if (completionTimer !== null) clearTimeout(completionTimer)
    }
  }, [theme, name, onComplete])

  if (theme === 'dev') {
    return (
      <div className="flex flex-col justify-center min-h-[300px] font-mono text-sm text-primary p-4">
        {lines.map((line, i) => (
          <div key={i} className="leading-relaxed">{line}</div>
        ))}
      </div>
    )
  }

  if (theme === 'fun') {
    return (
      <div className="flex flex-col items-center gap-4 text-center py-8">
        <div className="text-6xl animate-bounce">🎉</div>
        <h2 className="text-3xl font-black text-text-base">Welcome, {name}!</h2>
        <p className="text-text-muted text-lg">Your adventure begins now. Let's go! 🚀</p>
        <div className="text-4xl animate-spin">⭐</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center py-8">
      <div className="w-16 h-16 rounded-full bg-bg-secondary flex items-center justify-center text-3xl">👋</div>
      <h2 className="text-2xl font-bold text-text-base">Welcome, {name}</h2>
      <p className="text-text-muted">Your curriculum is ready. Module 1 is a great place to start.</p>
    </div>
  )
}
