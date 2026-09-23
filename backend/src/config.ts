// Every runtime setting the backend reads from the environment, in one place.
// In the Docker image these are set on the container (see the README).

const isProduction = process.env.NODE_ENV === 'production'

function readLogoutPassword(): string {
  const password = process.env.LOGOUT_PASSWORD
  if (password) return password
  if (isProduction) {
    console.error('LOGOUT_PASSWORD is not set. Set it on the container, e.g. -e LOGOUT_PASSWORD=...')
    process.exit(1)
  }
  console.warn('LOGOUT_PASSWORD is not set; using the development default "1234".')
  return '1234'
}

export const config = {
  isProduction,
  port: Number(process.env.PORT ?? 4000),
  // The password staff type to let someone else sign in. Checked here, on the
  // server, so it is never sent to the browser.
  logoutPassword: readLogoutPassword(),
  // Folder holding the built frontend. When it exists the backend serves it,
  // so one container runs the whole app.
  staticDir: process.env.STATIC_DIR ?? './public',
  // Only needed when the frontend is served from a different origin than the
  // API (e.g. the Vite dev server). Comma-separated list, or * for any.
  corsOrigin: process.env.CORS_ORIGIN,
}
