# Backend image — repo root Dockerfile for hosts (e.g. Render "Docker" preset)
# that expect ./Dockerfile here. Docker build context MUST be repo root (.).
#
# Docker Compose continues to use backend/Dockerfile with context backend/.
# Keep these two files logically in sync.

FROM node:20-bullseye-slim AS deps
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci

FROM node:20-bullseye-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY backend/ .
RUN npx prisma generate && npm run build

FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN mkdir -p ./uploads
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY backend/package*.json ./
EXPOSE 4000
# Push schema on boot (Render Free has no Shell); then start API
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main.js"]
