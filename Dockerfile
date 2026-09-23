# One image runs the whole app: the Node backend serves the API, the live
# updates, and the built frontend. Build from the repository root:
#   docker build -t <dockerhub-user>/games .

# ---- Frontend: compile the React app to static files ----
FROM node:24-alpine AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Backend: compile the TypeScript, keep only production dependencies ----
FROM node:24-alpine AS backend-build
WORKDIR /build/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build && npm prune --omit=dev

# ---- Runtime image ----
FROM node:24-alpine
ENV NODE_ENV=production \
    PORT=4000 \
    DB_PATH=/app/data/games.db \
    STATIC_DIR=/app/public
WORKDIR /app

COPY --from=backend-build /build/backend/node_modules ./node_modules
COPY --from=backend-build /build/backend/dist ./dist
COPY backend/package.json ./
COPY --from=frontend-build /build/frontend/dist ./public

# The SQLite database lives here; mount a volume so scores survive new images.
RUN mkdir -p /app/data && chown -R node:node /app/data
VOLUME /app/data

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

# LOGOUT_PASSWORD is required (the server refuses to start without it): pass it
# with `-e LOGOUT_PASSWORD=...` when starting the container.
CMD ["node", "dist/index.js"]
