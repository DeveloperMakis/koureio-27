# ΤΟ ΚΟΥΡΕΙΟΝ 27 — Production image (Next.js standalone + Prisma + SQLite σε volume)
# Για Coolify/Docker. Η βάση (SQLite) ζει στο volume /data.

FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --legacy-peer-deps

FROM node:20-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Next standalone server + static + public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Prisma: schema, generated client/engines, CLI (για db push στο boot), prod seed
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
# Deps που χρειάζεται ΜΟΝΟ το prod-setup script (το Next τα κάνει bundle, δεν μένουν
# στο standalone node_modules). Χωρίς αυτά το prod-setup κρασάρει στο import.
COPY --from=build /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=build /app/scripts/prod-setup.mjs ./scripts/prod-setup.mjs
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

# Η SQLite βάση ζει εδώ (persistent volume στο Coolify).
VOLUME ["/data"]
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
