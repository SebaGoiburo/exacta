# Exacta web: Next.js (standalone) + Payload CMS.
# Built in GitHub Actions so the VPS only pulls and runs the image.

FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# The build never touches the database (pages render on demand); these only satisfy config loading.
ENV DATABASE_URL=postgres://build:build@127.0.0.1:1/build \
    PAYLOAD_SECRET=build-only-secret
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Uploads live on a mounted volume, not in the image.
RUN rm -rf ./media && mkdir -p ./media && chown nextjs:nodejs ./media
USER nextjs
EXPOSE 3000
# Database migrations run automatically when Payload starts (prodMigrations).
CMD ["node", "server.js"]
