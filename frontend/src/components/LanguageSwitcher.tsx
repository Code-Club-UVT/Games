import gbFlag from 'flag-icons/flags/4x3/gb.svg'
import roFlag from 'flag-icons/flags/4x3/ro.svg'
import { useTranslation } from 'react-i18next'

// English maps to the UK flag since there's no generic "English language"
// flag. Importing the specific SVGs directly (rather than the flag-icons
// stylesheet) keeps the bundle from pulling in every country's flag.
const FLAGS: Record<string, string> = {
  en: gbFlag,
  ro: roFlag,
}

const NEXT_LANGUAGE: Record<string, string> = {
  en: 'ro',
  ro: 'en',
}

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const current = i18n.resolvedLanguage ?? 'en'

  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(NEXT_LANGUAGE[current] ?? 'en')}
      aria-label={t('common.language')}
      className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-ink/15 transition hover:ring-brand active:scale-95"
    >
      <img src={FLAGS[current] ?? gbFlag} alt="" className="h-full w-full object-cover" />
    </button>
  )
}
