FROM node:20-alpine AS base

# ============================================================
# DataSphere - Dockerfile production (Render)
# - PostgreSQL
# - prisma migrate deploy au démarrage
# - Port 10000
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
RUN npx next build --webpack
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
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/stripe ./node_modules/stripe
COPY --from=builder /app/node_modules/z-ai-web-dev-sdk ./node_modules/z-ai-web-dev-sdk
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/package.json ./package.json

USER nextjs
EXPOSE 10000

# ✅ Au démarrage : migrate deploy + start server
# PostgreSQL : prisma migrate deploy applique les migrations en attente
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
