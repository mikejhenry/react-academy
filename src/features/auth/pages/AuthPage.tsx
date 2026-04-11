import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { SignUpForm } from '../components/SignUpForm'
import { LoginForm } from '../components/LoginForm'
import { OAuthButtons } from '../components/OAuthButtons'

type AuthMode = 'signup' | 'login'

export function AuthPage() {
  const { user, loading, isGuest, continueAsGuest } = useAuth()
  const [mode, setMode] = useState<AuthMode>('signup')

  if (loading) return null
  if (user) {
    return <Navigate to={user.onboarding_completed ? '/' : '/onboarding'} replace />
  }
  if (isGuest) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-theme p-8 flex flex-col gap-6 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-base">React Academy</h1>
          <p className="text-text-muted mt-1 text-sm">
            {mode === 'signup' ? 'Create your free account' : 'Welcome back'}
          </p>
        </div>

        <OAuthButtons />

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-text-muted text-xs uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {mode === 'signup'
          ? <SignUpForm onSuccess={() => {}} onSwitchToLogin={() => setMode('login')} />
          : <LoginForm onSuccess={() => {}} onSwitchToSignUp={() => setMode('signup')} />
        }

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-text-muted text-xs uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={continueAsGuest}
            className="w-full px-4 py-2 rounded-theme border border-border text-text-muted hover:border-primary hover:text-primary transition-colors text-sm font-medium"
          >
            Continue as Guest
          </button>
          <p className="text-xs text-text-muted text-center">
            Your progress will be saved in this browser. Sign up any time to keep it permanently.
          </p>
        </div>
      </div>
    </div>
  )
}
