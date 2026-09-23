import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { BackButton } from '../components/BackButton'
import { BackIcon } from '../components/icons'
import { getGameById } from '../data/games'
import { gameComponents } from '../games/registry'
import { useFullscreen } from '../hooks/useFullscreen'

export function GamePage() {
  const { t } = useTranslation()
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const game = gameId ? getGameById(gameId) : undefined
  const containerRef = useFullscreen<HTMLDivElement>()

  if (!game || game.wip) return <Navigate to="/games" replace />

  const GameComponent = gameComponents[game.id]

  return (
    <div ref={containerRef} className="relative flex min-h-svh flex-col bg-ink text-cream">
      <BackButton
        label={t('common.exit')}
        onClick={() => navigate(`/games/${game.id}`)}
        variant="danger"
        icon={<BackIcon />}
        className="absolute top-4 left-4 z-10"
      />

      {GameComponent ? (
        <GameComponent />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="text-sm font-medium tracking-wide text-cream/60 uppercase">
            {t('gamePage.comingSoon')}
          </p>
          <h1 className="mt-2 text-4xl font-bold text-cream">
            {t(`games.${game.id}.title`)}
          </h1>
          <p className="mt-3 max-w-md text-center text-cream/70">
            {t('gamePage.placeholderDescription')}
          </p>
        </div>
      )}
    </div>
  )
}
