import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { username } = useAuth()
  if (!username) return <Navigate to="/" replace />
  return children
}
