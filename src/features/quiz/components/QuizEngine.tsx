import { useState } from 'react'
import type { QuizQuestion as TQuizQuestion } from '@/lib/types'
import { QuizQuestion } from './QuizQuestion'
import { scoreQuiz } from '../utils/scoreQuiz'

const PASSING_SCORE = 60

interface QuizEngineProps {
  questions: TQuizQuestion[]
  onComplete: (score: number, answers: string[]) => void
}

export function QuizEngine({ questions, onComplete }: QuizEngineProps) {
  const [answers, setAnswers] = useState<string[]>(() => new Array(questions.length).fill(''))
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<ReturnType<typeof scoreQuiz> | null>(null)

  const allAnswered = answers.every(a => a.trim() !== '')

  const handleSubmit = () => {
    const r = scoreQuiz(questions, answers)
    setResult(r)
    setSubmitted(true)
  }

  const handleRetry = () => {
    setAnswers(new Array(questions.length).fill(''))
    setSubmitted(false)
    setResult(null)
  }

  const setAnswer = (i: number, value: string) => {
    setAnswers(prev => {
      const next = [...prev]
      next[i] = value
      return next
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-text-base">Quiz</h2>
        <p className="text-text-muted text-sm">{questions.length} questions · 60% to pass · 100% = +50 bonus XP</p>
      </div>

      <div className="flex flex-col gap-6">
        {questions.map((q, i) => (
          <QuizQuestion
            key={i}
            question={q}
            index={i}
            answer={answers[i]}
            onChange={value => setAnswer(i, value)}
            showResult={submitted}
          />
        ))}
      </div>

      {!submitted ? (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allAnswered}
          className="px-6 py-3 rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors disabled:opacity-50 self-start"
        >
          Submit Quiz
        </button>
      ) : (
        <div className="flex flex-col gap-4 border-t border-border pt-6">
          <div className={`text-center p-4 rounded-theme ${
            result!.score >= PASSING_SCORE ? 'bg-bg-secondary border border-success' : 'bg-bg-secondary border border-error'
          }`}>
            <p className="text-3xl font-black text-text-base">{result!.score}%</p>
            <p className="text-text-muted text-sm mt-1">
              {result!.correctCount} / {result!.total} correct
            </p>
            {result!.isPerfect && (
              <p className="text-success text-sm font-semibold mt-1">+50 bonus XP for a perfect score!</p>
            )}
            {result!.score < PASSING_SCORE && (
              <p className="text-error text-sm mt-1">You need 60% to continue. Try again!</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRetry}
              className="px-5 py-2.5 rounded-theme border border-border text-text-muted hover:border-primary hover:text-primary transition-colors text-sm"
            >
              Try Again
            </button>
            {result!.score >= PASSING_SCORE && (
              <button
                type="button"
                onClick={() => onComplete(result!.score, answers)}
                className="px-5 py-2.5 rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors text-sm"
              >
                Continue →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
