# KnackCook (affiliate-kk) — multi-stage build for Next.js 16 (standalone output)

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# ---- deps ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# ---- builder ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm build

# ---- runner ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

RUN npm install -g prisma@6.16.0 --no-audit --no-fund

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Next.js standalone output does NOT bundle /public — copy it explicitly so
# static assets (logo, article images, favicon, OG images) are served.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

RUN cd /tmp \
  && npm pack bcryptjs@3.0.3 --silent \
  && mkdir -p /app/node_modules/bcryptjs \
  && tar -xzf bcryptjs-*.tgz -C /app/node_modules/bcryptjs --strip-components=1 \
  && rm -rf /tmp/bcryptjs* \
  && chown -R nextjs:nodejs /app/node_modules/bcryptjs

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
