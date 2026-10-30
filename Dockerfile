FROM node:20-alpine AS base

# ============================================================
# DataSphere - Dockerfile optimisé pour Render
# - Port 10000
# - Build: npx next build --webpack
# - prisma migrate deploy au démarrage (create tables auto)
# - PM2 optionnel (via ecosystem.config.cjs) mais inutile sur Render
# ============================================================

FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
# Build avec --webpack
RUN npx next build --webpack
# Copier les assets statiques et public dans standalone
RUN cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=10000
ENV HOSTNAME="0.0.0.0"

RUN apk add --no-cache openssl
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copier le code de production
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/package.json ./package.json

# Créer le dossier data avec bonnes permissions (pour SQLite persistent)
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs
EXPOSE 10000

# ✅ Au démarrage : migrate deploy + start server
# - migrate deploy applique les migrations en attente (idempotent)
# - si DATABASE_URL pointe vers /app/data/dev.sqlite, le disque Render persiste
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
