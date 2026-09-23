import type { GameResult } from '../../types/game'
import { apiFetch } from './client'

export function submitResult(result: Omit<GameResult, 'timestamp'>): Promise<void> {
  return apiFetch('/results', { method: 'POST', body: JSON.stringify(result) })
}
