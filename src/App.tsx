import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { AuthPage } from '@/features/auth/pages/AuthPage'
import { OnboardingPage } from '@/features/auth/pages/OnboardingPage'
import { ModuleMapPage } from '@/features/curriculum/pages/ModuleMapPage'
import { LessonPage } from '@/features/curriculum/pages/LessonPage'
import { LeaderboardPage } from '@/features/leaderboard/pages/LeaderboardPage'
import { ProfilePage } from '@/features/profile/pages/ProfilePage'
import { BugReportPage } from '@/features/bugreport/pages/BugReportPage'
import { ModeratorPage } from '@/features/moderator/pages/ModeratorPage'
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
            <ModuleMapPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/module/:moduleId/lesson/:lessonId"
        element={
          <ProtectedRoute>
            <LessonPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <LeaderboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report-bug"
        element={
          <ProtectedRoute>
            <BugReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/moderator"
        element={
          <ProtectedRoute requiredRole="moderator">
            <ModeratorPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
