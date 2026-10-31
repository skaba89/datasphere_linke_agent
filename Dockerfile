FROM node:20-alpine AS base

# ============================================================
# DataSphere - Dockerfile production (Render)
# - PostgreSQL
# - prisma migrate deploy au démarrage
# - Port 10000
# - Toutes les deps runtime copiées (pas de sélectif)
# ============================================================

# ─── Stage 1: deps ───
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm install

# ─── Stage 2: builder ───
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npx next build --webpack
RUN cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/

# ✅ Prune : retire les devDeps pour garder un node_modules de production propre
RUN npm prune --production

# ─── Stage 3: runner (production runtime) ───
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=10000
ENV HOSTNAME="0.0.0.0"

RUN apk add --no-cache openssl curl
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Code de production Next.js standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Schema + migrations Prisma (requis pour migrate deploy)
COPY --from=builder /app/prisma ./prisma

# ✅ Copier TOUT le node_modules de production (toutes les sous-déps incluses)
# C'est plus lourd mais garanti : aucune dep transitive manquante
COPY --from=builder /app/node_modules ./node_modules

# package.json (requis par prisma)
COPY --from=builder /app/package.json ./package.json

# Script de démarrage
COPY --from=builder --chown=nextjs:nodejs /app/scripts/start.sh ./start.sh
RUN chmod +x ./start.sh

# Dossier data writable
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs
EXPOSE 10000

CMD ["./start.sh"]
