import { useTheme } from '@/theme/ThemeContext'

export function LoadingSpinner() {
  const { theme } = useTheme()

  if (theme === 'dev') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg font-mono text-primary">
        <span className="animate-pulse">$ loading...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg">
      <div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin" />
    </div>
  )
}
