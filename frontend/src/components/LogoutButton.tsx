import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/useAuth'
import { LogoutConfirmDialog } from './LogoutConfirmDialog'

export function LogoutButton() {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsDialogOpen(true)}
        className="rounded-full bg-white px-4 py-2 text-sm font-medium text-ink ring-1 ring-ink/15 transition hover:bg-ink/5 active:scale-95"
      >
        {t('logout.button')}
      </button>

      {isDialogOpen && (
        <LogoutConfirmDialog
          onConfirm={() => {
            setIsDialogOpen(false)
            logout()
          }}
          onCancel={() => setIsDialogOpen(false)}
        />
      )}
    </>
  )
}
