import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GameShell, type GameShellApi } from '../shell/GameShell'

const GAME_ID = 'whack-a-mole'
// The spec's 3x3 and 4x4 modes share all of this logic and differ only in
// grid size. Only 3x3 is in the menu for now; a 4x4 mode would need its own
// game id so the two modes don't share one leaderboard.
const GRID_SIZE = 3
const HOLE_COUNT = GRID_SIZE * GRID_SIZE

const ROUND_MS = 30_000
const TICK_MS = 50
const HIT_FLASH_MS = 250

// Both the time a mole stays up and the gap between spawns shrink linearly
// over the round, so it starts gentle and ends frantic.
const MOLE_UP_START_MS = 1300
const MOLE_UP_END_MS = 600
const SPAWN_GAP_START_MS = 900
const SPAWN_GAP_END_MS = 380

const POINTS_PER_HIT = 10
const COMBO_STEP = 5 // every 5 hits in a row adds 1 to the multiplier
const MAX_MULTIPLIER = 4

type HoleView = 'empty' | 'mole' | 'hit'

interface Snapshot {
  holes: HoleView[]
  score: number
  combo: number
  secondsLeft: number
}

interface Sim {
  startedAt: number
  nextSpawnAt: number
  lastHole: number | null
  moleExpiresAt: (number | null)[]
  hitUntil: number[]
  score: number
  hits: number
  combo: number
  bestCombo: number
}

function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress
}

function multiplierFor(combo: number) {
  return Math.min(MAX_MULTIPLIER, 1 + Math.floor(combo / COMBO_STEP))
}

function takeSnapshot(sim: Sim, now: number): Snapshot {
  return {
    holes: Array.from({ length: HOLE_COUNT }, (_, index) => {
      if (sim.moleExpiresAt[index] !== null) return 'mole'
      return sim.hitUntil[index] > now ? 'hit' : 'empty'
    }),
    score: sim.score,
    combo: sim.combo,
    secondsLeft: Math.max(0, Math.ceil((ROUND_MS - (now - sim.startedAt)) / 1000)),
  }
}

interface MoleGridProps {
  holes: HoleView[]
  onWhack?: (index: number) => void
}

function MoleGrid({ holes, onWhack }: MoleGridProps) {
  const { t } = useTranslation()

  return (
    <div
      className="grid gap-3 sm:gap-5"
      style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
    >
      {holes.map((state, index) => (
        <button
          key={index}
          type="button"
          aria-label={t('whackAMole.hole', { value: index + 1 })}
          tabIndex={onWhack ? 0 : -1}
          onPointerDown={onWhack && (() => onWhack(index))}
          className={`relative h-24 w-24 overflow-hidden rounded-3xl bg-dusk sm:h-36 sm:w-36 ${
            onWhack ? 'cursor-pointer' : 'cursor-default'
          }`}
        >
          <div
            className={`absolute inset-x-3 top-3 bottom-0 rounded-t-full transition-transform duration-150 ${
              state === 'hit' ? 'bg-brand' : 'bg-tangerine'
            } ${state === 'empty' ? 'translate-y-full' : 'translate-y-0'}`}
          >
            <div className="mt-[28%] flex justify-center gap-[22%]">
              <span className="h-2.5 w-2.5 rounded-full bg-ink sm:h-4 sm:w-4" />
              <span className="h-2.5 w-2.5 rounded-full bg-ink sm:h-4 sm:w-4" />
            </div>
            <span className="mx-auto mt-2 block h-3 w-5 rounded-full bg-bubblegum sm:h-4 sm:w-7" />
          </div>
        </button>
      ))}
    </div>
  )
}

function Round({ finish }: GameShellApi) {
  const { t } = useTranslation()
  const simRef = useRef<Sim | null>(null)
  // The round's timer must not restart if the shell hands down a new `finish`.
  const finishRef = useRef(finish)
  useEffect(() => {
    finishRef.current = finish
  }, [finish])
  const [view, setView] = useState<Snapshot>(() => ({
    holes: Array<HoleView>(HOLE_COUNT).fill('empty'),
    score: 0,
    combo: 0,
    secondsLeft: ROUND_MS / 1000,
  }))

  useEffect(() => {
    const start = performance.now()
    const sim: Sim = {
      startedAt: start,
      nextSpawnAt: start + 600,
      lastHole: null,
      moleExpiresAt: Array<number | null>(HOLE_COUNT).fill(null),
      hitUntil: Array<number>(HOLE_COUNT).fill(0),
      score: 0,
      hits: 0,
      combo: 0,
      bestCombo: 0,
    }
    simRef.current = sim

    const id = window.setInterval(() => {
      const now = performance.now()
      const progress = Math.min(1, (now - sim.startedAt) / ROUND_MS)

      // A mole that gets away breaks the combo.
      sim.moleExpiresAt.forEach((expiresAt, index) => {
        if (expiresAt !== null && now >= expiresAt) {
          sim.moleExpiresAt[index] = null
          sim.combo = 0
        }
      })

      if (now >= sim.nextSpawnAt) {
        // A mole never pops up in the same hole twice in a row.
        const free = sim.moleExpiresAt.flatMap((expiresAt, index) =>
          expiresAt === null && index !== sim.lastHole ? [index] : [],
        )
        if (free.length > 0) {
          const hole = free[Math.floor(Math.random() * free.length)]
          sim.moleExpiresAt[hole] = now + lerp(MOLE_UP_START_MS, MOLE_UP_END_MS, progress)
          sim.hitUntil[hole] = 0
          sim.lastHole = hole
        }
        sim.nextSpawnAt = now + lerp(SPAWN_GAP_START_MS, SPAWN_GAP_END_MS, progress)
      }

      setView(takeSnapshot(sim, now))

      if (now - sim.startedAt >= ROUND_MS) {
        window.clearInterval(id)
        finishRef.current({
          // A round with no hits isn't worth a leaderboard entry.
          score: sim.score > 0 ? sim.score : null,
          summary: (
            <div className="flex flex-col items-center gap-2">
              <p className="text-3xl font-bold text-brand">
                {t('whackAMole.result', { value: sim.score })}
              </p>
              <p className="text-cream/70">
                {t('whackAMole.details', { hits: sim.hits, combo: sim.bestCombo })}
              </p>
            </div>
          ),
        })
      }
    }, TICK_MS)

    return () => window.clearInterval(id)
  }, [t])

  function handleWhack(index: number) {
    const sim = simRef.current
    if (!sim || sim.moleExpiresAt[index] === null) return

    const now = performance.now()
    sim.combo += 1
    sim.hits += 1
    sim.bestCombo = Math.max(sim.bestCombo, sim.combo)
    sim.score += POINTS_PER_HIT * multiplierFor(sim.combo)
    sim.moleExpiresAt[index] = null
    sim.hitUntil[index] = now + HIT_FLASH_MS
    setView(takeSnapshot(sim, now))
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-ink text-cream select-none">
      <div className="flex gap-8 text-lg font-semibold">
        <span>{t('whackAMole.score', { value: view.score })}</span>
        <span>{t('whackAMole.time', { value: view.secondsLeft })}</span>
      </div>

      <p className="h-6 font-semibold text-sun">
        {view.combo >= COMBO_STEP && t('whackAMole.combo', { value: multiplierFor(view.combo) })}
      </p>

      <MoleGrid holes={view.holes} onWhack={handleWhack} />
    </div>
  )
}

// Start-screen preview: the same layout as a round, with one mole in the middle hole.
const PREVIEW_HOLES: HoleView[] = Array.from({ length: HOLE_COUNT }, (_, index) =>
  index === Math.floor(HOLE_COUNT / 2) ? 'mole' : 'empty',
)

function Preview() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-ink text-cream">
      <div className="flex gap-8 text-lg font-semibold">
        <span>{t('whackAMole.score', { value: 0 })}</span>
        <span>{t('whackAMole.time', { value: ROUND_MS / 1000 })}</span>
      </div>

      <p className="h-6" />

      <MoleGrid holes={PREVIEW_HOLES} />
    </div>
  )
}

export function WhackAMoleGame() {
  return (
    <GameShell gameId={GAME_ID} preview={<Preview />}>
      {(api) => <Round {...api} />}
    </GameShell>
  )
}
