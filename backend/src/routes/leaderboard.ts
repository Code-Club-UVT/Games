import { Router } from 'express'
import { getGameConfig } from '../games.js'
import { getCombinedLeaderboard, getLeaderboard } from '../repositories/resultsRepository.js'

export const leaderboardRouter = Router()

leaderboardRouter.get('/', (_req, res) => {
  res.json(getCombinedLeaderboard())
})

leaderboardRouter.get('/:gameId', (req, res) => {
  const game = getGameConfig(req.params.gameId)
  if (!game) {
    res.status(404).json({ error: 'unknown_game' })
    return
  }

  res.json(getLeaderboard(game.id, game.sortOrder))
})
