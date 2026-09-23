import type { Game } from '../types/game'

// Titles and descriptions live in the i18n translation files, keyed by id
// (see src/i18n/locales/*.json under "games.<id>.title" / "games.<id>.description").
export const games: Game[] = [
  { id: 'f1-lights-out', sortOrder: 'asc' },
  { id: 'simon-says-colors', sortOrder: 'desc' },
  { id: 'card-flip-matching', sortOrder: 'desc' },
  { id: 'whack-a-mole', sortOrder: 'desc' },
  { id: 'balloon-pop-precision', sortOrder: 'desc' },
  { id: 'stack-the-blocks', sortOrder: 'desc' },
  { id: 'maze-ball-drag', sortOrder: 'desc' },
  { id: 'lane-swipe-runner', sortOrder: 'desc' },
  { id: 'bomb-defusal', sortOrder: 'desc' },
]

export function getGameById(id: string): Game | undefined {
  return games.find((game) => game.id === id)
}
