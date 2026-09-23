import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { verifyLogoutPassword } from '../services/api/authApi'
import { ApiError } from '../services/api/client'

interface LogoutConfirmDialogProps {
  onConfirm: () => void
  onCancel: () => void
}

export function LogoutConfirmDialog({ onConfirm, onCancel }: LogoutConfirmDialogProps) {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<'incorrect' | 'tooMany' | 'network' | null>(null)
  const [checking, setChecking] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setChecking(true)
    try {
      await verifyLogoutPassword(password)
      onConfirm()
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) setError('incorrect')
      else if (caught instanceof ApiError && caught.status === 429) setError('tooMany')
      else setError('network')
      setChecking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-ink/10"
      >
        <h2 className="text-xl font-semibold text-ink">{t('logout.title')}</h2>
        <p className="mt-1 text-sm text-ink/70">{t('logout.description')}</p>

        <input
          type="password"
          autoFocus
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            setError(null)
          }}
          placeholder={t('logout.passwordPlaceholder')}
          className="mt-4 w-full rounded-lg border-2 border-ink/20 bg-white px-4 py-3 text-ink outline-none focus:border-brand"
        />
        {error && <p className="mt-2 text-sm text-cherry">{t(`logout.errors.${error}`)}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-sm font-medium text-ink transition hover:bg-ink/5"
          >
            {t('common.back')}
          </button>
          <button
            type="submit"
            disabled={checking}
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-ink transition hover:bg-brand/85 active:scale-95 disabled:opacity-60"
          >
            {t('logout.confirm')}
          </button>
        </div>
      </form>
    </div>
  )
}
