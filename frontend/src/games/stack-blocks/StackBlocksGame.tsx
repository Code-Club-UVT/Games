import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GameShell, type GameShellApi } from '../shell/GameShell'

const GAME_ID = 'stack-the-blocks'

// Horizontal positions and widths are in percent of the play field; the
// vertical size of a block is in pixels.
const FIELD_WIDTH = 100
const START_WIDTH = 40
const BLOCK_HEIGHT_PX = 40
const PERFECT_TOLERANCE = 1.2 // a drop this close counts as perfectly aligned
// The sliding block hovers this many block-heights above the tower, and falls
// onto it when tapped.
const HOVER_LEVELS = 3
const HOVER_TOP_FRACTION = 0.7 // how high up the screen the hovering block is kept
const DROP_MS = 220
const MISS_MS = 480

// The tower has no height limit, so the slide speed keeps rising, up to a cap.
const START_SPEED = 32 // percent of the field per second
const SPEED_STEP = 2.2
const MAX_SPEED = 95

const DEBRIS_MS = 700
const PERFECT_FLASH_MS = 600

const BLOCK_COLORS = [
  'bg-brand',
  'bg-azure',
  'bg-sun',
  'bg-bubblegum',
  'bg-tangerine',
  'bg-cherry',
]

interface Block {
  left: number
  width: number
  color: number
}

interface Moving extends Block {
  dir: 1 | -1
}

interface Debris extends Block {
  id: number
  level: number
}

interface Dropping extends Block {
  level: number
  miss: boolean
}

interface Sim {
  stack: Block[]
  moving: Moving
  nextDebrisId: number
  over: boolean
  dropping: boolean
}

interface View {
  stack: Block[]
  moving: Moving
  dropping: Dropping | null
  debris: Debris[]
}

function speedFor(placed: number) {
  return Math.min(MAX_SPEED, START_SPEED + placed * SPEED_STEP)
}

function newMoving(width: number, level: number): Moving {
  // Alternate the side each block enters from.
  const fromLeft = level % 2 === 1
  return {
    left: fromLeft ? 0 : FIELD_WIDTH - width,
    width,
    dir: fromLeft ? 1 : -1,
    color: level % BLOCK_COLORS.length,
  }
}

function createSim(): Sim {
  return {
    stack: [{ left: (FIELD_WIDTH - START_WIDTH) / 2, width: START_WIDTH, color: 0 }],
    moving: newMoving(START_WIDTH, 1),
    nextDebrisId: 0,
    over: false,
    dropping: false,
  }
}

function BlockView({
  block,
  level,
  className = '',
  hovering = false,
}: {
  block: Block
  level: number
  className?: string
  // Sliding blocks float above the tower by HOVER_LEVELS block-heights.
  hovering?: boolean
}) {
  return (
    <div
      className={`absolute rounded-md ${BLOCK_COLORS[block.color]} ${className}`}
      style={{
        left: `${block.left}%`,
        width: `${block.width}%`,
        bottom: (level + (hovering ? HOVER_LEVELS : 0)) * BLOCK_HEIGHT_PX,
        height: BLOCK_HEIGHT_PX - 2,
        ['--drop-from' as string]: `${-HOVER_LEVELS * BLOCK_HEIGHT_PX}px`,
      }}
    />
  )
}

function Round({ finish }: GameShellApi) {
  const { t } = useTranslation()
  const fieldRef = useRef<HTMLDivElement>(null)
  const finishRef = useRef(finish)
  useEffect(() => {
    finishRef.current = finish
  }, [finish])

  const [initialSim] = useState(createSim)
  const simRef = useRef(initialSim)
  const [view, setView] = useState<View>({
    stack: initialSim.stack,
    moving: { ...initialSim.moving },
    dropping: null,
    debris: [],
  })
  const [fieldHeight, setFieldHeight] = useState(600)
  const [perfectFlash, setPerfectFlash] = useState(0)

  useEffect(() => {
    const field = fieldRef.current
    if (!field) return
    const observer = new ResizeObserver(() => setFieldHeight(field.clientHeight))
    observer.observe(field)
    return () => observer.disconnect()
  }, [])

  // Slide the current block back and forth until the player drops it.
  useEffect(() => {
    let frame = 0
    let last: number | null = null

    function tick(now: number) {
      const sim = simRef.current
      if (sim.over) return
      if (sim.dropping) {
        last = null
        frame = requestAnimationFrame(tick)
        return
      }
      const dt = last === null ? 0 : Math.min(0.05, (now - last) / 1000)
      last = now

      const moving = sim.moving
      const speed = speedFor(sim.stack.length - 1)
      moving.left += moving.dir * speed * dt
      if (moving.left <= 0) {
        moving.left = 0
        moving.dir = 1
      } else if (moving.left + moving.width >= FIELD_WIDTH) {
        moving.left = FIELD_WIDTH - moving.width
        moving.dir = -1
      }

      setView((current) => ({ ...current, moving: { ...moving } }))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  function handleDrop() {
    const sim = simRef.current
    if (sim.over || sim.dropping) return

    const top = sim.stack[sim.stack.length - 1]
    const moving = { ...sim.moving }
    const overlapLeft = Math.max(top.left, moving.left)
    const overlapRight = Math.min(top.left + top.width, moving.left + moving.width)
    const overlap = overlapRight - overlapLeft
    const placed = sim.stack.length - 1
    const level = sim.stack.length
    const miss = overlap <= 0

    // First the tapped block falls (at its own position and full width)...
    sim.dropping = true
    setView((current) => ({
      ...current,
      dropping: { left: moving.left, width: moving.width, color: moving.color, level, miss },
    }))

    // ...then, once it lands, the overhang is sliced off.
    window.setTimeout(
      () => {
        if (miss) {
          sim.over = true
          finishRef.current({
            // Missing the very first block isn't worth a leaderboard entry.
            score: placed > 0 ? placed : null,
            summary: (
              <p className="text-3xl font-bold text-brand">
                {t('stackBlocks.result', { count: placed })}
              </p>
            ),
          })
          return
        }

        const perfect = Math.abs(moving.left - top.left) <= PERFECT_TOLERANCE
        const landed: Block = perfect
          ? { left: top.left, width: top.width, color: moving.color }
          : { left: overlapLeft, width: overlap, color: moving.color }

        const newDebris: Debris[] = []
        if (!perfect) {
          const slicedLeft = moving.left < top.left
          newDebris.push({
            id: sim.nextDebrisId++,
            level,
            color: moving.color,
            left: slicedLeft ? moving.left : overlapRight,
            width: slicedLeft ? top.left - moving.left : moving.left + moving.width - overlapRight,
          })
        } else {
          setPerfectFlash((count) => count + 1)
          window.setTimeout(() => setPerfectFlash((count) => count - 1), PERFECT_FLASH_MS)
        }

        sim.stack = [...sim.stack, landed]
        sim.moving = newMoving(landed.width, sim.stack.length)
        sim.dropping = false
        setView((current) => ({
          stack: sim.stack,
          moving: { ...sim.moving },
          dropping: null,
          debris: [...current.debris, ...newDebris],
        }))

        newDebris.forEach((piece) => {
          window.setTimeout(() => {
            setView((current) => ({
              ...current,
              debris: current.debris.filter((d) => d.id !== piece.id),
            }))
          }, DEBRIS_MS)
        })
      },
      miss ? MISS_MS : DROP_MS,
    )
  }

  const level = view.stack.length
  // Scroll the whole tower down so the block being placed stays in view.
  const offset = Math.max(
    0,
    (level + HOVER_LEVELS) * BLOCK_HEIGHT_PX - fieldHeight * HOVER_TOP_FRACTION,
  )
  const firstVisible = Math.max(0, Math.floor(offset / BLOCK_HEIGHT_PX) - 1)

  return (
    <div
      onPointerDown={handleDrop}
      className="relative flex-1 cursor-pointer overflow-hidden bg-ink text-cream select-none"
    >
      <div
        ref={fieldRef}
        className="absolute top-0 bottom-24 left-1/2 w-full max-w-md -translate-x-1/2 overflow-hidden"
      >
        <div
          className="absolute inset-0 transition-transform duration-300 ease-out"
          style={{ transform: `translateY(${offset}px)` }}
        >
          {view.stack.map(
            (block, index) =>
              index >= firstVisible && <BlockView key={index} block={block} level={index} />,
          )}
          {view.dropping ? (
            <BlockView
              block={view.dropping}
              level={view.dropping.level}
              className={view.dropping.miss ? 'block-miss' : 'block-drop'}
            />
          ) : (
            <BlockView block={view.moving} level={level} hovering />
          )}
          {view.debris.map((piece) => (
            <BlockView key={piece.id} block={piece} level={piece.level} className="block-fall" />
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-4 flex flex-col items-center gap-1">
        <span className="text-lg font-semibold">
          {t('stackBlocks.score', { value: level - 1 })}
        </span>
        <span className="h-6 font-semibold text-sun">
          {perfectFlash > 0 && t('stackBlocks.perfect')}
        </span>
      </div>
    </div>
  )
}

// Start-screen preview: the field exactly as a round begins - the base block
// with the first block sliding in above it.
function Preview() {
  const { t } = useTranslation()
  const sim = createSim()
  return (
    <div className="relative flex-1 overflow-hidden bg-ink text-cream">
      <div className="absolute top-0 bottom-24 left-1/2 w-full max-w-md -translate-x-1/2 overflow-hidden">
        <div className="absolute inset-0">
          <BlockView block={sim.stack[0]} level={0} />
          <BlockView block={sim.moving} level={1} hovering />
        </div>
      </div>

      <div className="absolute inset-x-0 top-4 flex flex-col items-center gap-1">
        <span className="text-lg font-semibold">{t('stackBlocks.score', { value: 0 })}</span>
        <span className="h-6" />
      </div>
    </div>
  )
}

export function StackBlocksGame() {
  return (
    <GameShell gameId={GAME_ID} preview={<Preview />}>
      {(api) => <Round {...api} />}
    </GameShell>
  )
}
