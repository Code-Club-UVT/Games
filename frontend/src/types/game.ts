export type SortOrder = 'asc' | 'desc'

export interface Game {
  id: string
  // 'asc' = lower score is better (e.g. reaction time), 'desc' = higher is better.
  // Mirrors the backend's game config, which sorts the leaderboards.
  sortOrder: SortOrder
}

export interface GameResult {
  gameId: string
  score: number
  timestamp: number
  playerId: string
}

export interface LeaderboardEntry {
  rank: number
  playerId: string
  score: number
}

export interface ResultEvent {
  gameId: string
  playerId: string
  score: number
  timestamp: number
}
