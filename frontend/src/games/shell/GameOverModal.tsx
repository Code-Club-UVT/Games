import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Fireworks } from './Fireworks'
import { isCelebrated, type Standing } from './standing'

export type SubmitStatus = 'idle' | 'saving' | 'saved' | 'error'

interface GameOverModalProps {
  summary: ReactNode
  // False for rounds with no leaderboard-eligible score (nothing is saved).
  hasScore: boolean
  submitStatus: SubmitStatus
  standing: Standing | null
  onBack: () => void
  onPlayAgain: () => void
}

export function GameOverModal({
  summary,
  hasScore,
  submitStatus,
  standing,
  onBack,
  onPlayAgain,
}: GameOverModalProps) {
  const { t } = useTranslation()

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('gameShell.gameOver')}
      className="fixed inset-0 z-20 flex items-center justify-center bg-ink/60 p-4 text-cream backdrop-blur-sm select-none"
    >
      {isCelebrated(standing) && (
        <Fireworks burstIntervalMs={standing.kind === 'top' ? 900 : 450} />
      )}

      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-3xl border border-cream/20 bg-ink p-8 text-center shadow-2xl">
        <h2 className="text-sm font-medium tracking-wide text-cream/60 uppercase">
          {t('gameShell.gameOver')}
        </h2>

        {summary}

        {hasScore && (
          <div className="flex min-h-12 flex-col items-center gap-1">
            {standing && (
              <p
                className={`text-lg font-semibold ${
                  isCelebrated(standing) ? 'text-sun' : 'text-cream'
                }`}
              >
                {standingMessage(standing, t)}
              </p>
            )}
            <p className="text-sm text-cream/60">
              {submitStatus === 'saving' && t('gameShell.saving')}
              {submitStatus === 'saved' && t('gameShell.saved')}
              {submitStatus === 'error' && t('gameShell.error')}
            </p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full bg-cream/15 px-8 py-3 text-lg font-semibold text-cream transition hover:bg-cream/25 active:scale-95"
          >
            {t('common.back')}
          </button>
          <button
            type="button"
            onClick={onPlayAgain}
            className="rounded-full bg-brand px-8 py-3 text-lg font-semibold text-ink transition hover:bg-brand/85 active:scale-95"
          >
            {t('gameShell.playAgain')}
          </button>
        </div>
      </div>
    </div>
  )
}

function standingMessage(standing: Standing, t: TFunction) {
  switch (standing.kind) {
    case 'first':
      return t('gameShell.standing.first')
    case 'best':
      return t('gameShell.standing.best')
    case 'top':
      return t('gameShell.standing.top', { rank: standing.rank })
    case 'percent':
      return standing.percent > 0
        ? t('gameShell.standing.percent', { percent: standing.percent })
        : t('gameShell.standing.keepGoing')
  }
}
