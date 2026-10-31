FROM node:20-alpine AS base

# ============================================================
# DataSphere - Dockerfile production (Render)
# - PostgreSQL
# - prisma migrate deploy au démarrage (via binaire direct)
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

# ============================================================
# Runner stage : production runtime
# ============================================================
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=10000
ENV HOSTNAME="0.0.0.0"

RUN apk add --no-cache openssl
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copier le code de production Next.js standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copier le schema + migrations Prisma
COPY --from=builder /app/prisma ./prisma

# ✅ Copier Prisma CLI complet (pour migrate deploy au runtime)
# Le binaire est à node_modules/prisma/build/index.js
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# ✅ Copier @prisma/client + engines (.prisma contient les query engines binaires)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copier les autres deps runtime nécessaires
COPY --from=builder /app/node_modules/stripe ./node_modules/stripe
COPY --from=builder /app/node_modules/z-ai-web-dev-sdk ./node_modules/z-ai-web-dev-sdk
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/node_modules/otplib ./node_modules/otplib
COPY --from=builder /app/node_modules/qrcode ./node_modules/qrcode
COPY --from=builder /app/node_modules/pino ./node_modules/pino
COPY --from=builder /app/node_modules/@sentry ./node_modules/@sentry

# Copier package.json (requis pour prisma)
COPY --from=builder /app/package.json ./package.json

# Copier le script de démarrage (depuis le builder stage)
COPY --from=builder --chown=nextjs:nodejs /app/scripts/start.sh ./start.sh
RUN chmod +x ./start.sh

# Créer le dossier data avec bonnes permissions
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs
EXPOSE 10000

# ✅ Utiliser le script de démarrage (gère migrations + server)
CMD ["./start.sh"]
