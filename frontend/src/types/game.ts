export type SortOrder = 'asc' | 'desc'

export interface Game {
  id: string
  // 'asc' = lower score is better (e.g. reaction time), 'desc' = higher is better.
  // Mirrors the backend's game config, which sorts the leaderboards.
  sortOrder: SortOrder
  // Card artwork and how-to-play video, served from /public. Until a file is
  // supplied the UI shows a placeholder instead.
  image?: string
  video?: string
  // Work in progress: shown greyed out on the menu and not playable.
  wip?: boolean
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
