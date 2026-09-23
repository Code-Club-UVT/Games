import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import cors from 'cors'
import express from 'express'
import { config } from './config.js'
import { db } from './db.js'
import { handleSseConnection } from './realtime/sse.js'
import { authRouter } from './routes/auth.js'
import { leaderboardRouter } from './routes/leaderboard.js'
import { resultsRouter } from './routes/results.js'
import { usersRouter } from './routes/users.js'

const app = express()

if (config.corsOrigin) {
  app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',') }))
} else if (!config.isProduction) {
  app.use(cors())
}
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.get('/api/events', handleSseConnection)
app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/results', resultsRouter)
app.use('/api/leaderboard', leaderboardRouter)
app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }))

// Serve the built frontend, falling back to index.html for client-side routes.
const staticDir = resolve(config.staticDir)
if (existsSync(staticDir)) {
  app.use(
    express.static(staticDir, {
      setHeaders(res, filePath) {
        // Built assets have hashed names, so they can be cached for good;
        // index.html must always be re-fetched to pick up new releases.
        res.setHeader(
          'Cache-Control',
          filePath.endsWith('.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
        )
      },
    }),
  )
  app.get('/{*splat}', (_req, res) => res.sendFile(resolve(staticDir, 'index.html')))
  console.log(`Serving the frontend from ${staticDir}`)
}

const server = app.listen(config.port, () => {
  console.log(`Backend listening on port ${config.port}`)
})

// `docker stop` sends SIGTERM: stop accepting requests, close the open
// live-update streams, and close the database cleanly.
function shutdown() {
  server.close(() => {
    db.close()
    process.exit(0)
  })
  server.closeAllConnections()
  setTimeout(() => process.exit(1), 5000).unref()
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
