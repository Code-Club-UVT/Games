import { timingSafeEqual } from 'node:crypto'
import { Router } from 'express'
import { config } from '../config.js'

export const authRouter = Router()

// Wrong guesses are limited per client address, so the password can't be
// brute-forced by tapping away at the dialog.
const MAX_FAILURES = 10
const WINDOW_MS = 60_000
const failures = new Map<string, { count: number; resetAt: number }>()

function matchesPassword(candidate: string): boolean {
  const expected = Buffer.from(config.logoutPassword)
  const given = Buffer.from(candidate)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

authRouter.post('/verify-logout', (req, res) => {
  const key = req.ip ?? 'unknown'
  const now = Date.now()
  const record = failures.get(key)
  if (record && record.resetAt <= now) failures.delete(key)

  const current = failures.get(key)
  if (current && current.count >= MAX_FAILURES) {
    res.status(429).json({ error: 'too_many_attempts' })
    return
  }

  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (matchesPassword(password)) {
    failures.delete(key)
    res.json({ ok: true })
    return
  }

  failures.set(key, { count: (current?.count ?? 0) + 1, resetAt: current?.resetAt ?? now + WINDOW_MS })
  res.status(401).json({ error: 'incorrect_password' })
})
