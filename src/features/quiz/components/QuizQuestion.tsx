import type { QuizQuestion as TQuizQuestion } from '@/lib/types'

interface QuizQuestionProps {
  question: TQuizQuestion
  index: number
  answer: string
  onChange: (value: string) => void
  showResult?: boolean
}

export function QuizQuestion({ question, index, answer, onChange, showResult }: QuizQuestionProps) {
  const isFillBlank = question.type === 'fill-blank'
  const isCorrectAnswer = showResult
    ? isFillBlank
      ? answer.trim().toLowerCase() === (question.options[question.correct] ?? '').toLowerCase()
      : parseInt(answer, 10) === question.correct
    : false

  return (
    <div className="flex flex-col gap-3">
      <p className="font-semibold text-text-base">
        <span className="text-text-muted text-sm mr-2">{index + 1}.</span>
        {question.question}
      </p>

      {isFillBlank ? (
        <input
          type="text"
          value={answer}
          onChange={e => onChange(e.target.value)}
          disabled={showResult}
          placeholder="Type your answer..."
          className="px-3 py-2 rounded-theme border border-border bg-bg text-text-base text-sm focus:outline-none focus:border-primary disabled:opacity-70"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {question.options.map((opt, i) => {
            let optClass = 'px-4 py-3 rounded-theme border text-sm text-left transition-colors '
            if (!showResult) {
              optClass += answer === String(i)
                ? 'border-primary bg-bg-secondary text-text-base'
                : 'border-border bg-card text-text-base hover:border-primary cursor-pointer'
            } else {
              if (i === question.correct) {
                optClass += 'border-success bg-bg-secondary text-success font-semibold'
              } else if (answer === String(i) && i !== question.correct) {
                optClass += 'border-error bg-bg-secondary text-error'
              } else {
                optClass += 'border-border bg-card text-text-muted opacity-60'
              }
            }

            return (
              <button
                key={i}
                type="button"
                disabled={showResult}
                onClick={() => onChange(String(i))}
                className={optClass}
              >
                {opt}
              </button>
            )
          })}
        </div>
      )}

      {showResult && (
        <p className={`text-xs font-semibold ${isCorrectAnswer ? 'text-success' : 'text-error'}`}>
          {isCorrectAnswer ? '✓ Correct' : `✗ Correct answer: ${question.options[question.correct]}`}
        </p>
      )}
    </div>
  )
}
