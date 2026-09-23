import { Router } from 'express'
import { getGameConfig } from '../games.js'
import { broadcast } from '../realtime/sse.js'
import { insertGameResult } from '../repositories/resultsRepository.js'
import { findUserByUsername } from '../repositories/usersRepository.js'

export const resultsRouter = Router()

resultsRouter.post('/', (req, res) => {
  const { gameId, playerId, score } = req.body ?? {}

  if (typeof gameId !== 'string' || !getGameConfig(gameId)) {
    res.status(400).json({ error: 'invalid_game_id' })
    return
  }
  if (typeof playerId !== 'string' || playerId.trim().length === 0) {
    res.status(400).json({ error: 'invalid_player_id' })
    return
  }
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    res.status(400).json({ error: 'invalid_score' })
    return
  }

  const user = findUserByUsername(playerId)
  if (!user) {
    res.status(404).json({ error: 'unknown_player' })
    return
  }

  insertGameResult(gameId, user.id, score)
  broadcast('result:new', { gameId, playerId: user.username, score, timestamp: Date.now() })

  res.status(201).json({ ok: true })
})
