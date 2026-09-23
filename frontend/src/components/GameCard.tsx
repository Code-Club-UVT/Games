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

function ImagePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-xl bg-current/15">
      <svg viewBox="0 0 24 24" className="h-1/3 w-1/3 opacity-50" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="1.6" />
        <path d="m21 16-5-5-8 8" />
      </svg>
    </div>
  )
}

export function GameCard({ game, index }: { game: Game; index: number }) {
  const { t } = useTranslation()
  const title = t(`games.${game.id}.title`)
  const className = `relative flex flex-col gap-3 rounded-2xl p-3 text-center ring-1 ring-ink/10 sm:p-4 ${
    CARD_COLORS[index % CARD_COLORS.length]
  }`

  const content = (
    <>
      <div className="aspect-4/3 w-full overflow-hidden rounded-xl">
        {game.image ? (
          <img src={game.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImagePlaceholder />
        )}
      </div>
      <span className="text-sm font-bold sm:text-lg">{title}</span>
    </>
  )

  if (game.wip) {
    return (
      <div aria-disabled="true" className={`${className} cursor-not-allowed opacity-60 grayscale`}>
        {content}
        <span className="absolute top-5 right-5 rounded-full bg-ink px-3 py-1 text-xs font-bold tracking-wide text-butter sm:top-6 sm:right-6">
          {t('gameSelect.wip')}
        </span>
      </div>
    )
  }

  return (
    <Link
      to={`/games/${game.id}`}
      className={`${className} transition hover:scale-[1.03] active:scale-95`}
    >
      {content}
    </Link>
  )
}
