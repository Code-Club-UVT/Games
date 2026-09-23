import { memo, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GameShell, type GameShellApi } from '../shell/GameShell'
import { generateMaze, type Maze } from './maze'

const GAME_ID = 'maze-ball-drag'

// Distances are in maze tiles; speeds in tiles per second.
const BALL_RADIUS = 0.3
const MAX_SPEED = 7
const FOLLOW_GAIN = 12 // how strongly the ball is pulled toward the pointer
const SAFE_DISTANCE = 2.5 // after a fall the ball reappears at the last spot this far from any hole
const MAX_STEP = 0.05 // movement is split into steps this small so it can't skip through a wall
const TRAP_RADIUS = 0.4 // how close to a hole's centre the ball has to be to fall in
const EXIT_RADIUS = 0.45
const FALL_MS = 450
const TRAP_PENALTY_MS = 3000
const COIN_RADIUS = 0.5

// Combined score (higher is better): every second costs points and every coin
// earns some, so a detour for a coin only pays off if it takes under ~5 seconds.
const BASE_SCORE = 1500
const SECOND_PENALTY = 20
const COIN_POINTS = 100

function computeScore(elapsedMs: number, coins: number) {
  return Math.max(0, Math.round(BASE_SCORE - (elapsedMs / 1000) * SECOND_PENALTY + coins * COIN_POINTS))
}

const KEY_DIRECTIONS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
}

const BOARD_SIZE = 'w-[min(92vw,76svh)]'

interface Ball {
  x: number
  y: number
}

function startBall(maze: Maze): Ball {
  return { x: maze.start.col + 0.5, y: maze.start.row + 0.5 }
}

function hitsWall(maze: Maze, x: number, y: number) {
  const minCol = Math.floor(x - BALL_RADIUS)
  const maxCol = Math.floor(x + BALL_RADIUS)
  const minRow = Math.floor(y - BALL_RADIUS)
  const maxRow = Math.floor(y + BALL_RADIUS)
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      if (maze.tiles[row]?.[col] !== 'wall') continue
      // Circle against the wall tile's square.
      const nearestX = Math.max(col, Math.min(x, col + 1))
      const nearestY = Math.max(row, Math.min(y, row + 1))
      const dx = x - nearestX
      const dy = y - nearestY
      if (dx * dx + dy * dy < BALL_RADIUS * BALL_RADIUS) return true
    }
  }
  return false
}

// Moves the ball by (dx, dy), stopping at walls but sliding along them.
function moveBall(maze: Maze, ball: Ball, dx: number, dy: number) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / MAX_STEP))
  const stepX = dx / steps
  const stepY = dy / steps
  for (let i = 0; i < steps; i++) {
    if (!hitsWall(maze, ball.x + stepX, ball.y)) ball.x += stepX
    if (!hitsWall(maze, ball.x, ball.y + stepY)) ball.y += stepY
  }
}

const tileColors = {
  wall: 'bg-iris',
  floor: 'bg-cream',
  trap: 'bg-ink',
}

// The maze itself never changes during a round, so it is rendered once.
const MazeBoard = memo(function MazeBoard({ maze }: { maze: Maze }) {
  return (
    <div
      className="grid h-full w-full"
      style={{ gridTemplateColumns: `repeat(${maze.size}, 1fr)` }}
    >
      {maze.tiles.flatMap((row, r) =>
        row.map((tile, c) => {
          const isStart = c === maze.start.col && r === maze.start.row
          const isExit = c === maze.exit.col && r === maze.exit.row
          return (
            <div
              key={`${r}-${c}`}
              className={`flex items-center justify-center ${
                isExit ? 'bg-brand' : isStart ? 'bg-butter' : tileColors[tile]
              }`}
            >
              {tile === 'trap' && (
                <div className="h-[80%] w-[80%] rounded-full border-2 border-cherry bg-ink" />
              )}
            </div>
          )
        }),
      )}
    </div>
  )
})

function nearTrap(maze: Maze, ball: Ball, distance: number) {
  const reach = Math.ceil(distance)
  for (let r = Math.floor(ball.y) - reach; r <= Math.floor(ball.y) + reach; r++) {
    for (let c = Math.floor(ball.x) - reach; c <= Math.floor(ball.x) + reach; c++) {
      if (maze.tiles[r]?.[c] === 'trap' && Math.hypot(ball.x - (c + 0.5), ball.y - (r + 0.5)) < distance) {
        return true
      }
    }
  }
  return false
}

function coinKey(maze: Maze, col: number, row: number) {
  return row * maze.size + col
}

function CoinsView({ maze, collected }: { maze: Maze; collected: ReadonlySet<number> }) {
  const percent = 100 / maze.size
  return maze.coins.map((coin) =>
    collected.has(coinKey(maze, coin.col, coin.row)) ? null : (
      <div
        key={coinKey(maze, coin.col, coin.row)}
        className="pointer-events-none absolute rounded-full border-2 border-butter bg-sun"
        style={{
          width: `${0.5 * percent}%`,
          height: `${0.5 * percent}%`,
          left: `${(coin.col + 0.25) * percent}%`,
          top: `${(coin.row + 0.25) * percent}%`,
        }}
      />
    ),
  )
}

function BallView({ maze, ball, falling }: { maze: Maze; ball: Ball; falling: boolean }) {
  const percent = 100 / maze.size
  return (
    <div
      className={`pointer-events-none absolute rounded-full bg-cherry shadow-md ${
        falling ? 'ball-fall' : ''
      }`}
      style={{
        width: `${BALL_RADIUS * 2 * percent}%`,
        height: `${BALL_RADIUS * 2 * percent}%`,
        left: `${(ball.x - BALL_RADIUS) * percent}%`,
        top: `${(ball.y - BALL_RADIUS) * percent}%`,
      }}
    />
  )
}

interface Sim {
  ball: Ball
  pointer: Ball | null // where the finger / cursor is, in tile units
  safe: Ball // last position away from every hole
  keys: Set<string>
  startedAt: number | null
  penaltyMs: number
  falls: number
  collected: ReadonlySet<number>
  fallingUntil: number | null
  done: boolean
}

interface View {
  ball: Ball
  falling: boolean
  falls: number
  collected: ReadonlySet<number>
  elapsedMs: number
}

function Round({ finish }: GameShellApi) {
  const { t } = useTranslation()
  const boardRef = useRef<HTMLDivElement>(null)
  const finishRef = useRef(finish)
  useEffect(() => {
    finishRef.current = finish
  }, [finish])

  const [maze] = useState(generateMaze)
  const [initialSim] = useState<Sim>(() => ({
    ball: startBall(maze),
    pointer: null,
    safe: startBall(maze),
    keys: new Set(),
    startedAt: null,
    penaltyMs: 0,
    falls: 0,
    collected: new Set(),
    fallingUntil: null,
    done: false,
  }))
  const simRef = useRef(initialSim)
  const [view, setView] = useState<View>({
    ball: { ...initialSim.ball },
    falling: false,
    falls: 0,
    collected: initialSim.collected,
    elapsedMs: 0,
  })
  const [dragging, setDragging] = useState(false)

  function startClock() {
    const sim = simRef.current
    if (sim.startedAt === null) sim.startedAt = performance.now()
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.code in KEY_DIRECTIONS)) return
      event.preventDefault()
      startClock()
      simRef.current.keys.add(event.code)
    }
    function onKeyUp(event: KeyboardEvent) {
      simRef.current.keys.delete(event.code)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    let frame = 0
    let last: number | null = null

    function tick(now: number) {
      const sim = simRef.current
      if (sim.done) return
      const dt = last === null ? 0 : Math.min(0.05, (now - last) / 1000)
      last = now

      if (sim.fallingUntil !== null) {
        if (now >= sim.fallingUntil) {
          sim.fallingUntil = null
          sim.ball = { ...sim.safe }
        }
      } else {
        // Keys win over the pointer if both are in use.
        let vx = 0
        let vy = 0
        if (sim.keys.size > 0) {
          sim.keys.forEach((code) => {
            vx += KEY_DIRECTIONS[code][0]
            vy += KEY_DIRECTIONS[code][1]
          })
          const length = Math.hypot(vx, vy)
          if (length > 0) {
            vx = (vx / length) * MAX_SPEED
            vy = (vy / length) * MAX_SPEED
          }
        } else if (sim.pointer) {
          const dx = sim.pointer.x - sim.ball.x
          const dy = sim.pointer.y - sim.ball.y
          const distance = Math.hypot(dx, dy)
          if (distance > 0.001) {
            const speed = Math.min(MAX_SPEED, distance * FOLLOW_GAIN)
            vx = (dx / distance) * speed
            vy = (dy / distance) * speed
          }
        }
        moveBall(maze, sim.ball, vx * dt, vy * dt)

        const col = Math.floor(sim.ball.x)
        const row = Math.floor(sim.ball.y)
        if (!nearTrap(maze, sim.ball, SAFE_DISTANCE)) {
          sim.safe = { x: col + 0.5, y: row + 0.5 }
        }
        for (let r = row - 1; r <= row + 1; r++) {
          for (let c = col - 1; c <= col + 1; c++) {
            if (sim.fallingUntil !== null || maze.tiles[r]?.[c] !== 'trap') continue
            if (Math.hypot(sim.ball.x - (c + 0.5), sim.ball.y - (r + 0.5)) < TRAP_RADIUS) {
              sim.ball.x = c + 0.5
              sim.ball.y = r + 0.5
              sim.fallingUntil = now + FALL_MS
              sim.falls++
              sim.penaltyMs += TRAP_PENALTY_MS
            }
          }
        }

        for (const coin of maze.coins) {
          const k = coinKey(maze, coin.col, coin.row)
          if (sim.collected.has(k)) continue
          if (Math.hypot(sim.ball.x - (coin.col + 0.5), sim.ball.y - (coin.row + 0.5)) < COIN_RADIUS) {
            sim.collected = new Set(sim.collected).add(k)
          }
        }

        const toExit = Math.hypot(
          sim.ball.x - (maze.exit.col + 0.5),
          sim.ball.y - (maze.exit.row + 0.5),
        )
        if (toExit < EXIT_RADIUS && sim.startedAt !== null) {
          sim.done = true
          const total = Math.round(now - sim.startedAt + sim.penaltyMs)
          const coins = sim.collected.size
          const score = computeScore(total, coins)
          setView({
            ball: { ...sim.ball },
            falling: false,
            falls: sim.falls,
            collected: sim.collected,
            elapsedMs: total,
          })
          finishRef.current({
            score,
            summary: (
              <div className="flex flex-col items-center gap-2">
                <p className="text-3xl font-bold text-brand">
                  {t('mazeBall.result', { value: score })}
                </p>
                <p className="text-cream/70">
                  {t('mazeBall.details', {
                    seconds: (total / 1000).toFixed(1),
                    coins,
                    totalCoins: maze.coins.length,
                  })}
                </p>
                {sim.falls > 0 && (
                  <p className="text-cream/70">
                    {t('mazeBall.falls', {
                      count: sim.falls,
                      seconds: (sim.penaltyMs / 1000).toFixed(0),
                    })}
                  </p>
                )}
              </div>
            ),
          })
          return
        }
      }

      const elapsedMs = sim.startedAt === null ? 0 : now - sim.startedAt + sim.penaltyMs
      setView({
        ball: { ...sim.ball },
        falling: sim.fallingUntil !== null,
        falls: sim.falls,
        collected: sim.collected,
        elapsedMs,
      })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [t, maze])

  function updatePointer(event: React.PointerEvent) {
    const board = boardRef.current
    if (!board) return
    const rect = board.getBoundingClientRect()
    simRef.current.pointer = {
      x: ((event.clientX - rect.left) / rect.width) * maze.size,
      y: ((event.clientY - rect.top) / rect.height) * maze.size,
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-ink text-cream select-none">
      <div className="flex gap-8 text-lg font-semibold">
        <span>{t('mazeBall.coins', { value: view.collected.size, total: maze.coins.length })}</span>
        <span>{t('mazeBall.time', { value: (view.elapsedMs / 1000).toFixed(1) })}</span>
        {view.falls > 0 && (
          <span className="text-cherry">{t('mazeBall.penalty', { count: view.falls })}</span>
        )}
      </div>

      <div
        ref={boardRef}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          setDragging(true)
          startClock()
          updatePointer(event)
        }}
        onPointerMove={(event) => {
          if (simRef.current.pointer) updatePointer(event)
        }}
        onPointerUp={() => {
          simRef.current.pointer = null
          setDragging(false)
        }}
        onPointerCancel={() => {
          simRef.current.pointer = null
          setDragging(false)
        }}
        className={`relative aspect-square touch-none overflow-hidden rounded-lg border-4 border-iris ${BOARD_SIZE} ${
          dragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <MazeBoard maze={maze} />
        <CoinsView maze={maze} collected={view.collected} />
        <BallView maze={maze} ball={view.ball} falling={view.falling} />
      </div>
    </div>
  )
}

// Static preview for the start / game-over screens: the maze with the ball at the start.
function MazePreview() {
  const [maze] = useState(generateMaze)
  return (
    <div className={`relative aspect-square max-h-[60svh] overflow-hidden rounded-lg border-4 border-iris opacity-80 ${BOARD_SIZE}`}>
      <MazeBoard maze={maze} />
      <CoinsView maze={maze} collected={new Set()} />
      <BallView maze={maze} ball={startBall(maze)} falling={false} />
    </div>
  )
}

export function MazeBallGame() {
  return (
    <GameShell gameId={GAME_ID} visual={<MazePreview />}>
      {(api) => <Round {...api} />}
    </GameShell>
  )
}
