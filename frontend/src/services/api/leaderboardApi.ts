import { API_BASE_URL } from '../../config'
import type { LeaderboardEntry, ResultEvent } from '../../types/game'
import { apiFetch } from './client'

export function getGameLeaderboard(gameId: string): Promise<LeaderboardEntry[]> {
  return apiFetch(`/leaderboard/${gameId}`)
}

// Subscribes to the backend's live result feed (Server-Sent Events) so every
// connected display picks up new scores without polling or a manual reload.
export function subscribeToResults(onResult: (event: ResultEvent) => void): () => void {
  const source = new EventSource(`${API_BASE_URL}/events`)

  source.addEventListener('result:new', (event) => {
    onResult(JSON.parse((event as MessageEvent).data) as ResultEvent)
  })

  return () => source.close()
}
