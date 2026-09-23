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

export interface CombinedLeaderboardEntry {
  rank: number
  playerId: string
  points: number
  gamesPlayed: number
}
