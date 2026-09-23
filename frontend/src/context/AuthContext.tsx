import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { isValidUsername } from '../services/authService'
import { ApiError } from '../services/api/client'
import { createUser } from '../services/api/usersApi'
import { AuthContext, type AuthContextValue, type LoginResult } from './auth-context'

const STORAGE_KEY = 'touch-games:username'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(() =>
    sessionStorage.getItem(STORAGE_KEY),
  )

  const login = useCallback(async (nextUsername: string): Promise<LoginResult> => {
    const trimmed = nextUsername.trim()
    if (!isValidUsername(trimmed)) return { ok: false, reason: 'invalid' }

    try {
      const created = await createUser(trimmed)
      sessionStorage.setItem(STORAGE_KEY, created.username)
      setUsername(created.username)
      return { ok: true }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'username_taken') {
        return { ok: false, reason: 'taken' }
      }
      return { ok: false, reason: 'network' }
    }
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setUsername(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ username, login, logout }),
    [username, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
