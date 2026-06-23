FROM node:20-alpine AS base

# ============================================================
# DataSphere - Dockerfile optimisé pour Render
# - Port 10000
# - Build: npx next build --webpack
# - Prisma generate + db push automatique au démarrage
# - PM2 optionnel (via ecosystem.config.cjs) mais inutile sur Render
#   (Render gère lui-même le process - pas besoin de PM2)
# ============================================================

FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json ./
COPY prisma ./prisma/
RUN npm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
# Build avec --webpack comme demandé par le projet
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

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/package.json ./package.json

USER nextjs
EXPOSE 10000

# Render lance directement `node server.js` (pas besoin de PM2)
CMD ["node", "server.js"]
