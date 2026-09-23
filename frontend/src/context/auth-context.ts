import { createContext } from 'react'

export type LoginResult = { ok: true } | { ok: false; reason: 'invalid' | 'taken' | 'network' }

export interface AuthContextValue {
  username: string | null
  login: (username: string) => Promise<LoginResult>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
