import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { AuthPage } from '@/features/auth/pages/AuthPage'
import { OnboardingPage } from '@/features/auth/pages/OnboardingPage'
import { ModuleMapStub } from '@/pages/ModuleMapStub'
import { NotFoundPage } from '@/pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ModuleMapStub />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
