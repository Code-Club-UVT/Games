// Top-down car models drawn as inline SVG (no image files, so they work offline
// and recolour freely). Every model is drawn nose-up in a 40x80 box, and the
// body takes its colour from `currentColor`, so set it with a text colour class.

import type { CarModel } from './carModels'

const GLASS = 'fill-ink'
const SHADE = 'rgba(6, 23, 25, 0.16)'

function Wheels() {
  return (
    <g className="fill-ink">
      <rect x="1" y="14" width="5" height="12" rx="2" />
      <rect x="34" y="14" width="5" height="12" rx="2" />
      <rect x="1" y="54" width="5" height="12" rx="2" />
      <rect x="34" y="54" width="5" height="12" rx="2" />
    </g>
  )
}

function Lights() {
  return (
    <>
      <circle cx="11" cy="6" r="2.6" className="fill-butter" />
      <circle cx="29" cy="6" r="2.6" className="fill-butter" />
      <rect x="8" y="73" width="7" height="2.4" rx="1" className="fill-cherry" />
      <rect x="25" y="73" width="7" height="2.4" rx="1" className="fill-cherry" />
    </>
  )
}

function Body({ model }: { model: CarModel }) {
  switch (model) {
    case 'sedan':
      return (
        <>
          <rect x="5" y="3" width="30" height="74" rx="11" fill="currentColor" />
          <path d="M10 26h20l-2 10H12z" className={GLASS} />
          <rect x="10" y="36" width="20" height="16" rx="3" fill={SHADE} />
          <path d="M12 52h16l2 10H10z" className={GLASS} />
          <Lights />
        </>
      )
    case 'hatch':
      return (
        <>
          <rect x="5" y="6" width="30" height="68" rx="14" fill="currentColor" />
          <path d="M11 24h18l-1.5 10h-15z" className={GLASS} />
          <rect x="11" y="34" width="18" height="18" rx="3" fill={SHADE} />
          <path d="M12 52h16l1.5 8h-19z" className={GLASS} />
          <Lights />
        </>
      )
    case 'sport':
      return (
        <>
          <path
            d="M8 7Q20-2 32 7L35 30L34 72Q20 79 6 72L5 30Z"
            fill="currentColor"
          />
          <rect x="18" y="3" width="4" height="72" className="fill-butter" opacity="0.75" />
          <path d="M11 30h18l-2 10H13z" className={GLASS} />
          <path d="M13 52h14l2 8H11z" className={GLASS} />
          <rect x="6" y="72" width="28" height="4" rx="1.5" className="fill-ink" />
          <circle cx="11" cy="8" r="2.4" className="fill-butter" />
          <circle cx="29" cy="8" r="2.4" className="fill-butter" />
        </>
      )
    case 'van':
      return (
        <>
          <rect x="4" y="3" width="32" height="74" rx="7" fill="currentColor" />
          <path d="M9 10h22l-2 10H11z" className={GLASS} />
          <rect x="8" y="23" width="24" height="49" rx="2" fill={SHADE} />
          <Lights />
        </>
      )
    case 'truck':
      return (
        <>
          <rect x="6" y="3" width="28" height="24" rx="7" fill="currentColor" />
          <path d="M10 8h20l-1 9H11z" className={GLASS} />
          <rect x="4" y="29" width="32" height="48" rx="3" className="fill-cream" />
          <rect x="4" y="29" width="32" height="48" rx="3" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <rect x="9" y="35" width="22" height="36" rx="2" fill={SHADE} />
          <circle cx="12" cy="6" r="2.4" className="fill-butter" />
          <circle cx="28" cy="6" r="2.4" className="fill-butter" />
          <rect x="8" y="74" width="7" height="2.4" rx="1" className="fill-cherry" />
          <rect x="25" y="74" width="7" height="2.4" rx="1" className="fill-cherry" />
        </>
      )
  }
}

export function Car({
  model,
  className = '',
  style,
}: {
  model: CarModel
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <svg viewBox="0 0 40 80" className={className} style={style} aria-hidden="true">
      <Wheels />
      <Body model={model} />
    </svg>
  )
}
