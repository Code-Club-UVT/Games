import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { Game } from '../types/game'

// Background/text pairs taken from the accessible combinations in the brand
// guidelines, cycled so neighbouring cards differ.
const CARD_COLORS = [
  'bg-brand text-ink',
  'bg-cherry text-butter',
  'bg-iris text-butter',
  'bg-sun text-ink',
  'bg-ink text-brand',
  'bg-butter text-cherry',
  'bg-cream text-iris',
  'bg-cherry text-cream',
  'bg-iris text-cream',
]

export function GameCard({ game, index }: { game: Game; index: number }) {
  const { t } = useTranslation()

  return (
    <Link
      to={`/games/${game.id}`}
      className={`flex aspect-square items-center justify-center rounded-2xl p-4 text-center ring-1 ring-ink/10 transition hover:scale-[1.03] active:scale-95 ${
        CARD_COLORS[index % CARD_COLORS.length]
      }`}
    >
      <span className="text-sm font-bold sm:text-lg">{t(`games.${game.id}.title`)}</span>
    </Link>
  )
}
