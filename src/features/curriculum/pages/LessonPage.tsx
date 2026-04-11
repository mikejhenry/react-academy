import { useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { MODULES } from '@/data/curriculum'
import { useProgress } from '../hooks/useProgress'
import { useXP } from '@/features/gamification/hooks/useXP'
import { ContentRenderer } from '../components/ContentRenderer'
import { QuizEngine } from '@/features/quiz/components/QuizEngine'
import { ProjectValidator } from '@/features/projects/components/ProjectValidator'
import { CelebrationOverlay } from '@/features/gamification/components/CelebrationOverlay'
import { CommentSection } from '@/features/comments/components/CommentSection'
import { useAuth } from '@/features/auth/hooks/useAuth'

type Step = 'content' | 'quiz' | 'project' | 'complete'

export function LessonPage() {
  const { moduleId, lessonId } = useParams<{ moduleId: string; lessonId: string }>()
  const navigate = useNavigate()
  const { completedLessons, completeLesson, saveQuizAttempt, completeProject } = useProgress()
  const { isGuest } = useAuth()
  const { awardXP } = useXP()

  const module = MODULES.find(m => m.id === moduleId)
  const lesson = module?.lessons.find(l => l.id === lessonId)

  const alreadyCompleted = lesson !== undefined && completedLessons.includes(lesson.id)

  const [step, setStep] = useState<Step>('content')
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationXP, setCelebrationXP] = useState(0)
  const [celebrationIsPerfect, setCelebrationIsPerfect] = useState(false)
  const [celebrationBonusXP, setCelebrationBonusXP] = useState(0)

  const finishLesson = useCallback(
    async (quizScore: number, bonusXP = 0) => {
      if (!lesson || !module) return
      const { wasNew } = await completeLesson(lesson.id, module.id, lesson.xpReward)
      if (wasNew) {
        const totalXP = lesson.xpReward + (quizScore === 100 ? 50 : 0) + bonusXP
        await awardXP(totalXP, 'lesson-complete')
        setCelebrationXP(totalXP)
        setCelebrationIsPerfect(quizScore === 100)
        setCelebrationBonusXP(bonusXP)
        setShowCelebration(true)
      }
      setStep('complete')
    },
    [lesson, module, completeLesson, awardXP]
  )

  const handleQuizComplete = useCallback(
    async (score: number, answers: string[]) => {
      if (!lesson) return
      await saveQuizAttempt(lesson.id, score, answers)
      if (alreadyCompleted) {
        // Review mode — quiz done, go home
        navigate('/')
        return
      }
      if (lesson.project) {
        setStep('project')
      } else {
        await finishLesson(score)
      }
    },
    [lesson, alreadyCompleted, saveQuizAttempt, navigate, finishLesson]
  )

  const handleProjectComplete = useCallback(
    async (bonusXP: number) => {
      if (!lesson || !module) return
      await completeProject(lesson.project!.id)
      // Pass the last known quiz score — we treat project completion as quiz already passed
      await finishLesson(0, bonusXP)
    },
    [lesson, module, completeProject, finishLesson]
  )

  const handleDismiss = useCallback(() => {
    setShowCelebration(false)
    navigate('/')
  }, [navigate])

  if (!module || !lesson) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-base text-lg mb-4">Lesson not found.</p>
          <Link to="/" className="text-primary hover:underline">
            Back to modules
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2 text-sm text-text-muted">
          <Link to="/" className="hover:text-primary transition-colors">
            Modules
          </Link>
          <span>/</span>
          <span className="text-text-base truncate max-w-[120px] sm:max-w-none">{module.title}</span>
          <span>/</span>
          <span className="text-text-base truncate max-w-[120px] sm:max-w-none">{lesson.title}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Lesson meta */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <h1 className="text-2xl font-bold text-text-base">{lesson.title}</h1>
            {alreadyCompleted && (
              <span className="inline-flex items-center gap-1 text-sm text-success border border-success rounded-theme px-2 py-0.5 shrink-0">
                ✓ Completed
              </span>
            )}
          </div>
          <p className="text-text-muted text-sm mt-1">
            {lesson.duration} min &middot; {lesson.xpReward} XP
          </p>
        </div>

        {/* Step: content */}
        {step === 'content' && (
          <div className="flex flex-col gap-8">
            <ContentRenderer blocks={lesson.content} />
            <div className="border-t border-border pt-6">
              {alreadyCompleted ? (
                <button
                  type="button"
                  onClick={() => setStep('quiz')}
                  className="px-6 py-3 rounded-theme border border-border text-text-muted hover:border-primary hover:text-primary transition-colors font-semibold"
                >
                  Review Quiz
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep('quiz')}
                  className="px-6 py-3 rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors"
                >
                  Take the Quiz →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step: quiz */}
        {step === 'quiz' && (
          <QuizEngine
            questions={lesson.quiz}
            onComplete={handleQuizComplete}
          />
        )}

        {/* Step: project */}
        {step === 'project' && lesson.project && (
          <ProjectValidator
            project={lesson.project}
            onComplete={handleProjectComplete}
          />
        )}

        {/* Step: complete (no celebration shown — handled by overlay) */}
        {step === 'complete' && !showCelebration && (
          <div className="py-12 flex flex-col gap-6">
            <p className="text-text-base text-lg text-center">Lesson complete!</p>
            {isGuest && (
              <div className="bg-primary/10 border border-primary/20 rounded-theme p-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 text-center sm:text-left">
                  <p className="font-semibold text-text-base text-sm">💾 Don't lose your progress</p>
                  <p className="text-text-muted text-xs mt-0.5">Create a free account to save permanently across all devices.</p>
                </div>
                <Link
                  to="/auth"
                  className="shrink-0 px-4 py-2 rounded-theme bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors"
                >
                  Sign Up Free
                </Link>
              </div>
            )}
            <div className="text-center">
              <Link
                to="/"
                className="inline-block px-6 py-3 rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors"
              >
                {isGuest ? 'Continue Learning →' : 'Back to modules'}
              </Link>
            </div>
          </div>
        )}

        {/* Discussion */}
        {isGuest ? (
          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-text-muted text-sm">
              <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to join the discussion.
            </p>
          </div>
        ) : (
          <CommentSection lessonId={lesson.id} />
        )}
      </main>

      {/* Celebration overlay */}
      {showCelebration && (
        <CelebrationOverlay
          xpEarned={celebrationXP}
          bonusXP={celebrationBonusXP}
          isPerfect={celebrationIsPerfect}
          onContinue={handleDismiss}
        />
      )}
    </div>
  )
}
