import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import { useTheme } from '@/theme/ThemeContext'

interface CelebrationOverlayProps {
  xpEarned: number
  bonusXP: number
  isPerfect: boolean
  onContinue: () => void
}

export function CelebrationOverlay({
  xpEarned,
  bonusXP,
  isPerfect,
  onContinue,
}: CelebrationOverlayProps) {
  const { theme } = useTheme()

  useEffect(() => {
    if (theme !== 'fun') return
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } })
  }, [theme])

  if (theme === 'fun') {
    return <FunOverlay xpEarned={xpEarned} bonusXP={bonusXP} isPerfect={isPerfect} onContinue={onContinue} />
  }

  if (theme === 'pro') {
    return <ProOverlay xpEarned={xpEarned} bonusXP={bonusXP} isPerfect={isPerfect} onContinue={onContinue} />
  }

  return <DevOverlay xpEarned={xpEarned} bonusXP={bonusXP} isPerfect={isPerfect} onContinue={onContinue} />
}

// ─── Fun Theme ───────────────────────────────────────────────────────────────

function FunOverlay({ xpEarned, bonusXP, isPerfect, onContinue }: CelebrationOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg rounded-theme p-8 shadow-2xl max-w-sm w-full mx-4 text-center border border-border">
        <h1 className="text-3xl font-bold text-text-base mb-2">
          {isPerfect ? '⭐ Perfect Score!' : '🎉 Lesson Complete!'}
        </h1>
        <div className="my-6">
          <p className="text-text-muted text-sm mb-1">XP Earned</p>
          <p className="text-primary text-5xl font-bold">+{xpEarned}</p>
          {bonusXP > 0 && (
            <p className="text-success text-lg mt-2">+{bonusXP} bonus XP</p>
          )}
        </div>
        <button
          onClick={onContinue}
          className="bg-primary text-white rounded-theme px-6 py-3 font-semibold w-full hover:opacity-90 transition-opacity"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

// ─── Pro Theme ───────────────────────────────────────────────────────────────

function ProOverlay({ xpEarned, bonusXP, isPerfect, onContinue }: CelebrationOverlayProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(true)
  }, [])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className={`bg-bg rounded-theme p-8 shadow-xl max-w-sm w-full mx-4 border border-border transition-all duration-300 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <h1 className="text-2xl font-semibold text-text-base mb-6">
          {isPerfect ? 'Perfect Score' : 'Lesson Complete'}
        </h1>
        <div className="mb-6">
          <p className="text-text-muted text-sm mb-1">XP Earned</p>
          <p className="text-primary text-4xl font-bold">+{xpEarned}</p>
          {bonusXP > 0 && (
            <p className="text-success mt-2">+{bonusXP} bonus XP</p>
          )}
        </div>
        <button
          onClick={onContinue}
          className="bg-primary text-white rounded-theme px-6 py-3 font-medium w-full hover:opacity-90 transition-opacity"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

// ─── Dev Theme ───────────────────────────────────────────────────────────────

function DevOverlay({ xpEarned, bonusXP, isPerfect, onContinue }: CelebrationOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg rounded-theme p-8 shadow-xl max-w-sm w-full mx-4 border border-border font-mono">
        <div className="text-success text-sm space-y-1 mb-6">
          <p className="text-text-muted">&gt; lesson.complete()</p>
          <p className="text-success">✓ XP awarded: +{xpEarned}</p>
          {bonusXP > 0 && (
            <p className="text-success">✓ bonus: +{bonusXP}</p>
          )}
          {isPerfect && (
            <p className="text-success">✓ perfect: true</p>
          )}
          <p className="text-text-muted">&gt; _</p>
        </div>
        <button
          onClick={onContinue}
          className="text-success border border-success rounded-theme px-6 py-3 w-full hover:bg-success hover:text-bg transition-colors font-mono"
        >
          &gt; continue
        </button>
      </div>
    </div>
  )
}
