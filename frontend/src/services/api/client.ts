import { API_BASE_URL } from '../../config'

export class ApiError extends Error {
  code: string
  status: number

  constructor(code: string, status: number) {
    super(code)
    this.code = code
    this.status = status
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch {
    throw new ApiError('network_error', 0)
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const code =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : 'unknown_error'
    throw new ApiError(code, response.status)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
