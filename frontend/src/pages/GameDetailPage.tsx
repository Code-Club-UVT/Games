import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { BackButton } from '../components/BackButton'
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

  if (!game) return <Navigate to="/games" replace />

  return (
    <main className="min-h-svh bg-cream p-4 sm:p-8">
      <div className="mx-auto max-w-lg">
        <BackButton label={t('common.games')} onClick={() => navigate('/games')} />

        <h1 className="mt-6 text-3xl font-bold text-ink">
          {t(`games.${game.id}.title`)}
        </h1>
        <p className="mt-2 text-ink/70">{t(`games.${game.id}.description`)}</p>

        <button
          type="button"
          onClick={() => navigate(`/games/${game.id}/play`)}
          className="mt-6 w-full rounded-full bg-brand py-3 text-lg font-semibold text-ink transition hover:bg-brand/85 active:scale-95"
        >
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
