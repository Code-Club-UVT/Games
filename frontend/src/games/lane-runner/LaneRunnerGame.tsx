import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GameShell, type GameShellApi } from '../shell/GameShell'
import { Car } from './Cars'
import { CAR_MODELS, type CarModel } from './carModels'

const GAME_ID = 'lane-swipe-runner'

const LANES = 3
const START_SPEED = 14 // metres per second
const MAX_SPEED = 38
const ACCELERATION = 0.45 // metres per second, every second
const FIELD_METRES = 28 // how much road is visible from top to bottom
const CAR_WIDTH = 0.62 // of a lane; the height is twice the width
const HIT_LANE_DISTANCE = 0.6 // how close (in lanes) the cars must be sideways to collide
const HIT_LENGTH = 0.8 // how much of a car's length must overlap to collide
const LANE_EASING = 14 // how fast the player's car slides between lanes
const SWIPE_PX = 28 // horizontal drag needed to change lane
const CRASH_MS = 700

// The gap between two rows of traffic grows with speed, so there is always time
// to react, and one lane in every row is left free.
const MIN_GAP_SECONDS = 1.05
const EXTRA_GAP_SECONDS = 0.9
const GAP_PADDING_METRES = 5
const FIRST_ROW_METRES = 12
// Odds that each of the two non-free lanes holds a car; rises the further you drive.
const START_TRAFFIC = 0.4
const TRAFFIC_PER_KM = 0.35
const MAX_TRAFFIC = 0.95

const TRAFFIC_COLORS = [
  'text-cherry',
  'text-azure',
  'text-sun',
  'text-tangerine',
  'text-bubblegum',
  'text-mint',
  'text-butter',
]

const KEY_LANE_CHANGE: Record<string, -1 | 1> = {
  ArrowLeft: -1,
  KeyA: -1,
  ArrowRight: 1,
  KeyD: 1,
}

interface Traffic {
  id: number
  lane: number
  ahead: number // metres between this car's front and the player's front (positive = further up the road)
  model: CarModel
  color: string
}

interface Dimensions {
  width: number
  height: number
}

interface Sim {
  distance: number
  elapsed: number
  x: number // the player's lane, as a fractional position while sliding
  target: number
  cars: Traffic[]
  untilNextRow: number
  nextId: number
  crashed: boolean
}

interface View {
  distance: number
  speed: number
  x: number
  cars: Traffic[]
  crashed: boolean
}

function speedAt(elapsed: number) {
  return Math.min(MAX_SPEED, START_SPEED + elapsed * ACCELERATION)
}

function pick<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)]
}

function spawnRow(sim: Sim, aheadOfPlayer: number) {
  const freeLane = Math.floor(Math.random() * LANES)
  const chance = Math.min(MAX_TRAFFIC, START_TRAFFIC + (sim.distance / 1000) * TRAFFIC_PER_KM)
  for (let lane = 0; lane < LANES; lane++) {
    if (lane === freeLane || Math.random() > chance) continue
    sim.cars.push({
      id: sim.nextId++,
      lane,
      ahead: aheadOfPlayer,
      model: pick(CAR_MODELS),
      color: pick(TRAFFIC_COLORS),
    })
  }
}

// The road: a dark strip with dashed lane lines that scroll with the distance driven.
function Road({
  width,
  height,
  distance,
  children,
}: {
  width: number
  height: number
  distance: number
  children?: React.ReactNode
}) {
  const metresToPx = height / FIELD_METRES
  const dash = 3 * metresToPx
  const offset = (distance * metresToPx) % (dash * 2)
  return (
    <div className="relative overflow-hidden bg-dusk" style={{ width, height }}>
      {Array.from({ length: LANES - 1 }, (_, index) => (
        <div
          key={index}
          className="absolute top-0 h-full w-1"
          style={{
            left: `${((index + 1) / LANES) * 100}%`,
            transform: 'translateX(-50%)',
            backgroundImage: `repeating-linear-gradient(to bottom, #f7f3ed 0, #f7f3ed ${dash}px, transparent ${dash}px, transparent ${dash * 2}px)`,
            backgroundPositionY: offset,
          }}
        />
      ))}
      {children}
    </div>
  )
}

function Round({ finish }: GameShellApi) {
  const { t } = useTranslation()
  const fieldRef = useRef<HTMLDivElement>(null)
  const finishRef = useRef(finish)
  useEffect(() => {
    finishRef.current = finish
  }, [finish])

  const [initialSim] = useState<Sim>(() => ({
    distance: 0,
    elapsed: 0,
    x: Math.floor(LANES / 2),
    target: Math.floor(LANES / 2),
    cars: [],
    untilNextRow: FIRST_ROW_METRES,
    nextId: 0,
    crashed: false,
  }))
  const simRef = useRef(initialSim)
  const [size, setSize] = useState<Dimensions>({ width: 384, height: 700 })
  const sizeRef = useRef(size)
  const [view, setView] = useState<View>({
    distance: 0,
    speed: START_SPEED,
    x: initialSim.x,
    cars: [],
    crashed: false,
  })
  const swipeStartX = useRef<number | null>(null)

  useEffect(() => {
    const field = fieldRef.current
    if (!field) return
    const observer = new ResizeObserver(() => {
      const next = { width: field.clientWidth, height: field.clientHeight }
      sizeRef.current = next
      setSize(next)
    })
    observer.observe(field)
    return () => observer.disconnect()
  }, [])

  function changeLane(direction: -1 | 1) {
    const sim = simRef.current
    if (sim.crashed) return
    sim.target = Math.max(0, Math.min(LANES - 1, sim.target + direction))
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const direction = KEY_LANE_CHANGE[event.code]
      if (direction === undefined) return
      event.preventDefault()
      if (!event.repeat) changeLane(direction)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    let frame = 0
    let last: number | null = null
    let crashTimer = 0

    function tick(now: number) {
      const sim = simRef.current
      const dt = last === null ? 0 : Math.min(0.05, (now - last) / 1000)
      last = now

      if (!sim.crashed) {
        const { width, height } = sizeRef.current
        const carHeight = ((width / LANES) * CAR_WIDTH) * 2
        const metresPerPx = FIELD_METRES / height
        const carLength = carHeight * metresPerPx
        const playerTop = height - carHeight - height * 0.06
        const speed = speedAt(sim.elapsed)
        const travelled = speed * dt

        sim.elapsed += dt
        sim.distance += travelled
        sim.x += (sim.target - sim.x) * Math.min(1, dt * LANE_EASING)

        sim.untilNextRow -= travelled
        if (sim.untilNextRow <= 0) {
          // Just above the top edge of the screen.
          spawnRow(sim, (playerTop + carHeight) * metresPerPx)
          sim.untilNextRow =
            speed * (MIN_GAP_SECONDS + Math.random() * EXTRA_GAP_SECONDS) + GAP_PADDING_METRES
        }

        const offScreen = -(height - playerTop) * metresPerPx
        sim.cars = sim.cars.filter((car) => car.ahead > offScreen)
        for (const car of sim.cars) {
          car.ahead -= travelled
          if (
            Math.abs(car.lane - sim.x) < HIT_LANE_DISTANCE &&
            Math.abs(car.ahead) < carLength * HIT_LENGTH
          ) {
            sim.crashed = true
          }
        }

        if (sim.crashed) {
          const score = Math.floor(sim.distance)
          crashTimer = window.setTimeout(() => {
            finishRef.current({
              score: score > 0 ? score : null,
              summary: (
                <p className="text-3xl font-bold text-brand">
                  {t('laneRunner.result', { value: score })}
                </p>
              ),
            })
          }, CRASH_MS)
        }
      }

      setView({
        distance: sim.distance,
        speed: speedAt(sim.elapsed),
        x: sim.x,
        cars: [...sim.cars],
        crashed: sim.crashed,
      })
      if (sim.crashed) return
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(crashTimer)
    }
  }, [t])

  const laneWidth = size.width / LANES
  const carWidth = laneWidth * CAR_WIDTH
  const carHeight = carWidth * 2
  const playerTop = size.height - carHeight - size.height * 0.06
  const pxPerMetre = size.height / FIELD_METRES
  const carLeft = (lane: number) => lane * laneWidth + (laneWidth - carWidth) / 2

  return (
    <div
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        swipeStartX.current = event.clientX
      }}
      onPointerMove={(event) => {
        if (swipeStartX.current === null) return
        const dx = event.clientX - swipeStartX.current
        if (Math.abs(dx) < SWIPE_PX) return
        changeLane(dx > 0 ? 1 : -1)
        // Restart from here, so one long drag can change several lanes.
        swipeStartX.current = event.clientX
      }}
      onPointerUp={() => (swipeStartX.current = null)}
      onPointerCancel={() => (swipeStartX.current = null)}
      className="relative flex flex-1 touch-none flex-col items-center justify-center gap-3 bg-ink text-cream select-none"
    >
      <div className="flex gap-8 text-lg font-semibold">
        <span>{t('laneRunner.distance', { value: Math.floor(view.distance) })}</span>
        <span>{t('laneRunner.speed', { value: Math.round(view.speed * 3.6) })}</span>
      </div>

      <div ref={fieldRef} className="h-[78svh] w-[min(92vw,24rem)] cursor-grab active:cursor-grabbing">
        <Road width={size.width} height={size.height} distance={view.distance}>
          {view.cars.map((car) => (
            <Car
              key={car.id}
              model={car.model}
              className={`absolute ${car.color}`}
              style={{
                width: carWidth,
                height: carHeight,
                left: carLeft(car.lane),
                top: playerTop - car.ahead * pxPerMetre,
              }}
            />
          ))}
          <Car
            model="sport"
            className={`absolute text-brand ${view.crashed ? 'car-crash' : ''}`}
            style={{
              width: carWidth,
              height: carHeight,
              left: carLeft(0) + view.x * laneWidth,
              top: playerTop,
            }}
          />
        </Road>
      </div>
    </div>
  )
}

// Static preview for the start screen: a short stretch of road with a few cars.
function RoadPreview() {
  const width = 200
  const height = 260
  const laneWidth = width / LANES
  const carWidth = laneWidth * CAR_WIDTH
  const carHeight = carWidth * 2
  const cars: { lane: number; top: number; model: CarModel; color: string }[] = [
    { lane: 0, top: 24, model: 'truck', color: 'text-cherry' },
    { lane: 2, top: 70, model: 'van', color: 'text-azure' },
    { lane: 0, top: 150, model: 'hatch', color: 'text-sun' },
  ]
  return (
    <div className="overflow-hidden rounded-lg border-4 border-dusk">
      <Road width={width} height={height} distance={0}>
        {cars.map((car) => (
          <Car
            key={car.top}
            model={car.model}
            className={`absolute ${car.color}`}
            style={{
              width: carWidth,
              height: carHeight,
              left: car.lane * laneWidth + (laneWidth - carWidth) / 2,
              top: car.top,
            }}
          />
        ))}
        <Car
          model="sport"
          className="absolute text-brand"
          style={{
            width: carWidth,
            height: carHeight,
            left: laneWidth + (laneWidth - carWidth) / 2,
            top: height - carHeight - 14,
          }}
        />
      </Road>
    </div>
  )
}

export function LaneRunnerGame() {
  return (
    <GameShell gameId={GAME_ID} visual={<RoadPreview />}>
      {(api) => <Round {...api} />}
    </GameShell>
  )
}
