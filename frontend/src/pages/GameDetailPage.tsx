import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { BackButton } from '../components/BackButton'
import { BackIcon, PlayIcon } from '../components/icons'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { LeaderboardTable } from '../components/LeaderboardTable'
import { getGameById } from '../data/games'
import { getGameLeaderboard, subscribeToResults } from '../services/api/leaderboardApi'
import type { LeaderboardEntry } from '../types/game'

export function GameDetailPage() {
  const { t } = useTranslation()
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const game = gameId ? getGameById(gameId) : undefined
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    if (!gameId) return
    const id = gameId
    let cancelled = false

    function refresh() {
      getGameLeaderboard(id).then((result) => {
        if (!cancelled) setEntries(result)
      })
    }

    refresh()
    // Live sync: when any display submits a score for this game, everyone
    // viewing its leaderboard picks up the change immediately.
    const unsubscribe = subscribeToResults((event) => {
      if (event.gameId === id) refresh()
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [gameId])

  if (!game || game.wip) return <Navigate to="/games" replace />

  return (
    <main className="min-h-svh bg-cream p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <BackButton
            icon={<BackIcon />}
            label={t('common.games')}
            onClick={() => navigate('/games')}
          />
          <LanguageSwitcher />
        </div>

        <h1 className="mt-6 text-3xl font-bold text-ink">
          {t(`games.${game.id}.title`)}
        </h1>
        <p className="mt-2 text-ink/70">{t(`games.${game.id}.description`)}</p>

        <div className="mt-6 aspect-video w-full overflow-hidden rounded-2xl bg-ink ring-1 ring-ink/10">
          {game.video ? (
            <video
              src={game.video}
              controls
              loop
              muted
              playsInline
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-cream/60">
              <svg viewBox="0 0 24 24" className="h-14 w-14" fill="currentColor" aria-hidden="true">
                <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
              </svg>
              <p className="text-sm font-medium">{t('gameDetail.videoPlaceholder')}</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate(`/games/${game.id}/play`)}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3 text-lg font-semibold text-ink transition hover:bg-brand/85 active:scale-95"
        >
          <PlayIcon />
          {t('gameDetail.play')}
        </button>

        <h2 className="mt-10 mb-3 text-lg font-semibold text-ink">
          {t('gameDetail.leaderboard')}
        </h2>
        <LeaderboardTable entries={entries} />
      </div>
    </main>
  )
}
