// Minimal outline icons (24x24, inherit the text colour).
function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function BackIcon() {
  return (
    <Icon>
      <path d="M15 5l-7 7 7 7" />
    </Icon>
  )
}

export function LogoutIcon() {
  return (
    <Icon>
      <path d="M10 4H5v16h5" />
      <path d="M10 12h10m-4-4 4 4-4 4" />
    </Icon>
  )
}

export function PlayIcon() {
  return (
    <Icon>
      <path d="M8 5v14l11-7z" />
    </Icon>
  )
}
