import type { Theme } from '@/lib/types'

export interface ThemeTokens {
  name: string
  colors: {
    bg: string
    bgSecondary: string
    text: string
    textMuted: string
    primary: string
    primaryHover: string
    success: string
    warning: string
    error: string
    border: string
    card: string
  }
  fonts: {
    body: string
    mono: string
  }
  radius: string
  celebration: {
    type: 'confetti' | 'toast' | 'terminal'
    successMessage: string
    levelUpMessage: string
    badgeMessage: string
  }
}

export const themes: Record<Theme, ThemeTokens> = {
  fun: {
    name: 'Fun & Gamified',
    colors: {
      bg: '#fff7ed',
      bgSecondary: '#fef3c7',
      text: '#1c1917',
      textMuted: '#78716c',
      primary: '#f97316',
      primaryHover: '#ea580c',
      success: '#22c55e',
      warning: '#eab308',
      error: '#ef4444',
      border: '#fed7aa',
      card: '#ffffff',
    },
    fonts: { body: 'Nunito, Segoe UI, sans-serif', mono: 'Fira Code, monospace' },
    radius: '1rem',
    celebration: {
      type: 'confetti',
      successMessage: "Nailed it! 🎉",
      levelUpMessage: "Level up! You're crushing it! 🚀",
      badgeMessage: "New badge unlocked! 🏆",
    },
  },
  pro: {
    name: 'Clean & Professional',
    colors: {
      bg: '#f8fafc',
      bgSecondary: '#f1f5f9',
      text: '#0f172a',
      textMuted: '#64748b',
      primary: '#0f172a',
      primaryHover: '#1e293b',
      success: '#16a34a',
      warning: '#ca8a04',
      error: '#dc2626',
      border: '#e2e8f0',
      card: '#ffffff',
    },
    fonts: { body: 'Inter, Segoe UI, sans-serif', mono: 'Fira Code, monospace' },
    radius: '0.5rem',
    celebration: {
      type: 'toast',
      successMessage: 'Lesson complete',
      levelUpMessage: 'Level up',
      badgeMessage: 'Badge earned',
    },
  },
  dev: {
    name: 'Dark Developer',
    colors: {
      bg: '#0d1117',
      bgSecondary: '#161b22',
      text: '#e6edf3',
      textMuted: '#8b949e',
      primary: '#3fb950',
      primaryHover: '#2ea043',
      success: '#3fb950',
      warning: '#d29922',
      error: '#f85149',
      border: '#30363d',
      card: '#161b22',
    },
    fonts: { body: 'JetBrains Mono, Fira Code, monospace', mono: 'JetBrains Mono, Fira Code, monospace' },
    radius: '0.375rem',
    celebration: {
      type: 'terminal',
      successMessage: '✓ lesson.complete()',
      levelUpMessage: '✓ level_up() // new rank unlocked',
      badgeMessage: '✓ badge.earned()',
    },
  },
}
