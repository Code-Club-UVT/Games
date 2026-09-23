interface BackButtonProps {
  onClick: () => void
  label?: string
  className?: string
}

export function BackButton({ onClick, label = 'Back', className = '' }: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full bg-white px-4 py-2 text-sm font-medium text-ink ring-1 ring-ink/15 transition hover:bg-ink/5 active:scale-95 ${className}`}
    >
      {label}
    </button>
  )
}
