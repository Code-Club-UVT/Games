import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GameShell, type GameShellApi } from '../shell/GameShell'

const GAME_ID = 'balloon-pop-precision'
const BALLOON_COUNT = 20
const TICK_MS = 30

// A ring shrinks onto each balloon and lands exactly on its edge at `hitAt`.
// Tapping closer to that moment scores more. Later balloons come faster.
const APPROACH_START_MS = 1500
const APPROACH_END_MS = 900
const SPAWN_GAP_START_MS = 1000
const SPAWN_GAP_END_MS = 650
const LATE_WINDOW_MS = 250 // after this past hitAt the balloon floats away (a miss)
const POPUP_MS = 500
const FINISH_DELAY_MS = 500

// Timing error (ms, either direction) that still earns each judgment.
const PERFECT_MS = 70
const GREAT_MS = 140
const GOOD_MS = 230

type Judgment = 'perfect' | 'great' | 'good' | 'early' | 'late' | 'miss'

const BASE_POINTS: Record<Judgment, number> = {
  perfect: 100,
  great: 70,
  good: 40,
  early: 10,
  late: 10,
  miss: 0,
}

// Precision multiplier: accurate taps build it up, sloppy ones wear it down,
// and a missed balloon resets it.
const MULTIPLIER_CHANGE: Record<Judgment, number> = {
  perfect: 0.25,
  great: 0.1,
  good: 0,
  early: -0.25,
  late: -0.25,
  miss: 0,
}
const MIN_MULTIPLIER = 1
const MAX_MULTIPLIER = 3

const JUDGMENT_COLOR: Record<Judgment, string> = {
  perfect: 'text-sun',
  great: 'text-brand',
  good: 'text-cream',
  early: 'text-azure',
  late: 'text-azure',
  miss: 'text-cherry',
}

const BALLOON_COLORS = [
  'bg-cherry',
  'bg-brand',
  'bg-azure',
  'bg-sun',
  'bg-bubblegum',
  'bg-tangerine',
]

interface BalloonState {
  id: number
  x: number // percent of the play field
  y: number
  color: number
  approachMs: number
  hitAt: number
  judgment: Judgment | null
  removeAt: number
}

interface Sim {
  balloons: BalloonState[]
  spawned: number
  nextSpawnAt: number
  score: number
  multiplier: number
  popped: number
  perfects: number
  finishAt: number | null
}

interface Snapshot {
  balloons: BalloonState[]
  score: number
  multiplier: number
  spawned: number
}

function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress
}

function judge(errorMs: number): Judgment {
  const abs = Math.abs(errorMs)
  if (abs <= PERFECT_MS) return 'perfect'
  if (abs <= GREAT_MS) return 'great'
  if (abs <= GOOD_MS) return 'good'
  return errorMs < 0 ? 'early' : 'late'
}

function pickPosition(active: BalloonState[]) {
  let best = { x: 50, y: 55 }
  let bestDistance = -1
  // Try a few spots and keep the one farthest from balloons still in play.
  for (let attempt = 0; attempt < 12; attempt++) {
    const spot = { x: 12 + Math.random() * 76, y: 24 + Math.random() * 62 }
    const distance = Math.min(
      ...active.filter((b) => b.judgment === null).map((b) => Math.hypot(b.x - spot.x, b.y - spot.y)),
      Infinity,
    )
    if (distance > bestDistance) {
      best = spot
      bestDistance = distance
    }
    if (distance > 24) break
  }
  return best
}

function resolve(sim: Sim, balloon: BalloonState, judgment: Judgment, now: number) {
  balloon.judgment = judgment
  balloon.removeAt = now + POPUP_MS

  sim.score += BASE_POINTS[judgment] * sim.multiplier
  if (judgment === 'miss') {
    sim.multiplier = MIN_MULTIPLIER
    return
  }
  sim.popped += 1
  if (judgment === 'perfect') sim.perfects += 1
  sim.multiplier = Math.min(
    MAX_MULTIPLIER,
    Math.max(MIN_MULTIPLIER, sim.multiplier + MULTIPLIER_CHANGE[judgment]),
  )
}

function takeSnapshot(sim: Sim): Snapshot {
  return {
    balloons: sim.balloons.map((balloon) => ({ ...balloon })),
    score: Math.round(sim.score),
    multiplier: sim.multiplier,
    spawned: sim.spawned,
  }
}

const BALLOON_SIZE = 'h-[5.5rem] w-[4.5rem] sm:h-28 sm:w-24'

interface BalloonShapeProps {
  colorClass: string
  // Animated approach ring (real rounds) or a fixed-size ring (start-screen preview).
  approachMs?: number
  staticRingScale?: number
  label?: string
  // Receives the pointer event's timestamp (same clock as performance.now()).
  onPop?: (timeStamp: number) => void
}

function BalloonShape({ colorClass, approachMs, staticRingScale, label, onPop }: BalloonShapeProps) {
  return (
    <button
      type="button"
      aria-label={label}
      tabIndex={onPop ? 0 : -1}
      onPointerDown={onPop && ((event) => onPop(event.timeStamp))}
      className={`relative block rounded-[50%_50%_50%_50%/58%_58%_42%_42%] ${BALLOON_SIZE} ${colorClass} ${
        onPop ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <span className="absolute top-[18%] left-[22%] h-[22%] w-[18%] rounded-full bg-cream/40" />
      <span
        className={`pointer-events-none absolute inset-0 rounded-[50%_50%_50%_50%/58%_58%_42%_42%] border-4 border-cream ${
          approachMs !== undefined ? 'ring-shrink' : ''
        }`}
        style={
          approachMs !== undefined
            ? { animationDuration: `${approachMs}ms` }
            : { transform: `scale(${staticRingScale ?? 1})` }
        }
      />
    </button>
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
  const [view, setView] = useState<Snapshot>({
    balloons: [],
    score: 0,
    multiplier: MIN_MULTIPLIER,
    spawned: 0,
  })

  useEffect(() => {
    const start = performance.now()
    const sim: Sim = {
      balloons: [],
      spawned: 0,
      nextSpawnAt: start + 700,
      score: 0,
      multiplier: MIN_MULTIPLIER,
      popped: 0,
      perfects: 0,
      finishAt: null,
    }
    simRef.current = sim

    const id = window.setInterval(() => {
      const now = performance.now()

      sim.balloons.forEach((balloon) => {
        if (balloon.judgment === null && now > balloon.hitAt + LATE_WINDOW_MS) {
          resolve(sim, balloon, 'miss', now)
        }
      })

      if (sim.spawned < BALLOON_COUNT && now >= sim.nextSpawnAt) {
        const progress = sim.spawned / (BALLOON_COUNT - 1)
        const approachMs = lerp(APPROACH_START_MS, APPROACH_END_MS, progress)
        const { x, y } = pickPosition(sim.balloons)
        sim.balloons.push({
          id: sim.spawned,
          x,
          y,
          color: sim.spawned % BALLOON_COLORS.length,
          approachMs,
          hitAt: now + approachMs,
          judgment: null,
          removeAt: 0,
        })
        sim.spawned += 1
        sim.nextSpawnAt = now + lerp(SPAWN_GAP_START_MS, SPAWN_GAP_END_MS, progress)
      }

      sim.balloons = sim.balloons.filter(
        (balloon) => balloon.judgment === null || now < balloon.removeAt,
      )

      setView(takeSnapshot(sim))

      const allDone = sim.spawned === BALLOON_COUNT && sim.balloons.every((b) => b.judgment !== null)
      if (allDone && sim.finishAt === null) sim.finishAt = now + FINISH_DELAY_MS
      if (sim.finishAt !== null && now >= sim.finishAt) {
        window.clearInterval(id)
        const score = Math.round(sim.score)
        finishRef.current({
          // A round with no points isn't worth a leaderboard entry.
          score: score > 0 ? score : null,
          summary: (
            <div className="flex flex-col items-center gap-2">
              <p className="text-3xl font-bold text-brand">{t('balloonPop.result', { value: score })}</p>
              <p className="text-cream/70">
                {t('balloonPop.details', {
                  popped: sim.popped,
                  total: BALLOON_COUNT,
                  perfect: sim.perfects,
                })}
              </p>
            </div>
          ),
        })
      }
    }, TICK_MS)

    return () => window.clearInterval(id)
  }, [t])

  function handlePop(balloonId: number, now: number) {
    const sim = simRef.current
    const balloon = sim?.balloons.find((b) => b.id === balloonId)
    if (!sim || !balloon || balloon.judgment !== null) return

    resolve(sim, balloon, judge(now - balloon.hitAt), now)
    setView(takeSnapshot(sim))
  }

  return (
    <div className="relative flex-1 overflow-hidden bg-ink text-cream select-none">
      <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center gap-6 text-lg font-semibold">
        <span>{t('balloonPop.score', { value: view.score })}</span>
        <span>{t('balloonPop.progress', { current: view.spawned, total: BALLOON_COUNT })}</span>
        {view.multiplier > MIN_MULTIPLIER && (
          <span className="text-sun">
            {t('balloonPop.multiplier', { value: view.multiplier.toFixed(2).replace(/\.?0+$/, '') })}
          </span>
        )}
      </div>

      {view.balloons.map((balloon) => (
        <div
          key={balloon.id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${balloon.x}%`, top: `${balloon.y}%` }}
        >
          {balloon.judgment === null ? (
            <BalloonShape
              colorClass={BALLOON_COLORS[balloon.color]}
              approachMs={balloon.approachMs}
              label={t('balloonPop.balloon')}
              onPop={(now) => handlePop(balloon.id, now)}
            />
          ) : (
            <p className={`text-2xl font-bold ${JUDGMENT_COLOR[balloon.judgment]}`}>
              {t(`balloonPop.judgment.${balloon.judgment}`)}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// Start-screen preview: same HUD and play field as a round, with a few
// balloons at different points of their approach.
const PREVIEW_BALLOONS = [
  { x: 28, y: 42, color: 0, ring: 2.2 },
  { x: 68, y: 58, color: 2, ring: 1.6 },
  { x: 46, y: 76, color: 3, ring: 1.15 },
]

function Preview() {
  const { t } = useTranslation()
  return (
    <div className="relative flex-1 overflow-hidden bg-ink text-cream">
      <div className="absolute inset-x-0 top-4 flex justify-center gap-6 text-lg font-semibold">
        <span>{t('balloonPop.score', { value: 0 })}</span>
        <span>{t('balloonPop.progress', { current: 0, total: BALLOON_COUNT })}</span>
      </div>

      {PREVIEW_BALLOONS.map((balloon) => (
        <div
          key={balloon.x}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${balloon.x}%`, top: `${balloon.y}%` }}
        >
          <BalloonShape colorClass={BALLOON_COLORS[balloon.color]} staticRingScale={balloon.ring} />
        </div>
      ))}
    </div>
  )
}

export function BalloonPopGame() {
  return (
    <GameShell gameId={GAME_ID} preview={<Preview />}>
      {(api) => <Round {...api} />}
    </GameShell>
  )
}
