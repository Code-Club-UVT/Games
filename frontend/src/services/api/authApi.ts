import { apiFetch } from './client'

// The password lives on the server (LOGOUT_PASSWORD), never in the browser.
export function verifyLogoutPassword(password: string): Promise<{ ok: true }> {
  return apiFetch('/auth/verify-logout', { method: 'POST', body: JSON.stringify({ password }) })
}
