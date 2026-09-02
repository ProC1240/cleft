FROM node:22-bullseye-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-bullseye-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN mkdir -p ./uploads
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
