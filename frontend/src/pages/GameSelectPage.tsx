import { useTranslation } from 'react-i18next'
import { GameGrid } from '../components/GameGrid'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { LogoutButton } from '../components/LogoutButton'
import { useAuth } from '../context/useAuth'

export function GameSelectPage() {
  const { t } = useTranslation()
  const { username } = useAuth()

  return (
    <main className="min-h-svh bg-cream p-4 sm:p-8">
      <header className="mx-auto mb-8 flex max-w-5xl items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t('gameSelect.title')}</h1>
          <p className="text-ink/70">{t('gameSelect.playingAs', { username })}</p>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto max-w-5xl">
        <GameGrid />
      </div>
    </main>
  )
}
