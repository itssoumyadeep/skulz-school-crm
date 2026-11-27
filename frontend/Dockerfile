FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_API_BASE
ARG NEXT_PUBLIC_TENANT_BASE_DOMAIN
ARG NEXT_PUBLIC_TELEMETRY_ENABLED=true

ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE \
    NEXT_PUBLIC_TENANT_BASE_DOMAIN=$NEXT_PUBLIC_TENANT_BASE_DOMAIN \
    NEXT_PUBLIC_TELEMETRY_ENABLED=$NEXT_PUBLIC_TELEMETRY_ENABLED \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=8080 \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]
