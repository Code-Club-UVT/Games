import { db } from '../db.js'

export interface User {
  id: number
  username: string
}

const insertUser = db.prepare('INSERT INTO users (username, created_at) VALUES (?, ?)')
const selectUserByUsername = db.prepare(
  'SELECT id, username FROM users WHERE username = ? COLLATE NOCASE',
)

export function findUserByUsername(username: string): User | undefined {
  return selectUserByUsername.get(username) as User | undefined
}

export type CreateUserResult =
  | { ok: true; user: User }
  | { ok: false; reason: 'username_taken' }

export function createUser(username: string): CreateUserResult {
  try {
    const { lastInsertRowid } = insertUser.run(username, Date.now())
    return { ok: true, user: { id: Number(lastInsertRowid), username } }
  } catch (err) {
    // Rely on the UNIQUE constraint itself (rather than a check-then-insert)
    // so two simultaneous requests for the same name can't both succeed.
    if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
      return { ok: false, reason: 'username_taken' }
    }
    throw err
  }
}
