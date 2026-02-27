# ── Stage 1: install dependencies ────────────────────────────────
FROM node:22-bookworm-slim AS deps

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: build the Next.js app ──────────────────────────────
FROM node:22-bookworm-slim AS builder

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npx next build

# ── Stage 3: production image ───────────────────────────────────
FROM node:22-bookworm-slim AS runner

RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# Extra node_modules not bundled by standalone (prisma CLI, node-pty, tsx, etc.)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Next.js standalone server (overlays its own node_modules on top)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Generated Prisma client (must come AFTER standalone copy to ensure it's the generated version)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Prisma schema + migrations (for migrate deploy at startup)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

# Runner daemon + scheduler
COPY --from=builder --chown=nextjs:nodejs /app/runner ./runner

# Scripts (for generate-scheduler-token)
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Source files needed by scripts at runtime
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/session-codec.ts ./src/lib/session-codec.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/crypto-secrets.ts ./src/lib/crypto-secrets.ts

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
