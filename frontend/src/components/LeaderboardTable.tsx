import { useTranslation } from 'react-i18next'
import type { LeaderboardEntry } from '../types/game'

export function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  const { t } = useTranslation()

  if (entries.length === 0) {
    return <p className="text-ink/70">{t('gameDetail.noScores')}</p>
  }

  return (
    <ol className="divide-y divide-ink/10 overflow-hidden rounded-xl ring-1 ring-ink/10">
      {entries.map((entry) => (
        <li
          key={entry.rank}
          className="flex items-center justify-between bg-white px-4 py-3"
        >
          <span className="flex items-center gap-3">
            <span className="w-6 text-right font-semibold text-ink/60">{entry.rank}</span>
            <span className="text-ink">{entry.playerId}</span>
          </span>
          <span className="font-semibold text-iris">{entry.score}</span>
        </li>
      ))}
    </ol>
  )
}
