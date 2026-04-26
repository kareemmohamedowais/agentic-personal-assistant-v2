# ──────────────────────────────────────────────────────────────
# Stage 1: Build React client
# ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --legacy-peer-deps
COPY client/ ./
RUN npm run build

# ──────────────────────────────────────────────────────────────
# Stage 2: Production server
# ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS production
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps
COPY server/ ./
COPY --from=client-build /app/client/dist ./public
RUN mkdir -p uploads/media uploads/docs
EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "index.js"]
