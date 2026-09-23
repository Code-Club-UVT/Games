import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GameShell, type GameShellApi } from '../shell/GameShell'
import { LightRow } from './LightRow'

const GAME_ID = 'f1-lights-out'
const LIGHT_COUNT = 5
const LIGHT_INTERVAL_MS = 1000
const MIN_DELAY_MS = 1000
const MAX_DELAY_MS = 3000

type Phase = 'active' | 'go'

function Round({ finish }: GameShellApi) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<Phase>('active')
  const [litCount, setLitCount] = useState(0)

  const timeoutsRef = useRef<number[]>([])
  const lightsOutAtRef = useRef<number | null>(null)

  function clearTimers() {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id))
    timeoutsRef.current = []
  }

  useEffect(() => {
    for (let i = 1; i <= LIGHT_COUNT; i++) {
      const id = window.setTimeout(() => {
        setLitCount(i)
        if (i === LIGHT_COUNT) {
          const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS)
          const goId = window.setTimeout(() => {
            lightsOutAtRef.current = performance.now()
            setLitCount(0)
            setPhase('go')
          }, delay)
          timeoutsRef.current.push(goId)
        }
      }, i * LIGHT_INTERVAL_MS)
      timeoutsRef.current.push(id)
    }
    return clearTimers
  }, [])

  function handleTap() {
    if (phase === 'active') {
      clearTimers()
      finish({
        score: null,
        summary: <p className="text-2xl font-bold text-cherry">{t('f1LightsOut.jumpStart')}</p>,
      })
      return
    }

    const reaction = Math.round(performance.now() - (lightsOutAtRef.current ?? performance.now()))
    finish({
      score: reaction,
      summary: (
        <p className="text-3xl font-bold text-brand">
          {t('f1LightsOut.reactionTime', { value: reaction })}
        </p>
      ),
    })
  }

  return (
    <div
      onPointerDown={handleTap}
      className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-10 bg-ink text-center text-cream select-none"
    >
      <LightRow litCount={litCount} total={LIGHT_COUNT} />

      {phase === 'active' ? (
        <p className="text-lg text-cream/60">{t('f1LightsOut.wait')}</p>
      ) : (
        <p className="text-xl font-semibold text-cream">{t('f1LightsOut.go')}</p>
      )}
    </div>
  )
}

function Preview() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 bg-ink text-center text-cream">
      <LightRow litCount={0} total={LIGHT_COUNT} />
      <p className="text-lg text-cream/60">{t('f1LightsOut.wait')}</p>
    </div>
  )
}

export function F1LightsOutGame() {
  return (
    <GameShell gameId={GAME_ID} preview={<Preview />}>
      {(api) => <Round {...api} />}
    </GameShell>
  )
}
