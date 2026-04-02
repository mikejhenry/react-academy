import type { QuizQuestion } from '@/lib/types'

export interface QuizResult {
  score: number        // 0–100 percentage
  correctCount: number
  total: number
  isPerfect: boolean
}

export function scoreQuiz(questions: QuizQuestion[], answers: string[]): QuizResult {
  let correctCount = 0
  for (let i = 0; i < questions.length; i++) {
    if (isCorrect(questions[i], answers[i] ?? '')) correctCount++
  }
  const score = Math.round((correctCount / questions.length) * 100)
  return { score, correctCount, total: questions.length, isPerfect: score === 100 }
}

function isCorrect(q: QuizQuestion, answer: string): boolean {
  if (q.type === 'fill-blank') {
    const trimmed = answer.trim()
    if (q.pattern) {
      try {
        return new RegExp(q.pattern).test(trimmed)
      } catch {
        return false
      }
    }
    return trimmed.toLowerCase() === (q.options[q.correct] ?? '').toLowerCase()
  }
  // multiple-choice and true-false: answer is a string index
  return parseInt(answer, 10) === q.correct
}
