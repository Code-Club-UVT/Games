export type SortOrder = 'asc' | 'desc'

interface GameConfig {
  id: string
  // 'asc' = lower score is better (e.g. reaction time in ms), 'desc' = higher is better.
  sortOrder: SortOrder
}

// Mirrors the game catalog in frontend/src/data/games.ts. Kept separate (and
// deliberately minimal — just what the backend needs to validate submissions
// and sort leaderboards) since frontend and backend are independent apps.
export const games: GameConfig[] = [
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

const gamesById = new Map(games.map((game) => [game.id, game]))

export function getGameConfig(gameId: string): GameConfig | undefined {
  return gamesById.get(gameId)
}
