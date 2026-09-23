import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GameShell, type GameShellApi } from '../shell/GameShell'

const GAME_ID = 'card-flip-matching'
const SYMBOLS = ['🐶', '🐱', '🐸', '🦊', '🐼', '🦁', '🐵', '🐙']
const MISMATCH_DELAY_MS = 800
const FINISH_DELAY_MS = 700

// Combined score (higher is better): every move and every second costs points.
// A perfect run (8 moves) in ~15s scores ~800; sloppy play drifts toward 0.
const BASE_SCORE = 1000
const MOVE_PENALTY = 20
const SECOND_PENALTY = 5

function shuffledDeck() {
  const deck = [...SYMBOLS, ...SYMBOLS]
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function computeScore(moves: number, elapsedMs: number) {
  const seconds = elapsedMs / 1000
  return Math.max(0, Math.round(BASE_SCORE - moves * MOVE_PENALTY - seconds * SECOND_PENALTY))
}

interface CardProps {
  symbol: string
  faceUp: boolean
  matched: boolean
  label: string
  // Receives the pointer event's timestamp (ms, same clock as performance.now()).
  onPress?: (timeStamp: number) => void
}

function Card({ symbol, faceUp, matched, label, onPress }: CardProps) {
  return (
    <button
      type="button"
      aria-label={label}
      tabIndex={onPress ? 0 : -1}
      onPointerDown={onPress && ((event) => onPress(event.timeStamp))}
      className={`h-24 w-[4.5rem] [perspective:600px] sm:h-36 sm:w-28 ${
        onPress && !faceUp ? 'cursor-pointer hover:brightness-125' : 'cursor-default'
      }`}
    >
      <div
        className={`relative h-full w-full transition-transform duration-300 [transform-style:preserve-3d] ${
          faceUp ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        <div className="absolute inset-0 rounded-xl border-4 border-cream bg-iris [backface-visibility:hidden]" />
        <div
          className={`absolute inset-0 flex items-center justify-center rounded-xl border-4 text-4xl [backface-visibility:hidden] [transform:rotateY(180deg)] sm:text-6xl ${
            matched ? 'border-brand bg-cream' : 'border-cream bg-cream'
          }`}
        >
          {symbol}
        </div>
      </div>
    </button>
  )
}

function Round({ finish }: GameShellApi) {
  const { t } = useTranslation()
  const [deck] = useState(shuffledDeck)
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    if (startedAt === null) return
    const id = window.setInterval(() => setElapsedMs(performance.now() - startedAt), 200)
    return () => window.clearInterval(id)
  }, [startedAt])

  function handleCardPress(index: number, now: number) {
    if (locked || flipped.includes(index) || matched.includes(index)) return

    const start = startedAt ?? now
    if (startedAt === null) setStartedAt(now)

    if (flipped.length === 0) {
      setFlipped([index])
      return
    }

    const first = flipped[0]
    const nextMoves = moves + 1
    setMoves(nextMoves)
    setFlipped([first, index])
    setLocked(true)

    if (deck[first] === deck[index]) {
      const nextMatched = [...matched, first, index]
      window.setTimeout(() => {
        setMatched(nextMatched)
        setFlipped([])
        setLocked(false)
      }, 300)

      if (nextMatched.length === deck.length) {
        const total = now - start
        setElapsedMs(total)
        window.setTimeout(() => {
          const score = computeScore(nextMoves, total)
          finish({
            score,
            summary: (
              <div className="flex flex-col items-center gap-2">
                <p className="text-3xl font-bold text-brand">
                  {t('cardFlip.score', { value: score })}
                </p>
                <p className="text-cream/70">
                  {t('cardFlip.details', { moves: nextMoves, seconds: (total / 1000).toFixed(1) })}
                </p>
              </div>
            ),
          })
        }, FINISH_DELAY_MS)
      }
    } else {
      window.setTimeout(() => {
        setFlipped([])
        setLocked(false)
      }, MISMATCH_DELAY_MS)
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-ink text-cream select-none">
      <div className="flex gap-8 text-lg font-semibold text-cream">
        <span>{t('cardFlip.moves', { value: moves })}</span>
        <span>{t('cardFlip.time', { value: (elapsedMs / 1000).toFixed(1) })}</span>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        {deck.map((symbol, index) => (
          <Card
            key={index}
            symbol={symbol}
            faceUp={flipped.includes(index) || matched.includes(index)}
            matched={matched.includes(index)}
            label={t('cardFlip.card', { value: index + 1 })}
            onPress={(now) => handleCardPress(index, now)}
          />
        ))}
      </div>
    </div>
  )
}

// Static preview for the start / game-over screens: one matched pair face up
// among face-down cards, so the goal is clear before the first round.
const PREVIEW_PAIR = [1, 6]

function CardBackPreview() {
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4">
      {Array.from({ length: 8 }, (_, index) => {
        const faceUp = PREVIEW_PAIR.includes(index)
        return (
          <Card
            key={index}
            symbol={faceUp ? SYMBOLS[0] : ''}
            faceUp={faceUp}
            matched={faceUp}
            label=""
          />
        )
      })}
    </div>
  )
}

export function CardFlipGame() {
  return (
    <GameShell gameId={GAME_ID} visual={<CardBackPreview />}>
      {(api) => <Round {...api} />}
    </GameShell>
  )
}
