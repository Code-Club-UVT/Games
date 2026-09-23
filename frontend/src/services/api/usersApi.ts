import { apiFetch } from './client'

export function createUser(username: string): Promise<{ username: string }> {
  return apiFetch('/users', { method: 'POST', body: JSON.stringify({ username }) })
}
