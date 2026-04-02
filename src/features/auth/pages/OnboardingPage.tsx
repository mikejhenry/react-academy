import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ProfileSetup } from '../components/ProfileSetup'
import { ThemeSelector } from '../components/ThemeSelector'
import { WelcomeScreen } from '../components/WelcomeScreen'

type OnboardingStep = 'profile' | 'theme' | 'welcome'

export function OnboardingPage() {
  const { user, loading, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<OnboardingStep>('profile')

  useEffect(() => {
    // If user already has a display name (OAuth signup), skip profile step
    if (user?.display_name && step === 'profile') setStep('theme')
  }, [user, step])

  if (loading) return null
  if (!user) return <Navigate to="/auth" replace />

  const stepNumber = { profile: 1, theme: 2, welcome: 3 }[step]

  const handleWelcomeComplete = async () => {
    await updateProfile({ onboarding_completed: true })
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4 gap-8">
      {/* Step indicator */}
      <div className="flex gap-2">
        {[1, 2, 3].map(n => (
          <div
            key={n}
            className={`w-2 h-2 rounded-full transition-colors ${
              n <= stepNumber ? 'bg-primary' : 'bg-border'
            }`}
          />
        ))}
      </div>

      <div className="w-full max-w-lg bg-card border border-border rounded-theme p-8">
        {step === 'profile' && <ProfileSetup onComplete={() => setStep('theme')} />}
        {step === 'theme' && <ThemeSelector onComplete={() => setStep('welcome')} />}
        {step === 'welcome' && <WelcomeScreen onComplete={handleWelcomeComplete} />}
      </div>
    </div>
  )
}
