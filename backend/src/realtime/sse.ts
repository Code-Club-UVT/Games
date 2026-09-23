import type { Request, Response } from 'express'

const clients = new Set<Response>()

// A comment line every so often keeps idle connections from being dropped by
// proxies and load balancers.
const HEARTBEAT_MS = 25_000
setInterval(() => {
  for (const client of clients) client.write(': keep-alive\n\n')
}, HEARTBEAT_MS).unref()

export function handleSseConnection(req: Request, res: Response): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    // Stops nginx-style reverse proxies from buffering the stream.
    'X-Accel-Buffering': 'no',
  })
  res.write('\n')

  clients.add(res)
  req.on('close', () => {
    clients.delete(res)
  })
}

export function broadcast(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const client of clients) {
    client.write(payload)
  }
}
