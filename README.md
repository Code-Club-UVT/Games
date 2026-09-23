# Games

A collection of touch games with live leaderboards. The frontend (React + Vite) and the backend (Node + SQLite) ship together in one Docker image: the backend serves the API, the live score updates, and the built frontend.

## Run with Docker

```sh
docker build -t <dockerhub-user>/games .
docker run -d --name games \
  -p 80:4000 \
  -e LOGOUT_PASSWORD=choose-a-password \
  -v games-data:/app/data \
  <dockerhub-user>/games
```

The app is then at `http://<host>/`. To change a setting, stop the container, start it again with the new `-e` value, and the change takes effect (the volume keeps the scores).

### Settings (environment variables)

| Variable | Required | Default | What it does |
| --- | --- | --- | --- |
| `LOGOUT_PASSWORD` | yes | none (the container refuses to start without it) | The staff password asked for on Log Out. Checked by the server, never sent to the browser. |
| `PORT` | no | `4000` | Port the server listens on inside the container. |
| `DB_PATH` | no | `/app/data/games.db` | Where the SQLite database file is stored. |
| `STATIC_DIR` | no | `/app/public` | Folder with the built frontend. |
| `CORS_ORIGIN` | no | unset (same origin only) | Only needed if the frontend is hosted on a different origin than the API. Comma-separated origins, or `*`. |

### Data

Scores and usernames live in a SQLite file in `/app/data`. Mount a volume there (as above) or they are lost when the container is replaced. With a bind mount instead of a named volume, the folder must be writable by the container's `node` user (uid 1000).

### Notes

- More than 10 wrong logout passwords from one address within a minute are blocked for the rest of that minute, so the password cannot be brute-forced. Behind a reverse proxy every visitor shares the proxy's address, so run the proxy with the client address forwarded, or expect the lock-out to apply to everyone.
- The container has a health check on `/api/health`.
- The live score updates use Server-Sent Events. If you put a reverse proxy in front, keep response buffering off for `/api/events` (the server already sends `X-Accel-Buffering: no` for nginx).

## Development

```sh
# backend (port 4000; LOGOUT_PASSWORD defaults to 1234 outside production)
cd backend && npm install && npm run dev

# frontend (Vite dev server, talks to the backend on port 4000)
cd frontend && npm install && npm run dev
```

## Deployment

`.github/workflows/deploy.yml` builds the image on every push to `main`, pushes it to Docker Hub as `<user>/games:latest` and `<user>/games:<commit sha>`, then runs `start-container.sh` on the server over SSH. Your `start-container.sh` must pass `LOGOUT_PASSWORD` to the container (for example `-e LOGOUT_PASSWORD="$LOGOUT_PASSWORD"` read from a file or the server's environment) and mount the data volume.
