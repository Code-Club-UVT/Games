import { useCallback, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { getGameById } from '../../data/games'
import { useAuth } from '../../context/useAuth'
import { getGameLeaderboard } from '../../services/api/leaderboardApi'
import { submitResult } from '../../services/api/resultsApi'
import { GameOverModal, type SubmitStatus } from './GameOverModal'
import { computeStanding, type Standing } from './standing'

// What a game reports when a round ends. `score: null` means the round has no
// leaderboard-eligible score (e.g. a jump start) and nothing is submitted.
export interface GameOutcome {
  score: number | null
  summary: ReactNode
}

export interface GameShellApi {
  finish: (outcome: GameOutcome) => void
}

interface GameShellProps {
  gameId: string
  // The board as it looks at the start of a round, laid out exactly like the
  // real round (same size and position) so starting doesn't make it jump. It
  // is shown behind the "tap anywhere" hint and ignores pointer input.
  preview: ReactNode
  // Rendered while a round is in progress and kept on screen, in its final
  // state, behind the game-over modal. Remounted on every new round, so games
  // can keep their round state in plain component state.
  children: (api: GameShellApi) => ReactNode
}

type Phase = 'ready' | 'playing' | 'over'

interface Report {
  round: number
  status: SubmitStatus
  standing: Standing | null
}

export function GameShell({ gameId, preview, children }: GameShellProps) {
  const { t } = useTranslation()
  const { username } = useAuth()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('ready')
  const [round, setRound] = useState(0)
  const [outcome, setOutcome] = useState<GameOutcome | null>(null)
  // Tagged with the round it belongs to, so a slow response that arrives after
  // the player has started another round is dropped instead of shown.
  const [report, setReport] = useState<Report | null>(null)

  const startRound = useCallback(() => {
    setOutcome(null)
    setReport(null)
    setRound((current) => current + 1)
    setPhase('playing')
  }, [])

  const finish = useCallback(
    (result: GameOutcome) => {
      if (phase !== 'playing') return
      setOutcome(result)
      setPhase('over')

      if (result.score === null || !username) return
      const { score } = result

      function updateReport(changes: Partial<Report>) {
        setReport((current) => (current?.round === round ? { ...current, ...changes } : current))
      }

      setReport({ round, status: 'saving', standing: null })
      submitResult({ gameId, playerId: username, score }).then(
        () => {
          updateReport({ status: 'saved' })
          // Where the score landed is a nicety — if this fetch fails, just skip it.
          getGameLeaderboard(gameId)
            .then((entries) => {
              const sortOrder = getGameById(gameId)?.sortOrder
              if (!sortOrder) return
              updateReport({ standing: computeStanding(entries, username, score, sortOrder) })
            })
            .catch(() => {})
        },
        () => updateReport({ status: 'error' }),
      )
    },
    [phase, round, gameId, username],
  )

  if (phase === 'ready') {
    return (
      <div
        onPointerDown={startRound}
        className="relative flex flex-1 cursor-pointer flex-col bg-ink text-center select-none"
      >
        <div className="pointer-events-none flex flex-1 flex-col opacity-60">{preview}</div>
        <p className="pointer-events-none absolute inset-x-0 bottom-6 mx-auto w-fit max-w-[90%] animate-pulse rounded-full bg-ink/85 px-6 py-3 text-xl font-medium text-cream ring-1 ring-cream/30">
          {t('gameShell.tapToStart')}
        </p>
      </div>
    )
  }

  return (
    <>
      <div key={round} className="flex flex-1 flex-col">
        {children({ finish })}
      </div>

      {phase === 'over' && outcome && (
        <GameOverModal
          summary={outcome.summary}
          hasScore={outcome.score !== null}
          submitStatus={report?.status ?? 'idle'}
          standing={report?.standing ?? null}
          onBack={() => navigate(`/games/${gameId}`)}
          onPlayAgain={startRound}
        />
      )}
    </>
  )
}
