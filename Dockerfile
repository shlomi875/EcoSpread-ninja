# ── Stage 1: Build Frontend + Server ──────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Build Vite frontend
RUN npm run build

# Bundle Express server with esbuild
RUN npx esbuild server.ts \
    --bundle \
    --platform=node \
    --target=node20 \
    --outfile=dist-server/server.cjs \
    --external:pg-native \
    --external:vite \
    --external:@vitejs/plugin-react \
    --external:@tailwindcss/vite

# ── Stage 2: Production Runner ─────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat wget
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 ecospread

# Copy production node_modules (only prod deps)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built files
COPY --from=builder --chown=ecospread:nodejs /app/dist ./dist
COPY --from=builder --chown=ecospread:nodejs /app/dist-server ./dist-server
COPY --from=builder --chown=ecospread:nodejs /app/migrations ./migrations
COPY --from=builder --chown=ecospread:nodejs /app/src/db ./src/db

# Uploads volume mount point
RUN mkdir -p /app/uploads && chown ecospread:nodejs /app/uploads

USER ecospread
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "dist-server/server.cjs"]
