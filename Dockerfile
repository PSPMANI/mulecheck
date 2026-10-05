# MuleCheck production image. Persist /app/data (SQLite db + uploads) with a volume.
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts && npx prisma generate

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS run
ENV NODE_ENV=production
ENV PORT=3018
COPY --from=build /app ./
VOLUME ["/app/data"]
EXPOSE 3018
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm run start"]
