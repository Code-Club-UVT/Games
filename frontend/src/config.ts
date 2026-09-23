// In the Docker image the backend serves the frontend, so the API is on the same
// origin. During `npm run dev` it is a separate server on port 4000.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:4000/api' : '/api')
