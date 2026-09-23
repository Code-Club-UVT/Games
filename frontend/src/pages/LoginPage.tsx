import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { useAuth } from '../context/useAuth'

export function LoginPage() {
  const { t } = useTranslation()
  const { username, login } = useAuth()
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (username) return <Navigate to="/games" replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    const result = await login(value)
    setIsSubmitting(false)

    if (result.ok) {
      navigate('/games')
      return
    }
    setError(t(`login.errors.${result.reason}`))
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center bg-cream p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl ring-1 ring-ink/10"
      >
        <h1 className="text-2xl font-bold text-ink">{t('login.title')}</h1>
        <p className="mt-2 text-ink/70">{t('login.subtitle')}</p>

        <input
          type="text"
          autoFocus
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setError(null)
          }}
          placeholder={t('login.placeholder')}
          className="mt-6 w-full rounded-lg border-2 border-ink/20 bg-white px-4 py-3 text-center text-lg text-ink outline-none focus:border-brand"
        />
        {error && <p className="mt-2 text-sm text-cherry">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 w-full rounded-full bg-brand py-3 text-lg font-semibold text-ink transition hover:bg-brand/85 active:scale-95 disabled:opacity-60"
        >
          {isSubmitting ? t('login.checking') : t('login.play')}
        </button>
      </form>
    </main>
  )
}
