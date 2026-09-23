import type { LeaderboardEntry, SortOrder } from '../../types/game'

const TOP_RANK_LIMIT = 5

// How a finished round compares to the other players' best scores.
export type Standing =
  | { kind: 'first' } // nobody else has a score yet
  | { kind: 'best' } // better than every other player
  | { kind: 'top'; rank: number } // among the top few, but not the best
  | { kind: 'percent'; percent: number } // share of other players beaten

export function isCelebrated(standing: Standing | null): standing is Standing {
  return standing !== null && standing.kind !== 'percent'
}

// The leaderboard holds each player's best score, so the current player is
// left out and the round's score is compared against everyone else.
export function computeStanding(
  entries: LeaderboardEntry[],
  playerId: string,
  score: number,
  sortOrder: SortOrder,
): Standing {
  const me = playerId.toLowerCase()
  const others = entries.filter((entry) => entry.playerId.toLowerCase() !== me)
  if (others.length === 0) return { kind: 'first' }

  const isBetter = (a: number, b: number) => (sortOrder === 'asc' ? a < b : a > b)
  const ahead = others.filter((entry) => isBetter(entry.score, score)).length
  const behind = others.filter((entry) => isBetter(score, entry.score)).length

  const rank = ahead + 1
  if (rank === 1) return { kind: 'best' }
  if (rank <= TOP_RANK_LIMIT) return { kind: 'top', rank }
  return { kind: 'percent', percent: Math.round((behind / others.length) * 100) }
}
