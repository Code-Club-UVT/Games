import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GameShell, type GameShellApi } from '../shell/GameShell'

const GAME_ID = 'simon-says-colors'
const PAD_COUNT = 4
const PRESS_FLASH_MS = 200
const PAUSE_BEFORE_PLAYBACK_MS = 700

// Each pad's classes are written out in full so Tailwind can see them.
const PADS = [
  { dim: 'bg-cherry/35', lit: 'bg-cherry shadow-[0_0_40px_10px_rgba(218,49,95,0.6)]' },
  { dim: 'bg-brand/35', lit: 'bg-brand shadow-[0_0_40px_10px_rgba(65,182,83,0.6)]' },
  { dim: 'bg-azure/35', lit: 'bg-azure shadow-[0_0_40px_10px_rgba(49,169,224,0.6)]' },
  { dim: 'bg-sun/35', lit: 'bg-sun shadow-[0_0_40px_10px_rgba(254,223,0,0.6)]' },
]

type Phase = 'showing' | 'input'

function randomPad() {
  return Math.floor(Math.random() * PAD_COUNT)
}

// The sequence has no cap: every correct repeat adds one more step, so the
// score (rounds completed) is unbounded. Playback speeds up gradually, down to a floor.
function stepDurations(length: number) {
  const step = Math.max(350, 750 - length * 15)
  return { step, lit: Math.round(step * 0.6) }
}

interface PadGridProps {
  litPad: number | null
  interactive: boolean
  onPress?: (pad: number) => void
}

function PadGrid({ litPad, interactive, onPress }: PadGridProps) {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6">
      {PADS.map((style, pad) => (
        <button
          key={pad}
          type="button"
          aria-label={t('simonSays.pad', { value: pad + 1 })}
          tabIndex={onPress ? 0 : -1}
          onPointerDown={() => onPress?.(pad)}
          className={`h-32 w-32 rounded-2xl transition-colors duration-100 sm:h-44 sm:w-44 ${
            litPad === pad ? style.lit : style.dim
          } ${interactive ? 'cursor-pointer hover:brightness-125 active:scale-95' : 'cursor-default'}`}
        />
      ))}
    </div>
  )
}

function Round({ finish }: GameShellApi) {
  const { t } = useTranslation()
  const [sequence, setSequence] = useState<number[]>(() => [randomPad()])
  const [phase, setPhase] = useState<Phase>('showing')
  const [litPad, setLitPad] = useState<number | null>(null)
  const [inputIndex, setInputIndex] = useState(0)

  const rounds = sequence.length - 1

  useEffect(() => {
    const { step, lit } = stepDurations(sequence.length)
    const timeouts: number[] = []
    sequence.forEach((pad, i) => {
      const at = PAUSE_BEFORE_PLAYBACK_MS + i * step
      timeouts.push(window.setTimeout(() => setLitPad(pad), at))
      timeouts.push(window.setTimeout(() => setLitPad(null), at + lit))
    })
    timeouts.push(
      window.setTimeout(() => setPhase('input'), PAUSE_BEFORE_PLAYBACK_MS + sequence.length * step),
    )
    return () => timeouts.forEach((id) => window.clearTimeout(id))
  }, [sequence])

  function handlePadPress(pad: number) {
    if (phase !== 'input') return

    setLitPad(pad)
    window.setTimeout(() => setLitPad(null), PRESS_FLASH_MS)

    if (pad !== sequence[inputIndex]) {
      finish({
        // A score of 0 rounds isn't worth a leaderboard entry.
        score: rounds > 0 ? rounds : null,
        summary: (
          <p className="text-3xl font-bold text-brand">
            {t('simonSays.roundsResult', { value: rounds })}
          </p>
        ),
      })
      return
    }

    if (inputIndex + 1 === sequence.length) {
      setInputIndex(0)
      setPhase('showing')
      setSequence([...sequence, randomPad()])
    } else {
      setInputIndex(inputIndex + 1)
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-ink text-cream select-none">
      <p className="text-xl font-semibold text-cream">
        {t('simonSays.round', { value: sequence.length })}
      </p>

      <PadGrid litPad={litPad} interactive={phase === 'input'} onPress={handlePadPress} />

      <p className="h-6 text-lg text-cream/70">
        {phase === 'showing' ? t('simonSays.watch') : t('simonSays.yourTurn')}
      </p>
    </div>
  )
}

function Preview() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-ink text-cream">
      <p className="text-xl font-semibold text-cream">{t('simonSays.round', { value: 1 })}</p>
      <PadGrid litPad={null} interactive={false} />
      <p className="h-6 text-lg text-cream/70">{t('simonSays.watch')}</p>
    </div>
  )
}

export function SimonSaysGame() {
  return (
    <GameShell gameId={GAME_ID} preview={<Preview />}>
      {(api) => <Round {...api} />}
    </GameShell>
  )
}
