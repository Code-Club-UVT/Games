import { db } from '../db.js'
import { games, type SortOrder } from '../games.js'
import type { LeaderboardEntry } from '../types.js'

const insertResult = db.prepare(
  'INSERT INTO results (game_id, user_id, score, created_at) VALUES (?, ?, ?, ?)',
)

export function insertGameResult(gameId: string, userId: number, score: number): void {
  insertResult.run(gameId, userId, score, Date.now())
}

interface BestScoreRow {
  playerId: string
  score: number
}

function bestScoresForGame(gameId: string, sortOrder: SortOrder): BestScoreRow[] {
  const aggregate = sortOrder === 'asc' ? 'MIN' : 'MAX'
  const rows = db
    .prepare(
      `SELECT u.username AS playerId, ${aggregate}(r.score) AS score
       FROM results r
       JOIN users u ON u.id = r.user_id
       WHERE r.game_id = ?
       GROUP BY r.user_id
       ORDER BY score ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`,
    )
    .all(gameId) as unknown as BestScoreRow[]
  return rows
}

// Each player's personal best for the game, ranked. `limit` caps how many
// rows come back (leaderboard display), but ranking always starts from rank 1.
export function getLeaderboard(
  gameId: string,
  sortOrder: SortOrder,
  limit = 20,
): LeaderboardEntry[] {
  return bestScoresForGame(gameId, sortOrder)
    .slice(0, limit)
    .map((row, index) => ({ rank: index + 1, playerId: row.playerId, score: row.score }))
}

// Provisional combined leaderboard: each player earns rank-based points per
// game they've placed in (1st = 100, -10 per rank, floor 0), summed across
// every game. This stands in until the real reward-tier logic from the spec
// is designed.
export function getCombinedLeaderboard(limit = 20) {
  const totals = new Map<string, { points: number; gamesPlayed: number }>()

  for (const game of games) {
    const ranked = bestScoresForGame(game.id, game.sortOrder)
    ranked.forEach((row, index) => {
      const points = Math.max(0, 100 - index * 10)
      const current = totals.get(row.playerId) ?? { points: 0, gamesPlayed: 0 }
      totals.set(row.playerId, {
        points: current.points + points,
        gamesPlayed: current.gamesPlayed + 1,
      })
    })
  }

  return [...totals.entries()]
    .sort(([, a], [, b]) => b.points - a.points)
    .slice(0, limit)
    .map(([playerId, totalsForPlayer], index) => ({
      rank: index + 1,
      playerId,
      points: totalsForPlayer.points,
      gamesPlayed: totalsForPlayer.gamesPlayed,
    }))
}
