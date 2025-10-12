# ---------- base deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --omit=dev

# ---------- runner ----------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache curl

# Copy deps and source
COPY --from=deps /app/node_modules /app/node_modules
COPY backend/ .

# Non-root user
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE $PORT
ENV PORT=8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:$PORT/health || exit 1

CMD ["npm", "start"]