import { Router } from 'express'
import { createUser } from '../repositories/usersRepository.js'

export const usersRouter = Router()

const MAX_USERNAME_LENGTH = 24

usersRouter.post('/', (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : ''

  if (username.length === 0 || username.length > MAX_USERNAME_LENGTH) {
    res.status(400).json({ error: 'invalid_username' })
    return
  }

  const result = createUser(username)
  if (!result.ok) {
    res.status(409).json({ error: result.reason })
    return
  }

  res.status(201).json({ username: result.user.username })
})
