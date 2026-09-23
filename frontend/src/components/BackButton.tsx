import type { ReactNode } from 'react'

interface BackButtonProps {
  onClick: () => void
  label?: string
  className?: string
  icon?: ReactNode
  // 'danger' is the red button used for leaving a game.
  variant?: 'default' | 'danger'
}

const VARIANTS = {
  default: 'bg-white text-ink ring-1 ring-ink/15 hover:bg-ink/5',
  danger: 'bg-cherry text-cream hover:bg-cherry/85',
}

export function BackButton({
  onClick,
  label = 'Back',
  className = '',
  icon,
  variant = 'default',
}: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition active:scale-95 ${VARIANTS[variant]} ${className}`}
    >
      {icon}
      {label}
    </button>
  )
}
